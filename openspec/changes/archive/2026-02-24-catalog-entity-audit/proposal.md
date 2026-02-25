---
td-board: catalog-entity-audit
td-issue: td-d799f8
---

# Proposal: Catalog Entity Audit in OpenSpec Workflow

## Why

The `## Catalog Entities` table in `design.md` is consistently filled with `n/a` even when a change introduces new components, tools, or services — because no workflow step challenges that claim or enforces follow-through. The `dev-portal-manager` skill exists and is comprehensive, but nothing in the execution loop causes agents to load it. Additionally, the design template comment incorrectly references `manage-software-catalog` (a non-existent skill name), sending agents looking for a skill that does not exist.

## What Changes

- Add a **catalog entity audit** step to the design-phase workflow in `openspec-continue-change` and `openspec-ff-change`: reads the `## Catalog Entities` table, verifies entity files exist, creates td tasks for any declared-but-missing entities, and warns when `n/a` is declared for a change that introduces new code/tools/services
- Add the same **catalog task completion check** to `openspec-execute` and `development-orchestration`: catalog tasks must be closed before a change is considered implementation-complete
- Fix the **design template comment** in the `openspec-continue-change` and `openspec-ff-change` skills: replace the reference to the non-existent `manage-software-catalog` skill with the correct `dev-portal-manager` skill

## Capabilities

### New Capabilities

- `catalog-entity-audit-step`: The audit logic itself — what to check, how to detect false `n/a` declarations, what tasks to create, and how it integrates into the design phase

### Modified Capabilities

- `openspec-continue-change-skill`: Add catalog entity audit step after the design-phase skill audit; fix template comment referencing wrong skill name
- `openspec-ff-change-skill`: Add catalog entity audit step after the design-phase skill audit; fix template comment
- `openspec-execute`: Add catalog task completion check before marking a change complete
- `development-orchestration`: Add catalog task completion check before notifying ready-to-archive

## Impact

- Affected services/modules: `.opencode/skills/openspec-continue-change/SKILL.md`, `.opencode/skills/openspec-ff-change/SKILL.md`, `.opencode/skills/openspec-execute/SKILL.md`, `.opencode/skills/development-orchestration/SKILL.md`
- API changes: No
- Data model changes: No
- Dependencies: Existing `dev-portal-manager` skill, existing `.entities/` conventions
