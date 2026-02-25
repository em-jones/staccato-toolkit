---
td-board: enhance-design-spec-skills-with-rules
td-issue: td-95a256
---

# Proposal: Enhance Design & Spec Skills with Rules Awareness

## Why

Workers implementing tasks receive no domain guidance unless the platform-architect manually injects rule files into every worker invocation. There is no systematic inventory of which pattern domains need rules, no in-workflow trigger to create missing ones, and no mechanism to prevent implementation from starting before the rules a capability depends on exist.

## What Changes

- **`openspec-continue-change` (specs phase)**: After creating requirement tasks, check the canonical patterns list for relevant domains; create research tasks for missing rules under a dedicated `td-research` feature; wire `--depends-on` from requirement tasks to their research tasks so `td next` surfaces research before implementation
- **`openspec-continue-change` (design phase)**: After writing `design.md` and creating cross-cutting tasks, review the Technology Adoption table and design pattern decisions; create or supplement research tasks for any additional missing rules identified; wire dependencies from affected implementation tasks
- **`openspec-ff-change`**: Same research-task creation and dependency-wiring behaviour during fast-forward
- **New canonical patterns document**: `.opencode/rules/patterns/README.md` — the authoritative list of pattern domains for which rules must exist, drawn from industry literature; used as the reference during rule-coverage audits in specs and design phases

## Capabilities

### New Capabilities

- `canonical-pattern-rules`: The canonical document at `.opencode/rules/patterns/README.md` defining which pattern domains must have rule files, organised by layer (code / architecture / delivery / operations), with trigger conditions and source literature references for each domain

### Modified Capabilities

- `openspec-continue-change-skill`: Add rule-coverage audit step to both specs and design artifact authoring; create research tasks with td dependency wiring
- `openspec-ff-change-skill`: Add the same rule-coverage audit and research task creation during fast-forward artifact generation

## Impact

- Affected files: `.opencode/skills/openspec-continue-change/SKILL.md`, `.opencode/skills/openspec-ff-change/SKILL.md`, `openspec/schemas/v1/schema.yaml`
- New files: `.opencode/rules/patterns/README.md`
- td hierarchy: introduces a `td-research` feature issue as a sibling to capability nodes under the change root; research tasks use `--depends-on` to gate requirement tasks
- API changes: None — `td link`, `td dep`, and `--depends-on` are existing CLI features
- Data model changes: None
- Dependencies: `td link`, `td dep` (already available), `create-usage-rules` skill (already exists)
