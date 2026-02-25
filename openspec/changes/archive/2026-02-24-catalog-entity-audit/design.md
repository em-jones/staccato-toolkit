---
td-board: catalog-entity-audit
td-issue: td-d799f8
status: "proposed"
date: 2026-02-24
decision-makers: [openspec agent]
---

# Design: Catalog Entity Audit in OpenSpec Workflow

## Context and problem statement

The `## Catalog Entities` section in `design.md` has no enforcement mechanism. During the `initialize-dagger-devops` change, a new Go module (`src/ops/platform/`), two new devbox packages (`dagger`, `go`), and a new CI pipeline were introduced — yet the table was marked `n/a` and accepted without challenge. The `dev-portal-manager` skill exists and specifies exactly how to create catalog entities and ADRs, but nothing in the design or execution workflow directs agents to use it. Additionally, the design template comment points agents to a non-existent `manage-software-catalog` skill.

## Decision criteria

This design achieves:

- **Enforcement without friction** [50%]: The audit runs automatically as part of existing workflow steps — no new commands or user prompts required
- **Accurate detection** [30%]: The audit correctly identifies false `n/a` declarations via lightweight heuristics (new `src/` dirs, new `devbox.json` packages, new workflow files), without producing false positives for genuinely entity-free changes
- **Minimal diff** [20%]: Changes are additive text insertions into existing skill files — no restructuring, no new commands

Explicitly excludes:

- Blocking implementation on open catalog tasks (catalog tasks are surfaced but do not block code work — they are peers, not gates)
- Automated entity file creation (the audit creates td *tasks* that direct an agent to create entities, not the entities themselves)
- Retroactively enforcing the audit on archived changes

## Decisions

### Where the catalog entity audit section lives in each skill

The audit is a new named section added after `## Skill Audit` in `openspec-continue-change` and `openspec-ff-change`. It follows the same pattern as the skill audit: named section, process steps, output format, guardrail. This keeps all three design-phase audits (rule-coverage, skill, catalog) together and symmetric.

In `openspec-execute` and `development-orchestration`, the check is a single guard in the completion step — not a new section — because those skills operate at implementation time, not design time.

### False n/a detection: heuristics over parsing

Rather than parsing `design.md` for component descriptions or diffing file trees, the audit uses four cheap heuristics read directly from `design.md` and the specs:

1. **New `src/` subdirectory mentioned** → potentially a Component or Resource
2. **New `devbox.json` packages** → each new package potentially a Resource (derivation script can generate these)
3. **New `.github/workflows/` file** → potentially a Resource or Component entity for the pipeline
4. **New `.opencode/skills/` file** → documentation task, not entity task (skills don't need catalog entries)

These heuristics are drawn from the `dev-portal-manager` skill's "When to use" section and the entity kind definitions. The heuristic fires only if the change description or design mentions these patterns — it does not scan the filesystem at audit time.

### Catalog tasks are not blockers

Catalog tasks created by the audit are tasks under the change root, visible on the board. They are not wired as `td dep add` blockers against implementation tasks. The rationale: catalog entity creation and ADR symlinking can happen in parallel with or after implementation — they don't gate code correctness. Surfacing them is the goal; blocking is not.

### Design template fix: single-line comment replacement

The `openspec/schemas/v1/templates/design.md` Catalog Entities comment currently reads:
> `Populated during design phase using the manage-software-catalog skill.`

This is replaced with:
> `Populated during design phase using the dev-portal-manager skill.`

This is the minimal fix — one line, no structural change to the template.

## Risks / trade-offs

- Risk: Heuristics produce false positives for changes that mention `src/` without actually creating new components → Mitigation: The audit creates a *review* task ("Catalog: review entity coverage for X"), not a prescriptive create task, so the implementer can close it with a decision note if `n/a` is correct after review
- Trade-off: Adding another audit step slightly lengthens the design-phase output — kept minimal by following the existing skill/rule audit output pattern exactly
- Risk: The four heuristics miss some entity-worthy changes (e.g., a new database) → Mitigation: accepted; the audit is a prompt, not a guarantee. The `dev-portal-manager` skill remains available for any change

## Migration plan

1. Insert `## Catalog Entity Audit` section into `openspec-continue-change/SKILL.md` after `## Skill Audit`
2. Insert `## Catalog Entity Audit` section into `openspec-ff-change/SKILL.md` after `## Skill Audit`, with inline fast-forward output format update
3. Add catalog task check to completion step in `openspec-execute/SKILL.md`
4. Add catalog task check to Step 6 in `development-orchestration/SKILL.md`
5. Fix `openspec/schemas/v1/templates/design.md` comment
6. Apply the audit retroactively to `initialize-dagger-devops`: produce the missing catalog entities, ADR symlink, and Tech Radar entry

No rollback needed — all changes are additive text insertions or single-line replacements.

## Confirmation

How to verify this design is met:

- Run a new change through `openspec-ff-change` that introduces a new `src/` directory; confirm a `Catalog:` task is created
- Run the same change through `openspec-execute`; confirm it does not show "Execution Complete" until the `Catalog:` task is closed
- Load `dev-portal-manager` skill from the design template comment; confirm it resolves correctly
- Verify `initialize-dagger-devops` produces `.entities/resource-dagger.yaml`, `.entities/resource-go.yaml`, `.entities/component-platform.yaml`, ADR symlink, and Tech Radar entry

## Open questions

- Should the catalog entity audit also run after the specs phase (not just design)? (Decided: no — entity decisions belong in design, not specs)

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| — | — | n/a — no new technologies adopted | n/a |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| — | — | — | none | This change modifies workflow skills, not agent-facing technologies |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | This change modifies skill files only — no new runtime components, services, or tools |
