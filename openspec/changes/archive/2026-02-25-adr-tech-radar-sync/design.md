---
td-board: adr-tech-radar-sync
td-issue: td-59c336
status: proposed
date: 2026-02-25
decision-makers: [platform-architect]
consulted: [platform-engineer]
informed: [development-team]
tech-radar:
  # No new runtime technologies adopted — this change modifies workflow skills,
  # a Bash script, and a YAML template. The Bash script is an existing tool
  # already present in dev-portal-manager/scripts/. No new languages or
  # frameworks are introduced.
---

# Design: ADR ↔ Tech Radar Synchronization

## Context and problem statement

`docs/tech-radar.json` is manually maintained. ADRs (`design.md` files) contain a `## Tech Radar` table that declares the same intent, but the two are not mechanically linked — drift accumulates silently. Additionally, when a change identifies a new direct dependency, there is no automated check against the radar; the architect manually decides whether to populate `## Prerequisite Changes`, which is error-prone.

This change makes the ADR frontmatter the single source of truth for all radar entries, introduces a sync script that derives `docs/tech-radar.json` from that frontmatter, and embeds an automated radar prerequisite check into the design-authoring step of all authoring skills.

## Decision criteria

This design achieves:

- **Single source of truth** (40%): ADR frontmatter drives `tech-radar.json`; no manual JSON editing
- **Zero new architecture** (30%): Implemented as a Bash script + skill document updates; no new services, daemons, or build steps beyond what already exists
- **Complete automation of prerequisite detection** (30%): Every direct dependency in `## Technology Adoption & Usage Rules` is checked at design time; missing radar entries spawn changes automatically

Explicitly excludes:

