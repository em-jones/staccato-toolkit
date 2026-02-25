---
td-board: openspec-execute-phase-openspec-execute
td-issue: td-52df69
---

# Specification: openspec-execute

## Overview

Defines the required behaviour of the new `openspec-execute` skill, which unifies task implementation and review into a single looping execute phase. Replaces `openspec-apply-change` and `openspec-verify-change`.

## ADDED Requirements

### Requirement: Discover and implement ready tasks

The skill SHALL load the td board from `proposal.md` frontmatter and identify all tasks in `open` or `in_progress` status, then implement each one using the td task lifecycle.

#### Scenario: Tasks exist on the board

- **WHEN** the agent loads the board and finds tasks with `open` or `in_progress` status
- **THEN** the agent SHALL call `td next` to select the highest-priority ready task
- **THEN** the agent SHALL call `td start <id>` before beginning implementation
- **THEN** the agent SHALL implement the required changes and log meaningful progress with `td log`

#### Scenario: No tasks found on board

- **WHEN** the board is empty or all tasks are already `closed`
- **THEN** the skill SHALL report that all tasks are complete and suggest archiving the change

### Requirement: Handoff and submit for review on task completion

The skill SHALL instruct the agent to call `td handoff` with `--done` and `--remaining` flags immediately before calling `td review <id>` to submit an implemented task for review.

#### Scenario: Implementation complete, submitting for review

- **WHEN** the agent has finished implementing a task
- **THEN** the agent SHALL call `td handoff <id> --done "<what was implemented>" --remaining "none"` (with `--decision "<key decision>"` if applicable)
- **THEN** the agent SHALL call `td review <id>`

#### Scenario: Handoff content is specific and actionable

- **WHEN** the agent writes `--done` and `--remaining` values
- **THEN** the values SHALL accurately reflect actual work and genuine remaining concerns, not generic placeholder text

### Requirement: Review tasks in a separate session

The skill SHALL instruct the agent to treat the review of `in_review` tasks as a distinct context from implementation, requiring a fresh agent session or an explicit reviewer mode switch.

#### Scenario: Tasks are in review, reviewer session begins

- **WHEN** one or more tasks are in `in_review` status
- **THEN** the agent SHALL adopt reviewer mode — reading the implementation against specs/design with fresh context, not as the implementer
- **THEN** the agent SHALL NOT attempt to review tasks it implemented in the same session (enforced by `td` CLI)

#### Scenario: td CLI blocks self-review

- **WHEN** the agent calls `td close <id>` on a task it started in the same session
- **THEN** the `td` CLI SHALL return an error
- **THEN** the agent SHALL treat this as a signal to defer review to a separate session

### Requirement: Approve tasks with handoff

The skill SHALL instruct the reviewing agent to call `td handoff` before approving (closing) a task, recording what was verified.

#### Scenario: Reviewer approves a task

- **WHEN** the reviewer has verified the implementation against specs and design and found no critical issues
- **THEN** the agent SHALL call `td handoff <id> --done "Verified: <summary of what was confirmed>" --remaining "none"`
- **THEN** the agent SHALL call `td close <id>` to approve the task

### Requirement: Reject tasks with actionable handoff

The skill SHALL instruct the reviewing agent to call `td handoff` before rejecting a task, with `--remaining` containing specific, actionable issues the implementer's next session can act on directly.

#### Scenario: Reviewer rejects a task

- **WHEN** the reviewer finds critical issues in the implementation
- **THEN** the agent SHALL call `td handoff <id> --done "Review complete, rejected" --remaining "<specific actionable issues>"`
- **THEN** the agent SHALL call `td start <id>` to return the task to `in_progress`

#### Scenario: Rejection handoff enables retry without re-reading full context

- **WHEN** a new agent session picks up a rejected task
- **THEN** the `--remaining` field from the rejection handoff SHALL be sufficient context to understand what needs to be fixed without re-reading the entire conversation history

### Requirement: Loop until all tasks closed or blocked

The skill SHALL continue the implement→review cycle until all board tasks reach `closed` status, or stop and report clearly if a blocker is encountered.

#### Scenario: All tasks closed

- **WHEN** all tasks on the board are in `closed` status
- **THEN** the skill SHALL report implementation complete and suggest archiving the change

#### Scenario: Blocker encountered

- **WHEN** the agent cannot proceed on a task due to an unresolvable issue
- **THEN** the agent SHALL call `td log --blocker "<reason>"`
- **THEN** the skill SHALL pause and report the blocker, waiting for user guidance before continuing
