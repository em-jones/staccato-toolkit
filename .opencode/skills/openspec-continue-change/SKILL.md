---
name: openspec-continue-change
description: Continue working on an OpenSpec change by creating the next artifact. Use when the user wants to progress their change, create the next artifact, or continue their workflow.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.1"
  generatedBy: "1.1.1"
---

Continue working on a change by creating the next artifact.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run `openspec list --json` to get available changes sorted by most recently modified. Then use the **AskUserQuestion tool** to let the user select which change to work on.

   Present the top 3-4 most recently modified changes as options, showing:
   - Change name
   - Schema (from `schema` field if present, otherwise "spec-driven")
   - Status (e.g., "0/5 tasks", "complete", "no tasks")
   - How recently it was modified (from `lastModified` field)

   Mark the most recently modified change as "(Recommended)" since it's likely what the user wants to continue.

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Check current status**
   ```bash
   openspec status --change "<name>" --json
   ```
   Parse the JSON to understand current state. The response includes:
   - `schemaName`: The workflow schema being used (e.g., "spec-driven")
   - `artifacts`: Array of artifacts with their status ("done", "ready", "blocked")
   - `isComplete`: Boolean indicating if all artifacts are complete

   **If design.md exists and contains a populated `## Prerequisite Changes` table** (non-`n/a`):
   - Read the table from `openspec/changes/<change-name>/design.md`
   - For each declared prerequisite change:
     - Check if the change directory exists: `openspec status --change "<prereq-name>" --json 2>/dev/null`
     - **If the prereq exists**: parse artifact progress (e.g., `1/3` complete) and count open tasks
     - **If the prereq does not exist**: show `⚠ <prereq-name>: not yet created`
   - Show the parent change status first, then add a `Prerequisite Changes:` section with the prereq status summary
   - Example output:
     ```
     Change: my-feature
     Status: 2/3 artifacts complete
     
     Prerequisite Changes:
       - add-golang-support: 1/3 artifacts, 2 open tasks
       - ⚠ add-testing-framework: not yet created
     ```

3. **Act based on status**:

   ---

   **If all artifacts are complete (`isComplete: true`)**:
   - Congratulate the user
   - Show final status including the schema used
   - Suggest: "All artifacts created! You can now implement this change or archive it."
   - STOP

   ---

   **If artifacts are ready to create** (status shows artifacts with `status: "ready"`):
   - Pick the FIRST artifact with `status: "ready"` from the status output
   - Get its instructions:
     ```bash
     openspec instructions <artifact-id> --change "<name>" --json
     ```
   - Parse the JSON. The key fields are:
     - `context`: Project background (constraints for you - do NOT include in output)
     - `rules`: Artifact-specific rules (constraints for you - do NOT include in output)
     - `template`: The structure to use for your output file
     - `instruction`: Schema-specific guidance
     - `outputPath`: Where to write the artifact
     - `dependencies`: Completed artifacts to read for context
   - **Create the artifact file**:
     - Read any completed dependency files for context
     - Use `template` as the structure - fill in its sections
     - Apply `context` and `rules` as constraints when writing - but do NOT copy them into the file
     - Write to the output path specified in instructions
   - Show what was created and what's now unlocked
   - STOP after creating ONE artifact

   ---

   **If no artifacts are ready (all blocked)**:
   - This shouldn't happen with a valid schema
   - Show status and suggest checking for issues

4. **After creating an artifact, show progress**
   ```bash
   openspec status --change "<name>"
   ```

**Output**

After each invocation, show:
- Which artifact was created
- Schema workflow being used
- Current progress (N/M complete)
- What artifacts are now unlocked
- Prompt: "Want to continue? Just ask me to continue or tell me what to do next."

**Artifact Creation Guidelines**

The artifact types and their purpose depend on the schema. Use the `instruction` field from the instructions output to understand what to create.

Common artifact patterns:

**spec-driven schema** (proposal → specs → design):
- **proposal.md**: Ask user about the change if not clear. Fill in Why, What Changes, Capabilities, Impact.
  - The Capabilities section is critical - each capability listed will need a spec file.
  - After writing proposal.md: check `td` is initialized (`td init` if needed), create the change root feature issue (`td create "<change-name>" --type feature [--parent <epic-id>]`), create the change-level board (`td board create "<change-name>" --query "descendant_of(<change-id>)"`), and add frontmatter (`td-board`, `td-issue`) to proposal.md.

