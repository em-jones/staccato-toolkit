---
td-board: td-handoff-in-apply-verify
td-issue: td-5a2350
---

# Proposal: Integrate `td handoff` into Apply and Verify Stages

## Why

The `openspec-apply-change` and `openspec-verify-change` skills do not instruct agents to run `td handoff` at critical transition points, meaning session context and decisions are lost between sessions. This causes the next agent session to lose state about what was completed, what remains, and why certain decisions were made.

## What Changes

- **openspec-apply-change**: Add `td handoff` step before submitting a task for review (i.e., before `td review <id>`)
- **openspec-verify-change**: Add `td handoff` step before approving a task (i.e., before `td close <id>`)
- **openspec-verify-change**: Add `td handoff` step before rejecting a task and sending it back (i.e., before returning it to `in_progress`)

## Capabilities

### New Capabilities

_(none — this is a modification of existing behavior)_

### Modified Capabilities

- `openspec-apply-change`: Apply skill updated to call `td handoff` before task submission for review
- `openspec-verify-change`: Verify skill updated to call `td handoff` before task approval and before task rejection

## Impact

- Affected files: `.opencode/skills/openspec-apply-change/SKILL.md`, `.opencode/skills/openspec-verify-change/SKILL.md`
- API changes: No
- Data model changes: No
- Dependencies: No new dependencies; requires `td handoff` command (already available via `td` CLI)
