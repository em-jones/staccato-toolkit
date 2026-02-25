---
td-board: openspec-execute-phase
td-issue: td-0d1576
---

# Proposal: Unified Execute Phase (Replaces Apply + Verify)

## Why

The current `openspec-apply-change` and `openspec-verify-change` skills model implementation and review as two separate, sequential commands. This forces artificial phase boundaries: an agent must finish all tasks before any review can happen, and review is a separate invocation entirely. In practice, tasks are independent and can be implemented, reviewed, and closed in parallel — and the review step belongs structurally adjacent to the implementation step, not in a separate phase. A single `execute` phase that owns the full task lifecycle (implement → handoff → review → close/retry) is simpler, faster, and more coherent.

## What Changes

- **NEW** `openspec-execute` skill: replaces both `openspec-apply-change` and `openspec-verify-change` with a single unified execute loop
- **BREAKING** `openspec-apply-change` skill: deprecated — replaced by `openspec-execute`
- **BREAKING** `openspec-verify-change` skill: deprecated — replaced by `openspec-execute`
- The execute loop finds all tasks without blockers, implements them in parallel where possible, then for each completed task: handoff → submit for review → review fires in a new agent session → approve (close) or reject (handoff + retry)

## Capabilities

### New Capabilities

- `openspec-execute`: The unified execute skill. Discovers ready tasks, implements them, manages the full handoff → review → approve/reject cycle per task. Parallelizes independent tasks. Loops until all tasks are closed or a blocker is hit.

### Modified Capabilities

- `openspec-apply-change`: **BREAKING** — marked deprecated; content updated to redirect agents to `openspec-execute`
- `openspec-verify-change`: **BREAKING** — marked deprecated; content updated to redirect agents to `openspec-execute`

## Impact

- Affected files:
  - `.opencode/skills/openspec-apply-change/SKILL.md` (deprecation notice)
  - `.opencode/skills/openspec-verify-change/SKILL.md` (deprecation notice)
  - `.opencode/skills/openspec-execute/SKILL.md` (new file)
- API changes: No CLI changes; purely skill (agent instruction) changes
- Data model changes: No td schema changes; uses same `td start`, `td review`, `td close`, `td handoff` commands
- Dependencies: Requires `td` CLI (already available); no new tools