- **specs/<capability>/spec.md**: Create one spec per capability listed in the proposal's Capabilities section (use the capability name, not the change name).
  - After writing each spec.md:
    1. Create the spec feature issue: `td create "<capability>" --type feature --parent <change-id>`  → `<spec-id>`
    2. Create the spec-level board: `td board create "<change-name>-<capability>" --query "descendant_of(<spec-id>)"`
    3. Create a task issue per requirement: `td create "Implement: <req-name>" --type task --parent <spec-id>`  → collect all `<req-task-id>`s
     4. Create the **worker epic** for this capability (this is the ws root for the worker assigned to this tranche):
        ```bash
        td create "worker: <capability>" --type feature --parent <change-id> --labels "worker"
        # → <worker-epic-id>
        ```
     5. Create the **context & skill assignment prerequisite task** (see [Task Skill Assignment Pattern](#task-skill-assignment-pattern) for template):
        ```bash
        td create "Context & Skills: <capability>" \
          --type task \
          --parent <change-id> \
          --labels "skill:td-task-management,prerequisite" \
          --body "This is a prerequisite task. Complete this first, then proceed to implementation tasks.

**Instructions:**
1. **Provide context**: Read and understand specs/<capability>/spec.md. Paste its complete contents here.
2. **List all tasks without skills**: Run \`.ops/scripts/worker/tasks-without-skills.ts <worker-epic-id>\`
3. **Assign skills**: For each task, run \`td update <task-id> --labels 'skill:<skill-name>'\`
4. **Verify**: Run the script again to confirm all tasks have skills (should output empty \`[]\`)
5. **Mark complete** and proceed to implementation tasks"
        # → <context-task-id>
        ```
     6. Re-parent all requirement tasks under the worker epic:
        ```bash
        td update <req-task-id> --parent <worker-epic-id>   # repeat for each req task
        ```
     7. Link all issues to the spec file:
        ```bash
        td link <spec-id> specs/<capability>/spec.md --role reference
        td link <worker-epic-id> specs/<capability>/spec.md --role reference
        td link <req-task-id> specs/<capability>/spec.md --role reference   # each task
        td link <context-task-id> specs/<capability>/spec.md --role reference
        ```
     8. Add frontmatter (`td-board`, `td-issue`) to spec.md pointing to `<spec-id>`.

    **Worker epic purpose**: The orchestrator (`development-orchestrator`) dispatches a `worker` subagent via the **Task tool** (`subagent_type: "worker"`) for this capability. The worker receives `<worker-epic-id>` as its entry point, runs `td ws start "<capability>-worker"` then `td ws tag <worker-epic-id>`, uses `td context <worker-epic-id>` to load handoff state, and uses `td-next-task.ts <worker-epic-id>` (see [scripts/td-next-task.ts](../../../.ops/scripts/worker/td-next-task.ts)) to find its next task within the tranche.

  - **After creating all requirement tasks for each capability, run the rule-coverage audit** (see [Rule-Coverage Audit](#rule-coverage-audit) below).
  - **After the rule-coverage audit, run the quality tooling audit for this capability** (see [Quality Tooling Audit](#quality-tooling-audit) below).

- **design.md**: Document technical decisions, architecture, and implementation approach.
  - After writing design.md:
     1. Create task issues for cross-cutting work not tied to a specific spec: `td create "<task>" --type task --parent <change-id>` → collect all `<cross-task-id>`s
     2. Create the **cross-cutting worker epic** (ws root for the worker handling cross-cutting tasks):
        ```bash
        td create "worker: cross-cutting" --type feature --parent <change-id> --labels "worker"
        # → <cc-worker-epic-id>
        ```
     3. Create the **context & skill assignment prerequisite task** (see [Task Skill Assignment Pattern](#task-skill-assignment-pattern) for template):
        ```bash
        td create "Context & Skills: cross-cutting" \
          --type task \
          --parent <change-id> \
          --labels "skill:td-task-management,prerequisite" \
          --body "This is a prerequisite task. Complete this first, then proceed to implementation tasks.

**Instructions:**
1. **Provide context**: Read and understand design.md. Paste its complete contents here.
2. **List all tasks without skills**: Run \`.ops/scripts/worker/tasks-without-skills.ts <worker-epic-id>\`
3. **Assign skills**: For each task, run \`td update <task-id> --labels 'skill:<skill-name>'\`
4. **Verify**: Run the script again to confirm all tasks have skills (should output empty \`[]\`)
5. **Mark complete** and proceed to implementation tasks"
        # → <cc-context-task-id>
        ```
     4. Re-parent all cross-cutting tasks under the worker epic:
        ```bash
        td update <cross-task-id> --parent <cc-worker-epic-id>   # repeat for each task
        ```
     5. Link all cross-cutting tasks and the worker epic to design.md:
        ```bash
        td link <cc-worker-epic-id> design.md --role reference
        td link <cross-task-id> design.md --role reference   # each task
        td link <cc-context-task-id> design.md --role reference
        ```
     6. Add frontmatter (`td-board`, `td-issue`) to design.md pointing to the change root.

    **Note**: if a change has only one capability and no cross-cutting tasks, the single worker epic from the specs phase is sufficient — omit the cross-cutting worker epic.
  - **Populate the `component` frontmatter field** in design.md: look up the `## Catalog Entities` table. For each row where `Kind` is `Component` and `Action` is `create` or `existing`, find the entity file and read its first-line path comment (e.g. `# src/ops/workloads`) to get the repo-relative component path. Set `component` to that path (string for one, YAML list for multiple). If no Component entities are declared (`n/a`), omit the field.
  - **After creating all cross-cutting tasks, run the design-phase rule-coverage supplement** (see [Rule-Coverage Audit](#rule-coverage-audit) below).
  - **Then run the design-phase quality tooling supplement** (see [Quality Tooling Audit](#quality-tooling-audit) below).
  - **Then run the radar prerequisite check** (see [Radar Prerequisite Check](#radar-prerequisite-check) below).
  - **Then run the skill audit** (see [Skill Audit](#skill-audit) below).
  - **Then run the catalog entity audit** (see [Catalog Entity Audit](#catalog-entity-audit) below).
  - **Then run the prerequisite changes step** (see [Prerequisite Changes](#prerequisite-changes) below).

For other schemas, follow the `instruction` field from the CLI output.

---

## Task Skill Assignment Pattern

Every worker epic must follow a two-phase approach to task execution:

### Phase 1: Context & Skill Assignment (Prerequisite Task)

Before any implementation task is assigned to a worker subagent, the worker epic must have an initial prerequisite task that:

1. **Has the skill label**: `skill:td-task-management`
2. **Links to the relevant context document**: design.md (for cross-cutting) or spec.md (for capability-specific)
3. **Instructions**: The task instructs the worker to:
   - Provide the full contents of the linked context document as context for understanding the work
   - Run `.ops/scripts/worker/tasks-without-skills.ts <worker-epic-id>` to find all tasks in the epic without skill labels
   - Assign `skill:` labels to each task based on the requirements and context
   - Then proceed to work on implementation tasks

### Creating the Context & Skill Assignment Task

**For capability-specific worker epics** (created during specs phase):

After creating the worker epic and re-parenting all requirement tasks, create this prerequisite task:

```bash
td create "Context & Skills: <capability>" \
  --type task \
  --parent <change-id> \
  --labels "skill:td-task-management,prerequisite" \
  --body "This is a prerequisite task. Complete this first, then proceed to implementation tasks.

**Instructions:**

1. **Provide context**: Read and understand specs/<capability>/spec.md. Paste its complete contents here as context for understanding this capability's requirements.

2. **List all tasks in this epic without skill assignments**:
   - Run: \`.ops/scripts/worker/tasks-without-skills.ts <worker-epic-id>\`
   - This will output a JSON array of all tasks in this epic that lack a 'skill:' label

3. **Assign skills to each task**:
   - For each task returned by the script above, determine the appropriate skill(s) needed
   - Run: \`td update <task-id> --labels 'skill:<skill-name>'\` for each task
   - Examples of skill labels: \`skill:go-developer\`, \`skill:typescript\`, \`skill:orchestrator\`, etc.
   - Consult the design.md Agent Skills table and the task requirements to determine the right skill

4. **Verify completion**:
   - Run the script again: \`.ops/scripts/worker/tasks-without-skills.ts <worker-epic-id>\`
   - The output should be empty \`[]\` indicating all tasks now have skill labels

5. **Mark this task complete** and the worker can then proceed to work on implementation tasks"
```

**For cross-cutting worker epics** (created during design phase):

After creating the cross-cutting worker epic and re-parenting all cross-cutting tasks, create this prerequisite task:

```bash
td create "Context & Skills: cross-cutting" \
  --type task \
  --parent <change-id> \
  --labels "skill:td-task-management,prerequisite" \
  --body "This is a prerequisite task. Complete this first, then proceed to implementation tasks.

**Instructions:**

1. **Provide context**: Read and understand design.md. Paste its complete contents here as context for understanding cross-cutting work for this change.

2. **List all tasks in this epic without skill assignments**:
   - Run: \`.ops/scripts/worker/tasks-without-skills.ts <worker-epic-id>\`
   - This will output a JSON array of all tasks in this epic that lack a 'skill:' label

3. **Assign skills to each task**:
   - For each task returned by the script above, determine the appropriate skill(s) needed
   - Run: \`td update <task-id> --labels 'skill:<skill-name>'\` for each task
   - Examples of skill labels: \`skill:go-developer\`, \`skill:typescript\`, \`skill:orchestrator\`, etc.
   - Consult the design.md Agent Skills table and the task requirements to determine the right skill

4. **Verify completion**:
   - Run the script again: \`.ops/scripts/worker/tasks-without-skills.ts <worker-epic-id>\`
   - The output should be empty \`[]\` indicating all tasks now have skill labels

5. **Mark this task complete** and the worker can then proceed to work on implementation tasks"
```

### Phase 2: Implementation Tasks with Skills

After the context & skill assignment task is complete, all other tasks in the worker epic will have `skill:` labels assigned (see Phase 1). The worker then proceeds to implement tasks using the standard workflow:

- Run `.ops/scripts/worker/td-next-task.ts <worker-epic-id>` to find the next actionable task
- The script validates that the task has a `skill:` label before returning it
- Worker proceeds to implement the task with the assigned skill

### Task Creation Template with Skills

When creating any task (specs-phase, cross-cutting, gates, audits, etc.), follow this pattern:

**For tasks that will have explicit skills assigned in Phase 1:**
```bash
# No skill label at creation time — will be assigned in Phase 1 task
td create "<task-title>" --type task --parent <parent-id> --body "..."
```

**For tasks that are created with a predefined skill (e.g., research, audit, gate tasks):**
```bash
# Add skill label at creation time for tasks that won't go through Phase 1
td create "<task-title>" --type task --parent <parent-id> --labels "skill:<skill-name>" --body "..."
```

Examples of tasks that should have skills at creation:
- Research tasks: `--labels "skill:td-task-management"`
- Skill audit tasks: `--labels "skill:td-task-management"`
- Catalog/Backstage tasks: `--labels "skill:dev-portal-manager"`
- Quality tooling gate tasks: `--labels "skill:devops-automation"`

---

## Rule-Coverage Audit

The rule-coverage audit ensures that pattern rules exist for every domain a capability touches. It runs twice per change: once during the specs phase (per capability), and once during the design phase (for cross-cutting concerns). Missing rules become research tasks that gate their dependent implementation tasks via `td dep add`.

### Reference Document

The canonical list of pattern domains is at `.opencode/rules/patterns/README.md`.

If this file does not exist, warn:
> "⚠ Rule-coverage audit skipped: `.opencode/rules/patterns/README.md` not found. Create this file to enable rule-coverage auditing."

Then continue without creating research tasks.

### Specs Phase Audit (per capability)

After creating all requirement tasks for a capability:

1. **Identify relevant pattern domains** for this capability by reading its spec and consulting the trigger conditions in `.opencode/rules/patterns/README.md`. Common mappings:
   - Capability involves any code → `code/testing`, `code/naming`
   - Capability exposes or consumes HTTP/gRPC → `architecture/api-design`
   - Capability introduces new modules/layers → `architecture/boundaries`
   - Capability handles errors or failures → `code/error-handling`
   - Capability uses queues/events → `architecture/async-messaging`
   - Capability stores data → `architecture/data-modeling`
   - Capability runs in production → `delivery/observability`

2. **For each relevant domain**, check whether the rule file exists:
   ```bash
   ls .opencode/rules/patterns/<layer>/<domain>.md 2>/dev/null
   ```

3. **If the rule file EXISTS**: link it to each requirement task that benefits from it:
   ```bash
   td link <req-task-id> .opencode/rules/patterns/<layer>/<domain>.md --role reference
   ```

4. **If the rule file is MISSING**: create a research task.

   First, ensure the `td-research` feature issue exists under the change root:
   ```bash
   # Only create once per change — check if it already exists first
   td create "research: <change-name>" --type feature --parent <change-root-id>
   # Capture: td-research-id
   ```

    Then create the research task:
    ```bash
    td create "Create rule: patterns/<layer>/<domain>.md" \
      --type task \
      --parent <td-research-id> \
      --labels "skill:td-task-management" \
      --body "Needed by: <capability-name> capability
    Triggered by: <what in the capability requires this pattern>
    Canonical ref: .opencode/rules/patterns/README.md#<domain>
    Sources: <source literature from canonical README entry>"
    # Capture: td-research-task-id
    ```

   Wire the dependency from each affected requirement task:
   ```bash
   td dep add <req-task-id> <td-research-task-id>
   ```

   **De-duplicate**: if a research task for this domain was already created earlier in the same change (e.g., from a prior capability), reuse the existing research task ID — do not create a duplicate.

5. **Show audit summary** after each capability:
   ```
   Rule coverage for <capability>:
     ✓ code/testing (exists)
     ✓ code/error-handling (exists)
     ⚠ architecture/api-design (missing) → research task td-xxxxx created, blocks td-yyyyy, td-zzzzz
   ```

### Design Phase Audit (supplement)

After creating cross-cutting tasks from design.md:

1. **Review the `## Technology Adoption & Usage Rules` table** in design.md. For each technology listed, identify implied pattern domains using the trigger conditions.

2. **Review explicit pattern decisions** in the design (e.g., "we use REST", "we use message queues", "we deploy to AWS").

3. **For each implied domain**:
   - If already covered by a specs-phase research task or existing rule: skip.
   - If newly identified and missing: create a research task (same process as specs phase) and wire as dependency to affected cross-cutting tasks.

4. **Show supplement summary**:
   ```
   Design-phase rule-coverage supplement:
     ✓ delivery/ci-cd (already covered by research task td-xxxxx)
     ⚠ operations/security (missing, not caught in specs phase) → research task td-aaaaa created, blocks td-bbbbb
   ```

### After Rule Creation (post-research)

When a worker closes a research task (the rule file now exists), they SHOULD link the rule file to the requirement tasks that depended on it:
```bash
td link <req-task-id> .opencode/rules/patterns/<layer>/<domain>.md --role reference
```

This completes the two-way linkage so future workers see the rule in `td show <req-task-id>`.

---

---

## Skill Audit

Evaluates whether this change requires agent skills to be created or updated. Runs once after design.md is complete.

**Purpose**: Skills encode how agents behave with technologies/workflows. Distinct from rules (which govern code) — skills govern agent behavior.

**Process**:
1. Review the `## Agent Skills` table in design.md
2. For each row with `create` or `update` action:
   - Check if `.opencode/skills/<skill-name>/SKILL.md` exists
   - Create task if missing: `td create "Skill: create/update <skill-name>" --type task --parent <change-root-id> --labels "skill:dev-portal-manager"`
   - Link to design.md: `td link <task-id> design.md --role reference`
3. Show summary of skills created/updated

**Output example**:
```
Skill audit:
  ⚠ create .opencode/skills/dev-portal-manager/SKILL.md → task td-xxxxx created
  ✓ update .opencode/skills/platform-architect/SKILL.md → task td-yyyyy exists
```

**If `## Agent Skills` table absent**: warn and skip ("⚠ Skill audit skipped: table not found in design.md")

---

## Quality Tooling Audit

Ensures every technology has comprehensive tooling (linting, formatting, testing) in CI. Missing tooling → parallel OpenSpec changes + gate tasks. See [Quality Tooling Pattern Rules](../../rules/patterns/delivery/quality-tooling.md).

**Specs Phase** (per capability):
1. Identify technologies from capability spec
2. Check for linting, formatting, testing in CI
3. If all exist: link rule to requirement tasks
4. If missing: create parallel changes (`openspec new change "add-<tech>-<kind>"`), then gate task (`skill:devops-automation`, de-duplicate per tech)
5. Show summary per capability

**Design Phase** (supplement):
1. Review Technology Adoption table for un-audited technologies
2. Repeat specs-phase check; de-duplicate gate tasks
3. Show supplement summary

**Guardrails**: Run after rule-coverage audit (specs and design phases). Create parallel changes if tooling missing — do not defer. Gate tasks block completion only, not implementation.

---

## Radar Prerequisite Check

Ensures every dependency in Technology Adoption table either exists in Tech Radar (ring Adopt) or has a prerequisite change. Runs after `## Technology Adoption & Usage Rules` populated.

**Process**:
1. For each non-`n/a` row in Technology Adoption table:
   - **In Adopt ring**: report `✓` and continue
   - **In Trial/Assess/Hold**: report `⚠` (no action — ring progression is human-driven)
   - **Not in radar, existing change found**: create gate task linking to prereq change
   - **Not in radar, no existing change**: spawn `adopt-<tech-kebab>` change + gate task
2. De-duplicate gate tasks; link all to design.md

**Guardrails**: Not optional. Skip `n/a` rows. Gate task title format MUST be `Gate: <prereq-name> complete`. Case-insensitive tech name matching. If `docs/tech-radar.json` absent, warn and skip.

---

## Catalog Entity Audit

Ensures catalog entities exist for every new component/tool/service. Runs after radar check. Use `dev-portal-manager` skill.

**Process**:
1. Read `## Catalog Entities` table from design.md
2. For `create` rows: check if `.entities/<kind>-<name>.yaml` exists; create task if absent
3. For `existing` rows: verify file exists; warn if absent
4. If table is `n/a`: apply heuristics (new `src/` dir, new packages in devbox.json, new `.github/workflows/` files); create review task if any fire (max one per change)
5. For each Component: create 3 standard Backstage tasks (ADR annotation, TechDocs scaffold, TechDocs content) — all post-archive

**Guardrails**: Not optional. Skip if table absent (warn). ADR, TechDocs, and content tasks created for every Component (not conditional). Backstage tasks at design time (full board visibility of post-archive work).

---

## Prerequisite Changes

Spawns, gates, and announces emergent changes declared in design. Runs after catalog audit. For each non-`n/a` row in `## Prerequisite Changes` table in design.md:

1. Check if change directory exists; spawn if not (`openspec new change "<prereq-name>"`)
2. Create gate task (de-duplicate): `Gate: <prereq-name> complete`
3. Link gate task to design.md

**Guardrails**: Not optional. Skip if table absent (warn). Gate title format MUST be exact (`Gate: <prereq-name> complete`) for orchestrator to find gates. De-duplicate gate tasks.

---

**Guardrails**
- Create ONE artifact per invocation
- Always read dependency artifacts before creating a new one
- Never skip artifacts or create out of order
- If context is unclear, ask the user before creating
- Verify the artifact file exists after writing before marking progress
- Use the schema's artifact sequence, don't assume specific artifact names
- **IMPORTANT**: `context` and `rules` are constraints for YOU, not content for the file
  - Do NOT copy `<context>`, `<rules>`, `<project_context>` blocks into the artifact
  - These guide what you write, but should never appear in the output
- **Rule-coverage audit is not optional** — run it after every specs capability and after design. If the canonical document is absent, warn and skip — do not silently omit.
- **Quality tooling audit is not optional** — run it after the rule-coverage audit for each specs capability and after the design-phase supplement. If tooling is missing, create parallel changes — do not defer.
- **Radar prerequisite check is not optional** — run it after the `## Technology Adoption & Usage Rules` table is populated during design authoring. If `docs/tech-radar.json` is absent, warn and skip.
- **Skill audit is not optional** — run it after the radar prerequisite check. If the `## Agent Skills` table is absent, warn and skip — do not silently omit.
- **Catalog entity audit is not optional** — run it after the skill audit. If the `## Catalog Entities` table is absent, warn and skip — do not silently omit. When entities are present, ADR annotation, TechDocs scaffolding, TecDocs content, and Tech Radar tasks are always created.
- **Prerequisite changes step is not optional** — run it after the catalog entity audit. If the `## Prerequisite Changes` table is absent from design.md, warn and skip.
