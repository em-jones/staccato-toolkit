---
description: Implement and review all tasks for an OpenSpec change in a unified loop
---

Implement and review all tasks for an OpenSpec change in a single unified loop. Replaces `/opsx-apply` and `/opsx-verify`.

**Input**: Optionally specify a change name (e.g., `/opsx-execute add-auth`). If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change
   - Auto-select if only one active change exists
   - If ambiguous, run `openspec list --json` and use the **AskUserQuestion tool** to let the user select

   Always announce: "Using change: <name>" and how to override (e.g., `/opsx-execute <other>`).

2. **Load context**

   Read `proposal.md` from the change directory. Parse its YAML frontmatter to get:
   - `td-board`: the change-level board name
   - `td-issue`: the change root issue id

   Also read `design.md` and any `specs/**/*.md` files for implementation context.

3. **Show board and progress**

   ```bash
   td board show "<td-board>"
   ```

   If the board is empty, warn:

   > "No td issues found on board `<td-board>`. Were td issues created during spec and design authoring?"
   > Suggest running `/opsx-continue` to re-author specs/design with td issue creation.

   Display:
   - Board name and schema
   - Count of open / in_review / closed issues
   - List of open and in_review issues

4. **Implementer mode: work through open tasks**

   For each task in `open` or `in_progress` status:
   - Pick next: `td next`
   - Start: `td start <id>`
   - Implement the required code changes
   - Log progress: `td log "<message>"` (use `--decision`, `--blocker`, `--hypothesis`, `--result` as appropriate)
   - Handoff before review: `td handoff <id> --done "<what was implemented>" --remaining "none"` (add `--decision "<key decision>"` if a significant choice was made)
   - Submit: `td review <id>`

   After submitting all ready tasks for review, proceed to reviewer mode.

   **Pause if:**
   - Task is unclear → ask for clarification
   - Implementation reveals a design issue → suggest updating artifacts
   - Blocker encountered → `td log --blocker "<reason>"`, report and wait for guidance
   - User interrupts

5. **Reviewer mode: review submitted tasks**

   > **IMPORTANT**: Reviewer mode requires a separate agent session from the one that implemented the tasks. The `td` CLI will block you from closing tasks you started. If you encounter a self-review error, stop and instruct the user to open a new session to review.

   For each task in `in_review` status:
   - Read the implementation with fresh context — as a reviewer, not the implementer
   - Check the implementation against the relevant spec requirements and design decisions
   - Check that handoff context (`td context <id>`) accurately describes what was done

   **To approve** (implementation correct, requirements met):

   ```bash
   td handoff <id> --done "Verified: <summary of what was confirmed>" --remaining "none"
   td close <id>
   ```

   **To reject** (issues found):

   ```bash
   td handoff <id> --done "Review complete, rejected" --remaining "<specific actionable issues — describe exactly what must be fixed>"
   td start <id>
   ```

   The `--remaining` value on rejection is the primary context for the retry session. Be specific: "Missing error handling for X" not "needs work".

6. **Loop**

   After reviewer mode, return to step 4. Repeat until all tasks on the board are `closed` or a blocker is hit.

7. **On completion or pause, show status**

   ```bash
   td board show "<td-board>"
   ```

   Display:
   - Issues closed this session
   - Overall: closed vs. total issues on board
   - If all closed: suggest archive with `/opsx-archive`
   - If paused: explain why and wait for guidance

**Output During Implementation**

```
## Executing: <change-name> (schema: <schema-name>)

Board: <td-board>
Open: N | In review: M | Closed: K

### Implementer mode

Working on: #<id> <title>
[...implementation happening...]
✓ Submitted for review

Working on: #<id> <title>
[...implementation happening...]
✓ Submitted for review

### Reviewer mode
> Starting reviewer mode — treating this as a fresh session context.

Reviewing: #<id> <title>
[...review happening...]
✓ Approved / ✗ Rejected → <reason>
```

**Output On All Tasks Closed**

```
## Execution Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Board:** <td-board>
**Progress:** all issues closed ✓

All tasks implemented and reviewed. Ready to archive — run `/opsx-archive`.
```

**Output On Pause**

```
## Execution Paused

**Change:** <change-name>
**Progress:** N/M issues closed

### Issue Encountered
<description>

**Options:**
1. <option 1>
2. <option 2>

What would you like to do?
```

**Guardrails**

- Always read proposal.md frontmatter before starting to get the board name
- Keep code changes minimal and scoped to each issue
- Log meaningful progress with `td log` — decisions, blockers, results
- Reviewer mode MUST be a separate session from implementer mode
- Every state transition (review submission, approval, rejection) MUST be preceded by `td handoff`
- `--remaining` on rejection MUST be specific and actionable — the implementer's next session depends on it
- Pause on errors, blockers, or unclear requirements — don't guess
- If implementation reveals design issues, pause and suggest artifact updates
