---
td-board: openspec-branching-prerequisite-changes
td-issue: td-06ad10
status: "proposed"
date: 2026-02-25
decision-makers: [platform-architect]
---

# Design: Branching Prerequisite Changes

## Context and problem statement

When an architect works through the design of a larger deliverable they often make choices — selecting a third-party SDK, adopting a new infrastructure tool, committing to a specific protocol — that each merit their own OpenSpec change with full artifact lineage (proposal → specs → design → implementation → archive). Today there is no mechanism to declare these emergent prerequisites from within an active change. The relationship exists only in the architect's head, and there is no enforcement that the parent change waits for the prerequisites before archiving. The result is either: (a) the decisions get buried inside the parent change without their own lineage, or (b) the architect manually creates sibling changes and tries to remember the ordering — with no tooling support.

## Decision criteria

This design achieves:

- **Declarative prerequisites** (50%): The architect can declare emergent prerequisite changes in `design.md` as a first-class artifact element, not a post-it note
- **Automatic spawning** (30%): Skills read the declaration and create the prerequisite changes without the architect having to run separate commands
- **Enforced completion ordering** (20%): The parent change's completion gate checks for open prerequisite gate tasks, preventing premature archiving

Explicitly excludes:

- CLI changes to `openspec new change` — no new flags; the relationship is tracked entirely in skills and td
- Automated prerequisite change artifact authoring — spawning creates the directory; the architect still drives the prerequisite change's own workflow
- Transitive prerequisite resolution — only direct (one-level) prerequisites are tracked; deep chains are out of scope

## Considered options

### Option A: CLI flag `--prereq-of <parent>`

Add a `--prereq-of` flag to `openspec new change` to register the parent→child relationship in `.openspec.yaml` metadata and wire td automatically.

**Rejected**: The `openspec` CLI is a third-party tool; we cannot add flags to it. All coordination must live in the skill layer and td.

### Option B: Separate `openspec link` command

Introduce a new `openspec link prereq <parent> <child>` command to wire the relationship after both changes exist.

**Rejected**: Same reason as Option A — requires CLI modification. Also splits the action across two commands and two moments in time, increasing the chance the wiring is forgotten.

### Option C: `## Prerequisite Changes` table in `design.md` + skill-driven spawning (chosen)

Add a standardised table to the `design.md` template. Skills (`openspec-continue-change`, `openspec-ff-change`) read the table after design authoring and: create each prerequisite change via `openspec new change`, create a `Gate:` task on the parent change root, and announce the actions. The `development-orchestration` completion step checks for open `Gate:` tasks before declaring ready-to-archive.

**Chosen**: No CLI changes. Fits naturally into the existing design artifact authoring flow. Uses the same gate-task pattern already established by the quality-tooling audit. Consistent with how `## Catalog Entities` and `## Agent Skills` tables work — the architect declares intent in `design.md`, skills act on it.

## Decision outcome

**Approach**: `## Prerequisite Changes` table in `design.md` + skill-driven spawning + td gate tasks.

The `design.md` template gains a `## Prerequisite Changes` table with columns `Change`, `Rationale`, `Status`. After the catalog entity audit step, `openspec-continue-change` and `openspec-ff-change` read this table and for each non-`n/a` row:

1. Run `openspec new change <prereq-name>` (skip if directory already exists)
2. Create `td create "Gate: <prereq-name> complete" --type task --parent <change-root-id>` with body explaining the block
3. Announce the action in a `Prerequisite changes:` summary block

The `development-orchestration` completion gate (Step 6) is extended to check for open `Gate:` tasks alongside open `Catalog:` tasks. Both must be clear before "Ready to archive" is shown.

For status narration, when a change's `design.md` contains a populated prerequisites table, skills supplement `openspec status` output with a `Prerequisite Changes:` section showing artifact progress for each named prerequisite.

## Gate task vs. td dep wiring

Gate tasks are created as open tasks under the parent change root — **not** wired with `td dep add` on the change root itself. This matches the existing pattern for quality-tooling gate tasks and catalog tasks. The `development-orchestration` completion check scans for `Gate:` prefixed tasks on the board; when the architect archives a prerequisite change they manually close the corresponding gate task. This keeps the model simple and consistent with existing gate patterns.

## Risks / trade-offs

- Risk: Architect forgets to close gate tasks after archiving a prerequisite → Mitigation: The completion check surfaces all open `Gate:` tasks with their prereq names, making the required action explicit
- Risk: Prerequisite change name in the table is mis-spelled or drifts from the actual change name → Mitigation: The spawning step warns when skipping creation (directory already exists) and the status narration warns when a prereq directory is not found — both surface naming errors early
- Trade-off: Gate task closure is manual (architect closes after archiving prereq). An automated hook would require CLI access we don't have. The manual step is one `td handoff + td close` command and is consistent with how quality-tooling gates work today.

## Migration plan

1. Update `design.md` template (in the openspec schema) to add the `## Prerequisite Changes` table
2. Update `openspec-continue-change` SKILL.md to add the prerequisite spawning step after the catalog entity audit
3. Update `openspec-ff-change` SKILL.md with the same step, inline in the fast-forward progress output
4. Update `development-orchestration` SKILL.md Step 6 completion gate to check for open `Gate:` tasks
5. No migration needed for existing changes — the table is optional (`n/a` is valid); existing changes without the table are unaffected

Rollback: remove the `## Prerequisite Changes` section from the template and revert the four skill files. No data migration required — gate tasks in td are inert if the completion check is removed.

## Confirmation

- Verification: Create a test change, declare two prerequisites in `design.md`, run `openspec-continue-change` through design, confirm two changes are created in `openspec/changes/` and two `Gate:` tasks appear on the board
- Acceptance criteria: `development-orchestration` Step 6 does not show "Ready to archive" while any `Gate:` task is open; it shows the gate list with prereq names and instructions to close them after archiving

## Open questions

- None — design is fully determined by the constraints above

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| — | — | n/a — no new technologies adopted | n/a |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Prerequisite change spawning (openspec-continue-change) | platform-architect, worker agents | `.opencode/skills/openspec-continue-change/SKILL.md` | update | Add prerequisite spawning step after catalog entity audit |
| Prerequisite change spawning (openspec-ff-change) | platform-architect, worker agents | `.opencode/skills/openspec-ff-change/SKILL.md` | update | Add prerequisite spawning step inline in fast-forward output |
| Completion gate check (development-orchestration) | platform-architect | `.opencode/skills/development-orchestration/SKILL.md` | update | Extend Step 6 to check for open Gate: tasks alongside Catalog: tasks |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | No new curated entities introduced by this change |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |

## Tech Radar

| Technology | Quadrant | Ring | Action | Rationale | Status |
|------------|----------|------|--------|-----------|--------|
| — | — | — | review-only | Review existing entries for accuracy post-archive | pending |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| n/a | — | — |

