---
name: development-orchestrator
description: Orchestrate the complete OpenSpec workflow — change creation, artifact authoring, worker dispatch, and review — in a single invocation with minimal user intervention.
license: MIT
compatibility: Requires openspec CLI and td CLI.
metadata:
  author: openspec
  version: "1.0"
---

Drive the complete OpenSpec workflow from change creation to ready-to-archive in one invocation.

> **Maintainer note**: The Rule-Coverage Audit, Quality Tooling Audit, and Radar Prerequisite Check sections in this skill duplicate logic from `openspec-ff-change` and `openspec-continue-change`. The canonical descriptions live in `openspec-continue-change`. If audit logic changes, update all three skills.

**Input**: A natural-language description (e.g., "add rate limiting to the API") or a kebab-case change name (e.g., `add-rate-limiting`). If no input is provided, ask one open-ended question before proceeding.

---

## Auditor Monitoring (persistent background responsibility)

The development-orchestrator is responsible for ensuring the auditor agent stays alive. This is a
**passive** check — do not block the workflow on it; perform the check opportunistically at the
start of each session and at natural pause points (e.g., while waiting for workers).

### Heartbeat file

```
.opencode/auditor/heartbeat.json
```

### Liveness check

At session start AND after every worker batch completes, read the heartbeat:

```bash
cat .opencode/auditor/heartbeat.json 2>/dev/null
```

Parse `last_run_utc`. If the heartbeat is **missing** or **stale** (older than 15 minutes), the
auditor is considered dead.

```bash
HEARTBEAT_FILE=".opencode/auditor/heartbeat.json"
if [ ! -f "$HEARTBEAT_FILE" ]; then
  echo "auditor: no heartbeat file — auditor not running"
  AUDITOR_DEAD=true
else
  LAST_RUN=$(python3 -c "
import json, datetime, sys
with open('$HEARTBEAT_FILE') as f:
    hb = json.load(f)
last = datetime.datetime.fromisoformat(hb['last_run_utc'].replace('Z',''))
age = (datetime.datetime.utcnow() - last).total_seconds()
print('stale' if age > 900 else 'alive')
" 2>/dev/null || echo "stale")
  AUDITOR_DEAD=$( [ "$LAST_RUN" = "stale" ] && echo true || echo false )
fi
```

### Restart protocol

If `AUDITOR_DEAD=true`, dispatch a new auditor subagent via the Task tool and announce it:

```
⚠ Auditor heartbeat stale or missing — restarting auditor agent
```

Dispatch with:
- `subagent_type: "auditor"`
- `description: "Restart auditor background loop"`
- `prompt: "Start the auditor cron loop. Load and follow the auditor skill immediately."`

Do NOT wait for the auditor to complete — it runs indefinitely. Fire and forget.

After dispatching, log the restart:

```bash
td log "Auditor restarted — previous heartbeat was stale or missing" 2>/dev/null || true
```

### Check frequency

| Trigger | Action |
|---|---|
| Session start (before Step 1) | Check heartbeat; restart if dead |
| After every worker batch (Step 5c) | Check heartbeat; restart if dead |
| Before entering reviewer mode (Step 5d) | Check heartbeat; restart if dead |

### Guardrails

- **Never block** the orchestration workflow waiting for the auditor
- **Never dispatch more than one** auditor at a time — check the heartbeat age before restarting;
  if it was written less than 15 minutes ago, the auditor is alive even if a previous check said
  otherwise
- **Log all restarts** via `td log` so the history is visible in task context

---

## Step 1: Resolve the change name

**If no input provided**, ask:

> "What change do you want to work on?"

From the description, derive a kebab-case name (e.g., "add user authentication" → `add-user-auth`).

**If the description is fewer than ~10 words or lacks a clear problem domain** (e.g., "fix the thing"), ask one targeted clarifying question before deriving a name.

**Announce the derived name** before proceeding:

> "Using change: `<name>`"

---

## Step 2: Announce the execution plan

Before making any changes, output:

```
## Autonomous Execution Plan

Change: <name>
Phases:
  1. Create change & author all artifacts (proposal → specs → design)
  2. Execute all implementation tasks
  3. Review all submitted tasks
  4. Notify when ready to archive

Proceeding...
```

