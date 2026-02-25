---
td-board: autonomous-openspec-skill
td-issue: td-c590b4
---

# Proposal: Autonomous OpenSpec Skill

## Why

Agents currently need end-user prompting to advance through each OpenSpec artifact step (`/opsx-continue`, `/opsx-apply`, etc.), creating unnecessary interruptions even when the change is well-understood. A single autonomous skill would let an agent drive the complete OpenSpec cycle — from change creation through artifact authoring to task execution and review — with no human intervention beyond the initial description.

## What Changes

- Add a new `development-orchestration` skill that orchestrates the full OpenSpec workflow in one invocation
- The skill covers: change creation, proposal authoring, specs, design, apply/execute, and review
- Uses existing CLI primitives (`openspec`, `td`) and delegates to existing skill logic where possible
- Accepts a description or change name as input; everything else proceeds autonomously
- Surfaces blockers to the user only when a genuine decision is required (ambiguity, missing context, or reviewer-mode constraint)

## Capabilities

### New Capabilities

- `development-orchestration`: A skill that runs the complete OpenSpec workflow autonomously — creating a change, authoring all artifacts in schema order, executing all implementation tasks, and completing the review phase — with minimal user intervention

### Modified Capabilities

(none)

## Impact

- Affected services/modules: `.opencode/skills/` (new skill directory), no existing skills modified
- API changes: No
- Data model changes: No
- Dependencies: Existing `openspec` CLI, `td` CLI, and all existing skill logic (reused by reference, not duplicated)
