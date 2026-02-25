---
td-board: initialize-developer-portal
td-issue: td-550c57
status: "proposed"
date: 2026-02-24
decision-makers: platform-architect
---

# Design: Initialize Developer Portal Management Automations

## Context and problem statement

The `platform-architect` agent currently references a `manage-software-catalog` skill that does not exist at the expected path (`.Claude/skills/manage-software-catalog/SKILL.md`). Catalog entity curation is described in the agent definition as a design-phase responsibility, but there is no actual skill document to guide the process. Derivation of entities from project metadata (`devbox.json`, `package.json`) is mentioned as "a separate automation concern" with no implementation. Documentation conventions for Backstage TechDocs, ADRs, and Tech Radar are undocumented. The result: each architect context must reconstruct these conventions from scratch, leading to inconsistency.

This design covers: creating a `dev-portal-manager` skill at `.opencode/skills/dev-portal-manager/`, updating `platform-architect.md` to reference it (replacing the broken `manage-software-catalog` reference), and specifying derivation scripts and documentation conventions.

## Decision criteria

This design achieves:

- **Skill completeness** (40%): The skill covers all four areas from the proposal — entity authoring, script-based derivation, doc structure, ADR symlinking — with enough specificity to be self-contained
- **Consistency with existing skill patterns** (35%): The skill follows the same SKILL.md format as `td-task-management`, `openspec-execute`, and other skills under `.opencode/skills/`
- **Minimal agent footprint** (25%): The agent definition change is additive — a new section plus a corrected skill reference — no existing behavior is removed

Explicitly excludes:

- Actually running the derivation scripts (this change only specifies and stores them; execution is a separate concern)
- Backstage deployment or infrastructure configuration
- Automating `catalog-info.yaml` registration

## Considered options

### Option A: Inline entity guidance directly in `platform-architect.md`

Expand the existing `catalog-curation` section inline with full YAML templates, doc conventions, and script specs.

Rejected: The agent file already contains curated guidance sections. Adding multi-page content inline makes the file unwieldy and harder for agents to selectively load. Skills are the designated extension point.

### Option B: Create a `dev-portal-manager` skill loaded on demand (chosen)

Place all portal management guidance in `.opencode/skills/dev-portal-manager/SKILL.md`. Update `platform-architect.md` to reference it. Store derivation scripts under `.opencode/skills/dev-portal-manager/scripts/`.

Chosen because: it is consistent with how `development-orchestration`, `td-task-management`, and other heavy-guidance areas are handled. The skill is self-contained, versionable, and independently loadable.

### Option C: Separate skills per concern (entities, scripts, docs, ADRs)

One skill per concern area.

Rejected: Overkill for initial implementation. A single skill with clearly delineated sections is simpler to load and maintain. Splitting can happen if a concern grows independently.

## Decision outcome

**Use Option B**: a single `dev-portal-manager` skill at `.opencode/skills/dev-portal-manager/SKILL.md`.

Key technical decisions:

1. **Script storage**: Scripts go under `.opencode/skills/dev-portal-manager/scripts/` — co-located with the skill that specifies them. Naming: `derive-from-devbox.sh` and `derive-from-package-json.sh`.

2. **Skill format**: Follow the SKILL.md format established in `td-task-management` — overview, when to use, step-by-step guidance, reference files. No custom format.

3. **Agent definition update**: Replace the broken reference to `manage-software-catalog` in `platform-architect.md` with a `dev-portal-manager` section following the same pattern as the existing `Development Orchestration` section. Wrap in HTML comment markers `<!-- dev-portal-manager-start -->` / `<!-- dev-portal-manager-end -->` for programmatic identifiability.

4. **ADR symlink target**: Symlinks use relative paths from `docs/adrs/` to the change directory. The change directory is always under `openspec/changes/<name>/`, so a typical relative path is `../../openspec/changes/<name>/design.md`. This assumes `docs/` is at the repo root.

5. **Tech Radar file location**: `docs/tech-radar.json` at the repo root, not per-component. The Tech Radar is a platform-level concern.

## Risks / trade-offs

- Risk: The derivation scripts may need adaptation for different project structures → Mitigation: scripts are documented as templates/examples in the skill, not production-ready automation; implementers adapt them
- Risk: The existing `catalog-curation` section in `platform-architect.md` partially overlaps with the new skill → Mitigation: the agent definition update explicitly scopes the existing section to "curated entities only" (already the case) and defers derivable entities to `dev-portal-manager`
- Trade-off: Co-locating scripts under `.opencode/skills/` rather than a top-level `scripts/` directory is unconventional — accepted to keep the skill self-contained

## Migration plan

1. Create `.opencode/skills/dev-portal-manager/SKILL.md` with full content
2. Create `.opencode/skills/dev-portal-manager/scripts/derive-from-devbox.sh` (template)
3. Create `.opencode/skills/dev-portal-manager/scripts/derive-from-package-json.sh` (template)
4. Update `.opencode/agents/platform-architect.md`: add `dev-portal-manager` section, fix the broken `manage-software-catalog` reference
5. No rollback needed — changes are additive. The broken `manage-software-catalog` reference does not currently function, so removing it has no regression risk.

## Confirmation

- Each section of the SKILL.md corresponds to a spec requirement in `specs/dev-portal-manager/spec.md`
- The `platform-architect.md` file contains a `dev-portal-manager` section loadable by a new agent context
- Scripts exist at the paths specified in the skill and are executable
- The broken `manage-software-catalog` reference is removed or corrected

## Open questions

- None at design time

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| — | — | n/a — no new technologies adopted | n/a |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------| 
| — | — | n/a | — | — | n/a | No new curated entities introduced by this change |
</content>
</invoke>