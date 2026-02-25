---
td-board: adr-tech-radar-sync-radar-prerequisite-check
td-issue: td-b05b2b
---

# Spec: Radar Prerequisite Check

## ADDED Requirements

### Requirement: Each direct dependency in Technology Adoption table is checked against the Tech Radar

During design authoring, after the `## Technology Adoption & Usage Rules` table is populated, each row that is NOT `n/a` SHALL be checked against `docs/tech-radar.json`.

A "direct dependency" is defined as any technology explicitly listed in the `## Technology Adoption & Usage Rules` table. Transitive dependencies discovered only through package managers are out of scope.

The check SHALL query by `name` (case-insensitive) against the `entries` array in `docs/tech-radar.json`.

#### Scenario: Technology is present in the radar at ring Adopt

- **WHEN** a technology in the `## Technology Adoption & Usage Rules` table is found in `docs/tech-radar.json` with ring `Adopt`
- **THEN** no action is taken
- **AND** the check reports `✓ <name> (Adopt)`

#### Scenario: Technology is present in the radar at ring Trial, Assess, or Hold

- **WHEN** a technology in the `## Technology Adoption & Usage Rules` table is found in `docs/tech-radar.json` with ring `Trial`, `Assess`, or `Hold`
- **THEN** the check reports the current ring with a warning
- **AND** no gate task or prerequisite change is created (ring progression is human-driven; see GH issue #1)
- **AND** the check reports `⚠ <name> (<ring>) — on radar but not Adopt; proceeding`

#### Scenario: Technology is absent from the radar

- **WHEN** a technology in the `## Technology Adoption & Usage Rules` table is NOT found in `docs/tech-radar.json`
- **THEN** the system checks for an existing OpenSpec change that adopts this technology (see next requirement)

### Requirement: Absent technology triggers existing-change lookup before spawning

When a direct dependency is absent from the Tech Radar, the system SHALL check whether an existing OpenSpec change already adopts it before spawning a new one.

The lookup SHALL search `openspec/changes/` (active and `archive/`) for any `design.md` whose `tech-radar` frontmatter block contains an entry with a matching `name` (case-insensitive).

If a matching change is found:
- A gate task SHALL be created on the current change: `Gate: <prereq-change-name> complete`
- The gate task SHALL be linked to `design.md`
- No new change is spawned
- The check reports: `⚠ <name> not in radar — existing change <prereq-change-name> adopts it; gate task created`

If NO matching change is found:
- A new prerequisite change SHALL be spawned (see next requirement)

#### Scenario: Technology absent from radar but an existing change adopts it

- **WHEN** a direct dependency is absent from `docs/tech-radar.json`
- **AND** an existing change's `design.md` has a `tech-radar` entry with a matching name
- **THEN** a gate task `Gate: <prereq-change-name> complete` is created on the current change
- **AND** no new OpenSpec change is created
- **AND** the check reports the gate task ID

#### Scenario: Technology absent from radar with no existing change

- **WHEN** a direct dependency is absent from `docs/tech-radar.json`
- **AND** no existing change's `design.md` declares it in `tech-radar` frontmatter
- **THEN** a new prerequisite change is spawned (per the next requirement)

### Requirement: Absent technology with no existing change spawns a prerequisite change

When a direct dependency is absent from both the Tech Radar and all existing change `tech-radar` frontmatter, the design authoring step SHALL automatically:

1. Derive a change name: `adopt-<technology-kebab-case>` (e.g., `adopt-chi`, `adopt-otel-go-sdk`)
2. Check whether `openspec/changes/adopt-<name>` already exists; if so, skip creation
3. If not, call `openspec new change "adopt-<name>"`
4. Create a gate task on the current change: `Gate: adopt-<name> complete`
5. Link the gate task to `design.md`
6. Report: `⚠ <name> not in radar — spawned openspec/changes/adopt-<name>; gate task <id> created`

The spawned change has its own full artifact lineage (proposal → specs → design) to be completed before the parent change is archived.

#### Scenario: New framework absent from radar spawns prerequisite change

- **WHEN** a `design.md` lists `chi` in `## Technology Adoption & Usage Rules`
- **AND** `chi` is absent from `docs/tech-radar.json`
- **AND** no existing change declares `chi` in its `tech-radar` frontmatter
- **THEN** `openspec new change "adopt-chi"` is called
- **AND** a gate task `Gate: adopt-chi complete` is created on the current change
- **AND** the gate task is linked to `design.md`

#### Scenario: Spawned change already exists (idempotent)

- **WHEN** a direct dependency is absent from the radar
- **AND** `openspec/changes/adopt-<name>` already exists on disk
- **THEN** no new change is created
- **AND** a gate task is still created if one does not already exist for this prerequisite

### Requirement: Radar check is embedded in the design-authoring step of all authoring skills

The radar prerequisite check SHALL run as a named step during design authoring in:
- `openspec-ff-change/SKILL.md`
- `openspec-continue-change/SKILL.md`
- `development-orchestration/SKILL.md`

The step SHALL run immediately after the `## Technology Adoption & Usage Rules` table is populated, before the Catalog Entity Audit.

The step is NOT optional. If `docs/tech-radar.json` does not exist, the step SHALL warn and skip:
> "⚠ Radar prerequisite check skipped: `docs/tech-radar.json` not found."

#### Scenario: Radar check runs during fast-forward artifact creation

- **WHEN** `openspec-ff-change` creates a `design.md` with non-n/a rows in `## Technology Adoption & Usage Rules`
- **THEN** the radar prerequisite check runs automatically after the table is populated
- **AND** the output is shown inline in the fast-forward progress
- **AND** any gate tasks or spawned changes are included in the final summary

#### Scenario: Radar check skipped when tech-radar.json absent

- **WHEN** the radar prerequisite check runs
- **AND** `docs/tech-radar.json` does not exist
- **THEN** the step emits a warning and continues without error
- **AND** no gate tasks or prerequisite changes are created

### Requirement: Radar check output is shown inline in fast-forward progress

The radar prerequisite check SHALL produce inline output in the same format as other design-phase audit steps:

```
Radar prerequisite check:
  ✓ chi (Adopt)
  ⚠ zerolog (Hold) — on radar but not Adopt; proceeding
  ⚠ some-new-lib — not in radar; existing change adopt-some-new-lib found → gate task td-xxxxx
  ⚠ another-lib — not in radar; spawned openspec/changes/adopt-another-lib → gate task td-yyyyy
```

#### Scenario: Radar check with mixed results produces structured output

- **WHEN** the radar check runs on a design with four technologies: one Adopt, one Hold, one with existing change, one new
- **THEN** the output shows one ✓ line, one ⚠ with ring, one ⚠ with existing change gate, one ⚠ with spawned change
- **AND** the final summary includes the count of gate tasks and spawned changes
