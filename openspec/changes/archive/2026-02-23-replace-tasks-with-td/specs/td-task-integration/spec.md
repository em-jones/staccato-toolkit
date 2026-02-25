---
td-board: replace-tasks-with-td-td-task-integration
td-issue: ~
---

## ADDED Requirements

### Requirement: Change root issue created at proposal time

When authoring `proposal.md`, the agent SHALL create a `td` feature issue representing the change as a whole, optionally parented under an externally-provided epic.

The agent SHALL then:
- Create a change-level board: `td board create "<change-name>" "descendant_of(<change-id>)"`
- Add frontmatter to `proposal.md`:
  ```yaml
  td-board: <change-name>
  td-issue: <change-id>
  ```

#### Scenario: Proposal authored without an epic

- **WHEN** the agent authors `proposal.md` and no epic id is provided
- **THEN** the agent creates `td create "<change-name>" --type feature` and records the returned id in `proposal.md` frontmatter as `td-issue`

#### Scenario: Proposal authored with an epic

- **WHEN** the agent authors `proposal.md` and an epic id is provided
- **THEN** the agent creates `td create "<change-name>" --type feature --parent <epic-id>` and records the returned id in `proposal.md` frontmatter as `td-issue`

#### Scenario: Change-level board created

- **WHEN** the change root issue is created
- **THEN** the agent runs `td board create "<change-name>" "descendant_of(<change-id>)"` before proceeding

---

### Requirement: Spec feature issue and requirement tasks created at spec authoring time

When authoring `specs/<capability>/spec.md`, the agent SHALL create a `td` feature issue representing the spec, parented under the change root issue. For each requirement written in the spec, the agent SHALL create a `td` task issue parented under the spec feature issue.

The agent SHALL then:
- Create a spec-level board: `td board create "<change-name>-<capability>" "descendant_of(<spec-id>)"`
- Link the spec feature issue and all requirement task issues to the spec file: `td link <id> specs/<capability>/spec.md --role reference`
- Add frontmatter to `spec.md`:
  ```yaml
  td-board: <change-name>-<capability>
  td-issue: <spec-id>
  ```

#### Scenario: Spec feature issue created

- **WHEN** the agent begins authoring a spec for capability `<capability>`
- **THEN** the agent creates `td create "<capability>" --type feature --parent <change-id>` before writing any requirements

#### Scenario: Requirement task created per requirement

- **WHEN** the agent writes a `### Requirement: <name>` block in `spec.md`
- **THEN** the agent creates `td create "Implement: <name>" --type task --parent <spec-id>` and links it: `td link <task-id> specs/<capability>/spec.md --role reference`

#### Scenario: Spec-level board created

- **WHEN** the spec feature issue is created
- **THEN** the agent runs `td board create "<change-name>-<capability>" "descendant_of(<spec-id>)"`

#### Scenario: Spec feature linked to artifact

- **WHEN** all requirement tasks for a spec have been created
- **THEN** the agent runs `td link <spec-id> specs/<capability>/spec.md --role reference`

---

### Requirement: Cross-cutting tasks created at design authoring time

When authoring `design.md`, the agent SHALL create `td` task issues for each cross-cutting implementation task identified — tasks that do not belong to any single spec requirement. These SHALL be parented under the change root issue.

The agent SHALL link each cross-cutting task to `design.md` and add frontmatter pointing back to the change root.

#### Scenario: Cross-cutting task created from design

- **WHEN** the agent identifies a cross-cutting implementation task in `design.md`
- **THEN** the agent creates `td create "<task>" --type task --parent <change-id>` and runs `td link <task-id> design.md --role reference`

#### Scenario: Design frontmatter written

- **WHEN** the agent finishes authoring `design.md`
- **THEN** `design.md` contains frontmatter:
  ```yaml
  td-board: <change-name>
  td-issue: <change-id>
  ```

---

### Requirement: Apply phase uses td board for task selection and progress

The apply skill SHALL NOT read `tasks.md`. Instead, it SHALL read `td-board` and `td-issue` from `proposal.md` frontmatter to identify the change board, then use `td` commands to drive the implementation loop.

#### Scenario: Apply loop starts

- **WHEN** the apply skill begins work on a change
- **THEN** it reads `proposal.md` frontmatter to get `td-board` and `td-issue`, then runs `td board show "<td-board>"` to display remaining work

#### Scenario: Agent picks next task

- **WHEN** the apply skill selects the next task to implement
- **THEN** it runs `td next` to get the highest-priority open issue, then `td start <id>` before beginning implementation

#### Scenario: Agent records progress mid-task

- **WHEN** the agent makes progress on a task or encounters a decision or blocker
- **THEN** it runs `td log "<message>"` (with `--decision`, `--blocker`, or other flags as appropriate)

#### Scenario: Agent completes a task

- **WHEN** the agent finishes implementing a task
- **THEN** it runs `td review <id>` to submit for review, or `td close <id>` for minor tasks

#### Scenario: Apply board is empty

- **WHEN** the apply skill runs `td board show "<td-board>"` and the board returns no issues
- **THEN** the skill surfaces a warning: "No td issues found on board <td-board>. Were td issues created during spec and design authoring?"

---

### Requirement: Verify phase checks td board for completeness

The verify skill's completeness check SHALL use `td board show "<change-name>"` and flag any issues not in `closed` status as incomplete, rather than parsing `tasks.md` checkboxes.

#### Scenario: All issues closed

- **WHEN** verify runs `td board show "<change-name>"` and all issues are in `closed` status
- **THEN** completeness check passes with no issues

#### Scenario: Open issues remain

- **WHEN** verify runs `td board show "<change-name>"` and one or more issues are not in `closed` status
- **THEN** verify adds a CRITICAL issue for each non-closed issue: "Incomplete task: <title> (<status>)"

---

### Requirement: Archive phase guards on open td issues

The archive skill SHALL check `td board show "<change-name>"` for non-closed issues before proceeding. If open issues are found, it SHALL warn the user and require confirmation before archiving.

#### Scenario: Archive with open issues

- **WHEN** the archive skill finds non-closed issues on the change board
- **THEN** it displays the count and titles of open issues and prompts the user to confirm before proceeding

#### Scenario: Archive with all issues closed

- **WHEN** the archive skill finds no open issues on the change board
- **THEN** it proceeds without a task-completion warning

---

### Requirement: td initialized before first use

Before creating any `td` issues for a change, the agent SHALL verify that `td` is initialized. If not, it SHALL run `td init` before proceeding.

#### Scenario: td not initialized

- **WHEN** the agent attempts to run a `td` command and receives an error indicating the database is missing
- **THEN** the agent runs `td init` and retries the original command

#### Scenario: td already initialized

- **WHEN** the agent runs a `td` command and it succeeds
- **THEN** the agent proceeds without running `td init`