Do NOT wait for confirmation — proceed immediately.

---

## Step 3: Create or resume the change

Check whether the change already exists:

```bash
openspec status --change "<name>" --json 2>/dev/null
```

- **If the change does NOT exist** (non-zero exit or error): create it:

  ```bash
  openspec new change "<name>"
  ```

  Announce: "Created change: `<name>`"

- **If the change already exists**: announce:
  > "Resuming change: `<name>`"
  > Show current artifact progress from the status output.

---

## Step 4: Author all artifacts (fast-forward mode)

Follow the logic of `openspec-ff-change` exactly — including the rule-coverage audit. The td hierarchy produced MUST be identical to what `openspec-ff-change` would produce.

### 4a. Get artifact build order

```bash
openspec status --change "<name>" --json
```

Note `applyRequires` (artifacts needed before implementation) and the full artifact list.

### 4b. Loop: create each artifact in dependency order

For each artifact with `status: "ready"`:

1. Get instructions:

   ```bash
   openspec instructions <artifact-id> --change "<name>" --json
   ```

2. Read dependency artifact files for context.
3. Create the artifact at `outputPath` using `template` as structure.
   - Apply `context` and `rules` as constraints — do NOT copy them into the file.
4. After creating the artifact, run the **rule-coverage audit** (see [Rule-Coverage Audit](#rule-coverage-audit) below).
5. After the rule-coverage audit, run the **quality tooling audit** (see [Quality Tooling Audit](#quality-tooling-audit) below).
6. Announce: `✓ Created <artifact-id>`
7. Re-check status and continue until all `applyRequires` artifacts are `done`.

**If clarification is needed during proposal authoring** (description too vague for capability identification), ask one targeted question then continue without further interruption.

### 4c. Artifact-specific td work (per openspec-continue-change)

After writing each artifact, create the td hierarchy:

**proposal.md**:

- Ensure `td` is initialized (`td init` if needed)
- `td create "<change-name>" --type feature` → capture `<change-root-id>`
- `td board create "<change-name>" --query "descendant_of(<change-root-id>)"`
- Add frontmatter (`td-board`, `td-issue`) to proposal.md

**specs/<capability>/spec.md** (one per capability in proposal):

- `td create "<capability>" --type feature --parent <change-root-id>` → `<spec-id>`
- `td board create "<change-name>-<capability>" --query "descendant_of(<spec-id>)"`
- For each requirement: `td create "Implement: <req-name>" --type task --parent <spec-id>` → link to spec
- **Wire intra-capability dependencies**: After all tasks for this spec are created, identify ordering relationships between requirements (e.g., data model precedes API layer, which precedes integration). For each such pair:
  ```bash
  td dep add <downstream-task-id> <upstream-task-id>
  ```
  Use the requirement ordering implied by the spec narrative — earlier sections generally precede later ones. Only wire explicit dependencies; do not over-constrain.
- Add frontmatter (`td-board`, `td-issue`) to spec.md

**design.md**:

- For each cross-cutting task not tied to a specific spec: `td create "<task>" --type task --parent <change-root-id>`
- **Wire cross-capability dependencies**: If a cross-cutting task (or a task in spec B) depends on work in spec A, wire it:
  ```bash
  td dep add <downstream-task-id> <upstream-task-id>
  ```
- Link cross-cutting tasks to design.md
- Add frontmatter (`td-board`, `td-issue`) to design.md pointing to the change root
- Run the design-phase rule-coverage supplement (see [Rule-Coverage Audit](#rule-coverage-audit))
- Run the design-phase quality tooling supplement (see [Quality Tooling Audit](#quality-tooling-audit))

---

## Step 5: Execute all implementation tasks

After all `applyRequires` artifacts are complete, transition immediately into task execution — do NOT pause, summarize, or wait for any response.

### 5a. Identify and prioritize capability streams

Each capability in the proposal has a corresponding board created during artifact authoring, named `<change-name>-<capability>`. List all capability boards with open tasks:

```bash
td board list
```

Filter to boards matching `<change-name>-*` that have at least one task in `open` or `in_progress` status. **Do NOT include boards whose only non-closed tasks are `in_review`** — those streams are awaiting the orchestrator's review pass, not a new worker. These are the **worker streams**.

**Prioritize streams with downstream dependents first**: before dispatching, check which streams have tasks that other streams depend on:

```bash
# For each stream's spec-id, check if other tasks in the change depend on it
td deps <spec-id>
```

Order streams so that those with the most downstream dependents are dispatched first. If a stream has no open tasks because all are blocked on dependencies from another stream, **skip it** — do not dispatch a worker. It will become available on the next loop iteration once its dependencies are closed.

Announce:

```
## Executing: <change-name>

Streams (priority order):
  - <change-name>-<capability-1> (N tasks, M downstream dependents)
  - <change-name>-<capability-2> (K tasks)
  ⏸ <change-name>-<capability-3> (blocked — waiting on <capability-1>)

Dispatching workers...
```

### 5b. Dispatch workers in parallel

Use the **Task tool** to dispatch one worker per stream simultaneously. Issue all Task tool calls in a **single message** — one per stream. Do NOT wait for one to finish before launching the next.

For each capability stream, call the Task tool with:

- `subagent_type: "worker"`
- `description: "Implement <change-name>-<capability> tasks"` (5–10 words)
- `prompt` containing only:

```
Your assigned feature: <spec-id>
```

If only one stream has open tasks, dispatch a single Task tool call (no parallelism needed — dispatch anyway for context isolation).

### 5c. Evaluate feature status, unblock dependents, and dispatch researcher (after each worker returns)

When a worker returns, perform three checks:

#### Completion log

Log the worker's outcome before proceeding:

```
✓ Worker <change-name>-<capability> returned
  Tasks submitted for review: N
  Tasks still open: M (blocked or rejected)
  Tasks closed: K
```

Then check whether any previously-blocked streams are now unblocked:

```bash
# For each stream that was skipped in 5a due to blocked dependencies:
td ls --ancestor <spec-id> --status open
```

If a previously-blocked stream now has open (unblocked) tasks, note it — it will be dispatched on the next 5a loop iteration.

#### Feature status

Inspect descendant task statuses and advance the parent feature using the correct `td` state transition commands (the orchestrator owns feature status; workers own child task statuses):

```bash
td ls --ancestor <spec-id> --status all
```

| Child task state | Feature transition |
|---|---|
| ANY child `in_progress` or `in_review` | `td start <spec-id>` (if not already started) |
| ALL children `closed` | `td approve <spec-id>` |
| ANY child rejected (returned to `open`) | `td reject <spec-id>` (marks for rework) |

Do not attempt to set feature status directly — only use `td start`, `td review`, `td approve`, `td reject`.

#### Research task dispatch

After advancing feature status, check whether any open research tasks exist under the change root that are blocking implementation tasks:

```bash
td ls --ancestor <change-root-id> --status open --type task | grep "^Create rule:"
```

For each open research task found, dispatch a `researcher` subagent via the Task tool:

- `subagent_type: "researcher"`
- `description: "Create usage rules for <domain>"` (5–10 words)
- `prompt`: the list of research task ids, e.g.:

```
Your assigned task ids: <research-task-id-1> <research-task-id-2>
```

Dispatch all researcher tasks in a **single message** (parallel). Do not proceed to Step 5d until all researcher subagents have returned.

### 5d. Rotate session, then review

After ALL workers have completed (all tasks submitted for review), rotate to a new session:

```bash
td usage --new-session
```

The output lists all tasks awaiting review across all streams — use that as the review queue.

For each task in `in_review`:

```bash
td context <id>
```

Review the implementation against the relevant spec requirements and design decisions.

**To approve**:

```bash
td handoff <id> --done "Verified: <summary of what was confirmed>" --remaining "none"
td approve <id>
```

Announce: `✓ Approved #<id> <title>`

**To reject**:

Query the dependency graph for tasks that depend on the task being rejected, then wire blockers before rejecting:

```bash
# Find all tasks that depend on this task (structured query — not grep)
td deps <id>

# For each dependent task returned, ensure the dependency is recorded
# (td dep add is idempotent — safe to re-run if already wired at creation time)
td dep add <dependent-task-id> <id>

# Reject the task
td handoff <id> --done "Review complete, rejected" --remaining "<specific actionable issues>"
td reject <id>
```

Announce: `✗ Rejected #<id> <title> → <reason>` (include count of dependent tasks if any)

### 5e. Loop

After reviewer mode, return to step 5a. Only dispatch workers for streams that have tasks that returned to `open` via rejection. **Do NOT dispatch a worker for a stream where all remaining non-closed tasks are `in_review`** — those are already queued for the next review pass, not for a new worker.

Repeat steps 5a–5d until all tasks on all streams are `closed` or a genuine blocker is hit.

After each rejection cycle, re-run the feature status evaluation and researcher dispatch check (5c) before rotating the session.

---

## Step 6: Completion

```bash
td board show "<td-board>"
```

Before declaring completion, check for open catalog tasks and open gate tasks:

```bash
td ls --board "<td-board>" --status open | grep "^Catalog:"
td ls --board "<td-board>" --status open | grep "^Gate:"
```

**If open `Catalog:` tasks remain** (all other implementation tasks are closed):

- Do NOT display "Ready to archive"
- Display: `⚠ Implementation streams complete but catalog tasks remain:` followed by the list of open tasks
- Use the **Task tool** (`subagent_type: "worker"`, description: `"Complete catalog tasks for <change-name>"`, prompt: `"Your assigned feature: <change-root-id>"`) to dispatch a worker for the open catalog tasks, then re-evaluate completion (return to Step 5a)

**If open `Gate:` tasks remain** (all implementation and catalog tasks are closed):

- Do NOT display "Ready to archive"
- Display: `⚠ Implementation complete but prerequisite gate tasks remain open:` followed by the list of open gate tasks with their prereq change names
- Instruct: "Archive the prerequisite changes first, then close the gate tasks manually with `td close <id>`"
- Do NOT dispatch workers for gate tasks — these are closed manually after prerequisite changes are archived

**If no open `Catalog:` or `Gate:` tasks** (or none exist on the board):

Output:

```
## Execution Complete

**Change:** <change-name>
**Board:** <td-board>
**Progress:** all issues closed ✓

All tasks implemented and reviewed. Ready to archive — run `/opsx-archive`.
```

Do NOT autonomously archive. Archiving requires explicit user instruction.

---

## Rule-Coverage Audit

Runs after the specs artifact and after the design artifact. **Not optional** — if `.opencode/rules/patterns/README.md` does not exist, warn and skip:

> "⚠ Rule-coverage audit skipped: `.opencode/rules/patterns/README.md` not found."

### After specs (per capability)

1. Identify relevant pattern domains from the capability spec and trigger conditions in `.opencode/rules/patterns/README.md`
2. For each domain, check:

   ```bash
   ls .opencode/rules/patterns/<layer>/<domain>.md 2>/dev/null
   ```

3. **Rule exists**: link to each requirement task:

   ```bash
   td link <req-task-id> .opencode/rules/patterns/<layer>/<domain>.md --role reference
   ```

4. **Rule missing**: create research task (once per change):

   ```bash
   # Only if not yet created:
   td create "research: <change-name>" --type feature --parent <change-root-id>

   td create "Create rule: patterns/<layer>/<domain>.md" \
     --type task --parent <td-research-id> \
     --body "Needed by: <capability-name>
   Triggered by: <reason>
   Canonical ref: .opencode/rules/patterns/README.md#<domain>
   Sources: <from canonical README entry>"

   td dep add <req-task-id> <td-research-task-id>
   ```

   **De-duplicate**: reuse an existing research task for this domain if one was already created in this run.

5. Show audit summary per capability.

### After design (supplement)

Review `## Technology Adoption & Usage Rules` table and explicit pattern decisions in design.md. For any implied domain not already covered by a specs-phase research task or existing rule, create a research task and wire `td dep add` to affected cross-cutting tasks.

Show rule-coverage supplement summary.

Then run the **quality tooling audit design-phase supplement** (see [Quality Tooling Audit](#quality-tooling-audit) below). Show quality tooling supplement summary.

Then run the **radar prerequisite check** (see [Radar Prerequisite Check](#radar-prerequisite-check) below). Show radar prerequisite check summary.

Then run the **skill audit**: review the `## Agent Skills` table in design.md. For each row with action `create` or `update`, ensure a task exists under the change root (create one if missing):

```bash
td create "Skill: <action> <skill-name>" --type task --parent <change-root-id>
td link <task-id> design.md --role reference
```

Show skill audit summary.

---

## Quality Tooling Audit

Runs after the specs artifact (per capability) and after the design artifact (design-phase supplement). **Not optional** — if tooling is missing, create parallel OpenSpec changes. Do NOT defer.

See [Quality Tooling Pattern Rules](../../rules/patterns/delivery/quality-tooling.md) for the definition of comprehensive tooling.

### After specs (per capability)

1. Identify the technologies introduced or used by this capability (from the spec).
2. For each technology, check whether linting, formatting, and testing are configured and running in CI.
3. **All tooling present**: link the rule to each requirement task:

   ```bash
   td link <req-task-id> .opencode/rules/patterns/delivery/quality-tooling.md --role reference
   ```

4. **Any kind missing**: create one parallel OpenSpec change per missing kind:

   ```bash
   openspec new change "add-<technology>-<kind>"
   ```

   Create a completion-gate task on the main change (once per technology — de-duplicate):

   ```bash
   td create "Gate: quality tooling in place for <technology>" \
     --type task \
     --parent <change-root-id> \
     --body "Blocks completion. Satisfied when these changes are closed and passing:
   - add-<technology>-<kind> (openspec change)"
   ```

   **De-duplicate**: reuse an existing gate task for this technology if already created in this run.

5. Show audit summary per capability:

   ```
   Quality tooling (capability: <cap> / <technology>):
     ✓ linting (exists in CI)
     ✓ formatting (exists in CI)
     ⚠ testing (missing) → openspec change add-<technology>-testing created, gate task td-xxxxx
   ```

### After design (supplement)

Review `## Technology Adoption & Usage Rules` table in design.md for any technologies not audited in the specs phase. For each new technology, repeat the tooling check. De-duplicate gate tasks.

Show design-phase quality tooling supplement summary.

---

## Radar Prerequisite Check

The radar prerequisite check ensures that every direct dependency declared in the `## Technology Adoption & Usage Rules` table either exists in the Tech Radar at ring Adopt, or has a prerequisite change to adopt it. It runs once during design authoring, after the `## Technology Adoption & Usage Rules` table is populated and after the quality tooling audit design-phase supplement.

### When It Runs

After design.md is created and the `## Technology Adoption & Usage Rules` table is populated, after the quality tooling audit design-phase supplement and before the skill audit.

### Process

**If `docs/tech-radar.json` does not exist**, warn and skip:

> "⚠ Radar prerequisite check skipped: `docs/tech-radar.json` not found."

Then continue without creating gate tasks.

For each non-`n/a` row in the `## Technology Adoption & Usage Rules` table:

1. **Extract the technology name** from the Domain column (first column).

2. **Check current radar** — perform case-insensitive lookup of the name in `docs/tech-radar.json` entries array:
   - **If found with ring `Adopt`**: report `✓ <name> (Adopt)` and continue to next row.
   - **If found with ring `Trial`, `Assess`, or `Hold`**: report `⚠ <name> (<ring>) — on radar but not Adopt; proceeding` and continue to next row. No gate task or prerequisite change is created (ring progression is human-driven).

3. **If NOT in radar, check existing changes** — search all `design.md` files under `openspec/changes/` (both active and `archive/`) for any whose `tech-radar` frontmatter block contains an entry with a matching `name` (case-insensitive):
   - **If existing change found**:
     - Capture the change directory name as `<prereq-name>`
     - Create a gate task (check for duplicates first — if a gate task with this exact title already exists, skip creation):

       ```bash
       td create "Gate: <prereq-name> complete" \
         --type task \
         --parent <change-root-id> \
         --body "Blocks completion. Prerequisite change <prereq-name> must be archived before this change can be archived."
       ```

     - Link the gate task to design.md:

       ```bash
       td link <gate-task-id> design.md --role reference
       ```

     - Report: `⚠ <name> — not in radar; existing change <prereq-name> adopts it → gate task <gate-task-id>`
     - Continue to next row.

4. **If NOT in radar and no existing change, spawn new change**:
   - Derive change name: `adopt-<technology-kebab-case>` (e.g., `adopt-chi`, `adopt-otel-go-sdk`)
   - Check whether `openspec/changes/adopt-<name>` already exists:
     - **If exists**: skip creation, announce `⚠ adopt-<name> already exists`
     - **If not**: call `openspec new change "adopt-<name>"`
   - Create a gate task (check for duplicates first):

     ```bash
     td create "Gate: adopt-<name> complete" \
       --type task \
       --parent <change-root-id> \
       --body "Blocks completion. Prerequisite change adopt-<name> must be archived before this change can be archived."
     ```

   - Link the gate task to design.md:

     ```bash
     td link <gate-task-id> design.md --role reference
     ```

   - Report: `⚠ <name> — not in radar; spawned openspec/changes/adopt-<name> → gate task <gate-task-id>`

### Output Format

Show a summary after processing all rows:

```
Radar prerequisite check:
  ✓ chi (Adopt)
  ⚠ zerolog (Hold) — on radar but not Adopt; proceeding
  ⚠ some-new-lib — not in radar; existing change adopt-some-new-lib found → gate task td-xxxxx
  ⚠ another-lib — not in radar; spawned openspec/changes/adopt-another-lib → gate task td-yyyyy
```

### Guardrails

- **Radar prerequisite check is not optional** — run it after the `## Technology Adoption & Usage Rules` table is populated during design authoring. If `docs/tech-radar.json` is absent, warn and skip.
- Skip `n/a` rows in the Technology Adoption table.
- **De-duplicate gate tasks**: before creating, check if a gate task with the exact title `Gate: <prereq-name> complete` already exists on the board. If it does, reuse it — do not create a duplicate.
- Gate task title MUST be exactly: `Gate: <prereq-name> complete` — this enables the completion check to find all prerequisite gates.
- Case-insensitive matching for technology names in both radar lookup and existing-change lookup.

---

## Guardrails

- Derive the change name from input; announce it before acting
- Show the execution plan before making any changes
- Follow `openspec-ff-change` logic exactly for artifact authoring — td hierarchy MUST match
- Apply `context` and `rules` from `openspec instructions` as constraints — do NOT copy them into artifact files
- Pause for genuine blockers only — a genuine blocker requires a specific, articulable reason why continuation is impossible without external input; make routine decisions autonomously and log them
- Use the **Task tool** (`subagent_type: "worker"`) to dispatch one worker per capability stream simultaneously — never implement tasks directly in the orchestrator
- Worker Task tool prompts contain only the assigned feature id — no artifact content, no skill references, no board names
- **Prioritize streams by downstream dependents** — streams whose tasks are prerequisites for other streams are dispatched first; streams with all tasks blocked by unresolved dependencies are skipped until those dependencies close
- **Log worker completion** — after each worker returns, announce task counts (submitted for review, still open, closed) and note any newly-unblocked streams
- Always rotate session with `td usage --new-session` before entering reviewer mode — this is what makes `td approve` work
- Every `td approve` and `td reject` MUST be preceded by `td handoff`
- `--remaining` on rejection MUST be specific and actionable
- **Feature status management is required** — after a worker returns, advance the parent feature status using `td start`, `td approve`, or `td reject` (never `td update --status`). The orchestrator owns feature status; workers own child task statuses.
- **Researcher dispatch is required** — after each worker returns, check for open `Create rule:` research tasks blocking implementation tasks and dispatch `researcher` subagents before proceeding to review.
- **Dependency graph over grep** — use `td deps <id>` to find dependent tasks when rejecting; do NOT grep task titles. Task dependencies are wired at creation time (Step 4c) and are the authoritative source of ordering.
- Rule-coverage audit is not optional — warn and skip if canonical README is absent, but do not silently omit
- Quality tooling audit is not optional — if tooling is missing, create parallel OpenSpec changes; do not defer or skip
- **Radar prerequisite check is not optional** — run it after the `## Technology Adoption & Usage Rules` table is populated during design authoring. If `docs/tech-radar.json` is absent, warn and skip.
- Do NOT archive autonomously — notify the user when ready
