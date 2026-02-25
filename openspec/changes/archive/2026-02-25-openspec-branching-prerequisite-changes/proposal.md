---
td-board: openspec-branching-prerequisite-changes
td-issue: td-06ad10
---

# Proposal: Branching Prerequisite Changes

## Why

During analysis and design of larger deliverables, emergent decisions arise — particularly around third-party dependencies, tooling choices, and foundational technology adoptions — that each deserve their own tracked change with full artifact lineage. Currently, OpenSpec has no first-class mechanism to declare a prerequisite child change from within a parent change and wire the dependency relationship so that the parent cannot complete until its prerequisites are satisfied.

## What Changes

- Add a `## Prerequisite Changes` table to the `design.md` template so the architect can declare emergent prerequisites discovered during design
- Update the `openspec-continue-change` and `openspec-ff-change` skills to detect prerequisite declarations in `design.md`, create each prerequisite change via `openspec new change`, and wire td gate tasks and dependencies on the parent change root
- Update the `development-orchestration` skill to check for open prerequisite gate tasks at the completion step before declaring ready-to-archive
- Update `openspec status` output (skill-driven narration) to surface prerequisite change artifact progress alongside the parent change
- Add a `openspec-new-prereq-change` skill that guides the architect through creating a prerequisite change from within an active change context, including wiring the td gate task manually when discovered outside of design authoring

## Capabilities

### New Capabilities

- `prerequisite-change-design-integration`: Adds a `## Prerequisite Changes` table to the `design.md` template. The `openspec-continue-change` and `openspec-ff-change` skills read this table after design authoring, call `openspec new change <prereq-name>` for each entry, create a td gate task on the parent change root (`td create "Gate: <prereq-name> complete" --type task --parent <change-root-id>`), and wire `td dep add <parent-change-root-id> <gate-task-id>` so the parent's completion is blocked
- `prerequisite-change-status`: Skill-driven status narration — after `openspec status --change <parent>`, the skill queries each declared prerequisite by name (`openspec status --change <prereq-name>`) and surfaces artifact progress and open task counts in a unified summary

### Modified Capabilities

- `openspec-continue-change-skill`: After writing `design.md`, read the `## Prerequisite Changes` table and spawn each declared change; create gate tasks and wire td dependencies
- `openspec-ff-change-skill`: Same post-design prerequisite-spawning step applied during fast-forward without pausing

## Impact

- Affected services/modules: `openspec-continue-change` skill, `openspec-ff-change` skill, `development-orchestration` skill, `design.md` template
- API changes: No CLI changes — prerequisite relationship is tracked entirely via td gate tasks and the `## Prerequisite Changes` table in `design.md`
- Data model changes: `design.md` gains a `## Prerequisite Changes` table (name, rationale, status columns); td gate tasks on the parent change root reference prereq change names
- Dependencies: No new external dependencies
