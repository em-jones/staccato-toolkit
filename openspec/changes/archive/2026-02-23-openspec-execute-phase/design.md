---
td-board: openspec-execute-phase
td-issue: td-0d1576
status: accepted
date: 2026-02-23
decision-makers: openspec
---

# Design: Unified Execute Phase (Replaces Apply + Verify)

## Context and problem statement

The openspec workflow has two separate skill invocations for what is logically one activity: making tasks go from open to closed. `openspec-apply-change` implements tasks; `openspec-verify-change` reviews them. This split creates unnecessary friction — the agent must stop, switch commands, and lose context at the boundary. Tasks that are ready to review are held up waiting for all other tasks to finish. The question is: how do we model implementation and review as a single coherent loop that supports per-task parallelism, inter-session handoffs, and reviewer isolation?

## Decision criteria

This design achieves:

- **Per-task review parallelism (40%)**: Individual tasks can be reviewed as they complete, without waiting for other tasks
- **Session boundary safety (30%)**: Every state transition that crosses a session boundary is preceded by a handoff with actionable context
- **Simplicity of invocation (20%)**: One command covers the full lifecycle; agents don't need to know which "phase" they're in
- **Reviewer isolation (10%)**: Review happens in a separate agent session from implementation, maintaining the integrity of the review

Explicitly excludes:

- Changing any td CLI commands or schema
- Changing how artifacts (proposal, specs, design) are authored
- Supporting non-td task tracking

## Considered options

### Option 1: Keep apply + verify as separate commands, improve handoffs

Add handoffs to the existing skill boundary. Agents still run apply, then verify as separate commands.

Rejected because it preserves the sequential bottleneck — tasks can't be reviewed until all are done — and the phase boundary is still artificial.

### Option 2: Merge into a single `execute` skill with an internal implement→review loop (selected)

A single `openspec-execute` skill runs a loop: find ready tasks, implement each one, hand off, submit for review, then review in a spawned/next session. The loop continues until all board tasks are closed. Deprecate apply and verify.

Selected because it removes the artificial boundary, enables per-task review as soon as a task is ready, keeps handoffs built into the natural flow, and is simpler to invoke.

### Option 3: Auto-spawn parallel agent sessions

Use sub-agents or parallel invocations to implement multiple tasks simultaneously across true parallel sessions.

Rejected as out of scope — the skill system is sequential per invocation. Parallelism is handled by the agent choosing which ready tasks to tackle in sequence within a session, not by forking.

## Decision outcome

**Option 2: Unified execute loop.** The `openspec-execute` skill owns the full lifecycle for all board tasks. Its core loop:

```
1. Load board from proposal.md frontmatter (td-board)
2. Find all tasks in `open` or `in_progress` status (not blocked)
3. For each ready task:
   a. td start <id>
   b. Implement
   c. td log progress/decisions
   d. td handoff <id> --done "..." --remaining "none" [--decision "..."]
   e. td review <id>
4. For each task now in `in_review`:
   a. In a NEW agent session (or explicitly as the reviewer role):
   b. Verify the implementation against specs/design
   c. If approved:
      - td handoff <id> --done "Verified: ..." --remaining "none"
      - td close <id>
   d. If rejected:
      - td handoff <id> --done "Review complete, rejected" --remaining "<specific actionable issues>"
      - td start <id>  ← returns to open/in_progress for retry
5. Repeat from step 2 until all tasks closed or blocker hit
```

**Reviewer session boundary**: The skill explicitly distinguishes "implementer mode" (steps 3a–e) from "reviewer mode" (steps 4a–d). When the agent reaches step 4, it should treat this as a context switch — ideally a separate session, but at minimum a distinct mental frame with fresh eyes on the implementation.

**Parallelism model**: Within a single session, the agent works through ready tasks serially. The value is that tasks don't block each other across sessions — task B's review doesn't wait for task A's implementation.

**Rejected tasks**: When a task is rejected, `td start <id>` returns it to `in_progress`. The next loop iteration picks it up again. The rejection handoff's `--remaining` field is the primary input for the retry session.

## Risks / trade-offs

- Risk: Self-review — `td` CLI prevents the same session from closing its own implementations → Mitigation: The skill must explicitly instruct the agent to treat review as a separate session. The `td` CLI enforces this at the command level (errors on self-close).
- Risk: Reviewer role conflation — an agent acts as both implementer and reviewer in one session → Mitigation: Skill instructions explicitly separate the two modes and call out that reviewer mode requires a fresh session context.
- Trade-off: More complex skill instructions than either apply or verify alone → acceptable; this complexity is the cost of eliminating the phase boundary.
- Trade-off: Deprecating two skills means existing workflows that reference apply/verify directly break → Mitigation: Deprecation notices in both old skills redirect to `openspec-execute`.

## Migration plan

1. Create `.opencode/skills/openspec-execute/SKILL.md` with the full unified loop
2. Add deprecation notice to `openspec-apply-change/SKILL.md`: "**DEPRECATED** — use `openspec-execute` instead"
3. Add deprecation notice to `openspec-verify-change/SKILL.md`: "**DEPRECATED** — use `openspec-execute` instead"
4. No data migration needed; all td issues and boards remain unchanged

Rollback: remove the deprecation notices and delete `openspec-execute/SKILL.md`.

## Confirmation

- Invoke `openspec-execute` on a change with 2+ tasks; confirm each task goes through implement → handoff → review → close without manual phase switching
- Confirm rejected tasks re-enter the loop with the rejection handoff as context
- Confirm `openspec-apply-change` and `openspec-verify-change` display deprecation notices when invoked

## Open questions

- Should `openspec-execute` also support a `--reviewer-only` flag to enter just the review half of the loop (for changes partially implemented by another agent)? Deferred — can be added as a follow-on.

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| — | — | n/a — no new technologies adopted | n/a |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | No new catalog entities introduced by this change |
