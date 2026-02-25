---
td-board: td-handoff-in-apply-verify
td-issue: td-5a2350
status: accepted
date: 2026-02-23
decision-makers: openspec
---

# Design: Integrate `td handoff` into Apply and Verify Stages

## Context and problem statement

Agent sessions are stateless. Without explicit handoff calls at task-state transitions, the next agent session starts cold — it doesn't know what was done, what decisions were made, or why a task was sent back for rework. The `td handoff` command exists precisely for this, but the `openspec-apply-change` and `openspec-verify-change` skills don't instruct agents to use it at the right moments.

There are three critical transition points where context must be preserved:
1. **Apply → Review**: when an implementer submits a task for review
2. **Review → Approved (closed)**: when a reviewer approves and closes a task
3. **Review → Rejected (back to in_progress)**: when a reviewer rejects and returns a task

## Decision criteria

This design achieves:

- **Context continuity (80%)**: The next session always has enough state to continue without asking "where were we?"
- **Minimal friction (20%)**: Handoff is a single required step per transition, not a multi-step ceremony

Explicitly excludes:

- Changing how `td handoff` works — we only instruct agents to call it
- Adding handoff at mid-task progress points (those are covered by `td log`)
- Modifying any schema, CLI, or non-skill files

## Considered options

### Option 1: Add `td handoff` as a required step at each transition point (selected)

Insert a `td handoff <id>` call as a named step in the skill instructions immediately before each state-transition command (`td review`, `td close`, rejection flow). This makes handoff non-optional and clearly scoped.

### Option 2: Add a general "before ending your session" reminder

Add a single bullet at the end of each skill saying "run `td handoff` before stopping." Easier to add, but easy to skip — it's vague about timing and doesn't tie handoff to specific transitions.

## Decision outcome

**Option 1 selected.** Handoff must be tied to state transitions, not session end. If the agent closes or approves multiple tasks in one session, each task gets its own handoff. This matches how `td handoff` is designed — per-issue, capturing what was done on that issue specifically.

**Invocation pattern** (from handing-off-work reference):
```bash
td handoff <id> \
  --done "<summary of what was completed>" \
  --remaining "<what is still needed, or 'none'>" \
  --decision "<key decision made, if any>"
```

The agent must fill in `--done` and `--remaining` based on actual work done. `--decision` and `--uncertain` are used only when relevant.

## Exact insertion points

### `openspec-apply-change` SKILL.md — Step 6 (implement tasks loop)

Current flow:
```
- Log progress: td log "<message>"
- On completion: td review <id>  ← handoff goes HERE, before this
```

New step to insert before `td review <id>`:
```
- Handoff: td handoff <id> --done "<what was implemented>" --remaining "none" [--decision "<if a key decision was made>"]
```

### `openspec-verify-change` SKILL.md — approval path

The verify skill currently has no explicit td command flow. The approval action needs:
```
- Handoff: td handoff <id> --done "Verified: <what was confirmed>" --remaining "none"
- Approve: td close <id>
```

### `openspec-verify-change` SKILL.md — rejection path

The rejection action needs:
```
- Handoff: td handoff <id> --done "Review complete, rejected" --remaining "<specific issues to fix>"
- Return: td start <id>  (or however rejection is signaled back to in_progress)
```

## Risks / trade-offs

- Risk: Agent fills in `--done`/`--remaining` with boilerplate → Mitigation: Instructions emphasize "be specific and honest" (matching the handing-off-work reference language)
- Trade-off: Slightly more verbose skill instructions → acceptable; these are agent instructions not user-facing copy

## Migration plan

1. Edit `.opencode/skills/openspec-apply-change/SKILL.md` — add handoff step in the task loop
2. Edit `.opencode/skills/openspec-verify-change/SKILL.md` — add handoff steps before approve and reject
3. No deployment steps required; skills take effect immediately on next invocation

Rollback: revert edits to the two SKILL.md files.

## Confirmation

- Manually invoke `openspec-apply-change` on a test change; verify `td handoff` is called before `td review`
- Manually invoke `openspec-verify-change`; verify `td handoff` is called before `td close` (approve) and before rejection
- Run `td context <id>` after a handoff; confirm the context includes `--done`/`--remaining` fields

## Open questions

_(none — scope is well-defined)_

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| — | — | n/a — no new technologies adopted | n/a |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | No new catalog entities introduced by this change |
