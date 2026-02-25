---
td-board: adr-tech-radar-sync-tech-radar-sync
td-issue: td-61ed46
---

# Spec: Tech Radar Sync

## ADDED Requirements

### Requirement: Sync script reads ADR frontmatter and writes tech-radar.json

A sync script SHALL exist at `.opencode/skills/dev-portal-manager/scripts/sync-tech-radar.sh` that:
1. Scans all `design.md` files under `openspec/changes/` (both active and `archive/`)
2. For each file, reads the `tech-radar` frontmatter block (if present)
3. Merges all entries into a unified list, deduplicating by `name`
4. Writes the result to `docs/tech-radar.json`, preserving the existing `title`, `quadrants`, and `rings` structure
5. Reports a diff summary: entries added, entries updated, entries unchanged

The script SHALL be idempotent: running it multiple times produces the same `docs/tech-radar.json`.

When two ADRs declare the same technology name with different ring values, the script SHALL use the entry from the most recently dated ADR (by the `date` frontmatter field) and warn about the conflict.

#### Scenario: Single ADR with tech-radar entries is synced

- **WHEN** the sync script runs and one `design.md` has a `tech-radar` block with two entries
- **THEN** `docs/tech-radar.json` gains those two entries
- **AND** the script reports `2 added, 0 updated, 0 unchanged`

#### Scenario: Re-running sync is idempotent

- **WHEN** the sync script runs twice with no ADR changes between runs
- **THEN** `docs/tech-radar.json` is identical after both runs
- **AND** the second run reports `0 added, 0 updated, N unchanged`

#### Scenario: Two ADRs declare the same technology with different rings

- **WHEN** two `design.md` files both declare a `tech-radar` entry for the same technology name
- **AND** they assign different rings
- **THEN** the entry from the ADR with the more recent `date` frontmatter value is used
- **AND** the script emits a warning naming both files and their ring values

#### Scenario: ADR with no tech-radar block is skipped

- **WHEN** a `design.md` exists with no `tech-radar` frontmatter key
- **THEN** the script skips that file without error
- **AND** `docs/tech-radar.json` is unaffected by that file

### Requirement: Sync script is called at archive time

The archive workflow (`.opencode/skills/openspec-archive-change/SKILL.md`) SHALL call the sync script as a step after symlinking ADRs and before committing.

If the sync script produces changes to `docs/tech-radar.json`, those changes SHALL be included in the archive commit.

#### Scenario: Archiving a change with tech-radar frontmatter entries

- **WHEN** a change is archived and its `design.md` contains a `tech-radar` block
- **THEN** the sync script runs
- **AND** `docs/tech-radar.json` is updated with the new entries
- **AND** the updated file is included in the archive commit

#### Scenario: Archiving a change with no tech-radar entries

- **WHEN** a change is archived and its `design.md` has no `tech-radar` block
- **THEN** the sync script still runs (idempotent)
- **AND** `docs/tech-radar.json` is unchanged
- **AND** no extra diff appears in the archive commit

### Requirement: dev-portal-manager skill documents the sync workflow

The `dev-portal-manager` skill SHALL be updated to:
- Document the `tech-radar` frontmatter block as the source of truth
- Describe how to run the sync script manually (`bash .opencode/skills/dev-portal-manager/scripts/sync-tech-radar.sh`)
- Remove guidance about manually editing `docs/tech-radar.json`
- Reference the archive-time automatic sync

#### Scenario: Agent consults dev-portal-manager to update the Tech Radar

- **WHEN** an agent loads `dev-portal-manager` and needs to add a Tech Radar entry
- **THEN** the skill instructs the agent to add the entry to the `tech-radar` frontmatter block in `design.md`
- **AND** instructs the agent to run the sync script to propagate the change
- **AND** does NOT instruct the agent to directly edit `docs/tech-radar.json`