- Automated ring lifecycle progression (deferred to GH issue #1)
- Bidirectional sync (JSON → frontmatter) — frontmatter is always source of truth
- Transitive dependency scanning (only direct dependencies in the Technology Adoption table)
- Blocking on `Trial`/`Assess`/`Hold` ring entries (warning only; ring promotion is human-driven)

## Considered options

### Option 1: frontmatter block replaces `## Tech Radar` table (Selected)

Move all radar declarations into structured YAML frontmatter. The sync script reads frontmatter; no body table exists.

**Why selected**: single location, machine-readable without body parsing, consistent with how `component`, `td-board`, and `td-issue` are already stored. Body tables are for human narrative; radar entries are data.

### Option 2: keep `## Tech Radar` table, parse body markdown

Parse the Markdown table from the body to extract entries.

**Why rejected**: fragile parsing, formatting-sensitive, no schema enforcement. Frontmatter is already the established pattern for structured data in this system.

### Option 3: separate `tech-radar.yaml` sidecar per change

Each change directory gets a `tech-radar.yaml` alongside `design.md`.

**Why rejected**: adds a new file type with no clear home; splits decision context from the ADR; two files to keep in sync per change.

## Decision outcome

**Frontmatter block in `design.md` is the source of truth.** The `## Tech Radar` body table is removed from the template and all existing ADRs. The sync script at `.opencode/skills/dev-portal-manager/scripts/sync-tech-radar.sh` reads all `design.md` frontmatter across `openspec/changes/` (active and archive) and writes `docs/tech-radar.json`.

**Radar prerequisite check runs during design authoring**, immediately after `## Technology Adoption & Usage Rules` is populated. It queries `docs/tech-radar.json` by name (case-insensitive). For absent entries: checks existing changes' `tech-radar` frontmatter; if found, wires gate task; if not found, spawns `adopt-<name>` change and wires gate task.

**Conflict resolution**: when two ADRs declare the same technology with different rings, the more recently dated ADR wins. A warning is emitted.

## Frontmatter Schema

```yaml
tech-radar:
  - name: "chi"                      # required; matches entry name in tech-radar.json
    quadrant: "Frameworks/Libraries"  # required; one of: Infrastructure | Languages | Frameworks/Libraries | Patterns/Processes
    ring: "Adopt"                     # required; one of: Adopt | Trial | Assess | Hold
    description: "Lightweight Go router with clean middleware composition"  # required
    moved: 1                          # optional; 1=moved in, -1=moved out, 0=unchanged (default)
```

When no technologies are adopted, the `tech-radar` key is omitted (or set to `[]`).

## Sync Script Behaviour

Script: `.opencode/skills/dev-portal-manager/scripts/sync-tech-radar.sh`

```
Input:  all openspec/changes/**/design.md (active + archive)
Output: docs/tech-radar.json (existing title/quadrants/rings structure preserved)

Algorithm:
  1. Find all design.md files
  2. For each: extract tech-radar frontmatter block (skip if absent)
  3. Build map: name → {entry, source_file, date}
  4. On name collision: keep entry with latest `date`; emit warning
  5. Write merged entries to docs/tech-radar.json
  6. Print diff summary: N added, M updated, K unchanged
```

Called automatically at archive time (added to `openspec-archive-change/SKILL.md`). Can also be run manually.

## Radar Prerequisite Check Behaviour

Runs after `## Technology Adoption & Usage Rules` is populated in design authoring:

```
For each non-n/a row in Technology Adoption table:
  1. name_lower = lowercase(row.Domain)
  2. in_radar = lookup name_lower in docs/tech-radar.json
  3. if in_radar:
       ring = entry.ring
       if ring == "Adopt": ✓ <name> (Adopt) — no action
       else:               ⚠ <name> (<ring>) — on radar but not Adopt; proceeding
  4. if not in_radar:
       existing = find any design.md whose tech-radar block contains name_lower
       if existing:
         create Gate task → gate task td-xxxxx
         ⚠ <name> not in radar — existing change <change> adopts it; gate task created
       else:
         openspec new change "adopt-<name-kebab>"
         create Gate task → gate task td-yyyyy
         ⚠ <name> not in radar — spawned adopt-<name-kebab>; gate task created
```

Spawned change naming: `adopt-<name>` where `<name>` is the technology name lowercased and kebab-cased (e.g., `chi` → `adopt-chi`, `OTel Go SDK` → `adopt-otel-go-sdk`).

## Risks / trade-offs

- Risk: `yq` may not be available in all agent environments for frontmatter parsing → Mitigation: sync script uses `python3` (available in devbox) for YAML parsing; `yq` used where available as preference
- Risk: case-insensitive name matching may false-positive on similarly named technologies → Mitigation: exact-name matches are preferred; warn on near-matches for human review
- Trade-off: existing ADR migration is a one-time manual task (12 files) → Accepted; scripted migration reduces effort; existing `## Tech Radar` tables are structured enough to automate

## Migration plan

1. Update `openspec/schemas/v1/templates/design.md` — add `tech-radar` frontmatter, remove `## Tech Radar` table
2. Write `.opencode/skills/dev-portal-manager/scripts/sync-tech-radar.sh`
3. Migrate all existing `design.md` ADRs (move table rows to frontmatter)
4. Run sync script to verify `docs/tech-radar.json` is correct post-migration
5. Update `openspec-ff-change/SKILL.md` — add Radar Prerequisite Check step, remove old Tech Radar task from Catalog Entity Audit
6. Update `openspec-continue-change/SKILL.md` — same
7. Update `development-orchestration/SKILL.md` — same
8. Update `dev-portal-manager/SKILL.md` — document new frontmatter-driven workflow
9. Update `openspec-archive-change/SKILL.md` — add sync script call
10. Verify: run `openspec-ff-change` on a test change; confirm radar check fires and spawns correctly

## Confirmation

- Test cases: sync script on all existing ADRs produces `docs/tech-radar.json` equivalent to current file; radar check on a design with a known-absent technology spawns `adopt-<name>` change
- Metrics: `docs/tech-radar.json` diff after migration shows 0 regressions
- Acceptance criteria: new change with a direct dependency absent from radar automatically gets a gate task and prerequisite change without any manual `## Prerequisite Changes` table entry

## Open questions

- None — decisions fully captured above

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| — | — | n/a — no new technologies adopted | n/a |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Tech Radar authoring workflow | platform-architect, all design-authoring agents | `.opencode/skills/dev-portal-manager/SKILL.md` | update | Document frontmatter-driven workflow; remove manual JSON editing guidance |
| Design artifact authoring | all design-authoring agents | `.opencode/skills/openspec-ff-change/SKILL.md` | update | Add Radar Prerequisite Check step; remove old Tech Radar table task |
| Design artifact authoring | all design-authoring agents | `.opencode/skills/openspec-continue-change/SKILL.md` | update | Same as ff-change |
| Orchestrated development | orchestrator agents | `.opencode/skills/development-orchestration/SKILL.md` | update | Same as ff-change |
| Archive workflow | platform-architect | `.opencode/skills/openspec-archive-change/SKILL.md` | update | Add sync script call post-ADR-symlink |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | No new curated catalog entities introduced by this change |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| n/a | — | — |
