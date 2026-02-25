---
td-board: adr-tech-radar-sync
td-issue: td-59c336
---

# Proposal: ADR ↔ Tech Radar Synchronization

## Why

`docs/tech-radar.json` is currently maintained by hand, updated post-archive via a task. ADRs (design.md files) contain a `## Tech Radar` table that declares the same intent — but there is no mechanical link between the two. Drift is inevitable: a decision is made, archived, and the radar update task is deferred or forgotten.

Additionally, when a change identifies a new direct dependency (language, framework, library, pattern), there is no check against the radar. The architect manually decides whether to populate the `## Prerequisite Changes` table. This is error-prone: technologies can be adopted without a formal evaluation change, and there is no guardrail preventing a change from adopting a technology that has no radar presence.

## What Changes

- **ADR frontmatter gains a `tech-radar` block** — structured YAML that is the canonical source of truth for each technology decision. The `## Tech Radar` table in the body is removed from the template; frontmatter replaces it.
- **A sync script** reads all ADR frontmatter across archived and active changes, diffs against `docs/tech-radar.json`, and writes the updated file. Called at archive time and on demand.
- **The design-authoring step gains a radar prerequisite check** — when `## Technology Adoption & Usage Rules` is populated with direct dependencies, each entry is queried against `docs/tech-radar.json`. If absent from the radar AND no existing change adopts it, a new prerequisite change is automatically spawned (same mechanism as the existing Prerequisite Changes step). If a change already exists that adopts it, a gate task is wired to that change.
- **Skill and template updates** — `openspec-ff-change`, `openspec-continue-change`, `development-orchestration`, `dev-portal-manager`, and the `design.md` template are all updated to reflect the new frontmatter schema, remove the table, and embed the radar check.

## Capabilities

**New Capabilities:**
- `adr-frontmatter-schema` — Define and document the `tech-radar` frontmatter block added to `design.md`; update the template and all existing ADRs to use it.
- `tech-radar-sync` — Script that reads ADR frontmatter across the repo, diffs against `docs/tech-radar.json`, and writes the updated file; integrated into the archive workflow.
- `radar-prerequisite-check` — During design authoring, each direct dependency in `## Technology Adoption & Usage Rules` is checked against the radar; missing entries automatically spawn prerequisite changes or wire gates to existing ones.

**Modified Capabilities:**
- None — the above are net-new capabilities, though they modify existing files.

## Impact

- `openspec/schemas/v1/templates/design.md` — frontmatter gains `tech-radar` block; `## Tech Radar` table section removed
- `openspec-ff-change/SKILL.md` — Catalog Entity Audit's Tech Radar task replaced by radar-prerequisite-check; sync step added
- `openspec-continue-change/SKILL.md` — same
- `development-orchestration/SKILL.md` — same
- `dev-portal-manager/SKILL.md` — Tech Radar section updated to describe frontmatter-driven workflow
- All existing `design.md` ADRs — `## Tech Radar` table migrated to frontmatter (implementation task)
- `.opencode/skills/openspec-archive-change/SKILL.md` — sync script called at archive time
