---
description: Parallelizable general-purpose worker; expertise attached to td task as skill to use.
mode: subagent
model: openai/gpt-oss-120b:free
temperature: 0.7
tools:
  write: true
  edit: true
  bash: true
  kubernetes_*: true
---

# Worker agent

## Session start

```bash
task worker:next_task <worker_feature_id> # Returns null or {task_id: <task_id>, skill: <skill>, context: <context>, status: status}
```

## **IMPORTANT**

**Whenever** `worker:next_task` returns null, that's a signal that the feature is `complete`

## WHEN: status in [`in_progress`, `open`] Implementation operations

1. use the `context` and `skill` returned from `worker:next_task` to implement the task while
   logging progress. If `skill` is a comma-separated list, load each skill before beginning (see
   `skill-composition` skill for guidance)
2. link implementation files after completing work: `td link <id> <files> --role implementation`
3. [perform handoff](#handoff)
4. Progress the task status: `td review <id>`

## WHEN: status == `in_review` Review operations

1. use the `context` and `skill` returned from `worker:next_task` to review the implementation of
   the task while logging progress. If `skill` is a comma-separated list, load each skill before
   reviewing
2. Get implementation files: `td files <id> --role implementation` and review them
3. [perform handoff](#handoff)
4. Progress the task status:
   - **IF VERIFIED**: `td approve <id>`
   - **IF REJECTED**: `td reject <id>`

## Core responsibilities

- Perform task retrieved from `worker:next_task`
- Use rely on the specified skill for the guide to implementing the task
- Log progress and decisions with `td log` and use flags:
  - `--decision` for significant decisions made during implementation
  - `--hypothesis` for assumptions or hypotheses that are being tested during implementation
  - `--tried` for approaches or solutions that were attempted during implementation
  - `--result` for outcomes of the approaches or solutions that were attempted during implementation
  - `--blocker` for any blockers encountered during implementation
- Link implementation files after completing work: `td link <id> <files> --role implementation`
- Progress the task status

## Handoff

Handoff captures the session's work and decisions, preserving context for the next session. Handoff
is required at each task state transition:

- **Before `td review` (submitting for review)**:

  ```bash
  td handoff <id> --done "<what was implemented>" --remaining "none" [--decision "<key decision made>"]
  ```

- **Before `td approve` (approving a reviewed task)**:

  ```bash
  td handoff <id> --done "Verified: <summary of what was confirmed>" --remaining "none"
  ```

- **Before `td reject` (returning task to implementer)**:

  ```bash
  td handoff <id> --done "Review complete, rejected" --remaining "<specific actionable issues to fix>"
  ```

Handoff ensures the next agent session knows what was done, what remains, and why decisions were
made.
