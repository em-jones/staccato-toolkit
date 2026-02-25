---
td-board: td-handoff-in-apply-verify-openspec-verify-change
td-issue: td-5842ed
---

# Specification: openspec-verify-change

## Overview

Delta spec for the `openspec-verify-change` skill. Adds mandatory `td handoff` steps before both task approval and task rejection, ensuring review decisions and reasoning are preserved for the next session.

## ADDED Requirements

### Requirement: Handoff before task approval

The skill SHALL instruct the agent to run `td handoff <id>` immediately before closing (approving) a task, recording what was verified and confirming no remaining concerns.

#### Scenario: Reviewer approves a task

- **WHEN** the reviewer has verified the implementation and is about to approve (close) a task
- **THEN** the agent SHALL first call `td handoff <id> --done "Verified: <summary of what was confirmed>" --remaining "none"`
- **THEN** the agent SHALL call `td close <id>` to approve the task

### Requirement: Handoff before task rejection

The skill SHALL instruct the agent to run `td handoff <id>` immediately before rejecting a task and returning it to `in_progress`, recording the specific issues found so the implementer's next session has clear context.

#### Scenario: Reviewer rejects a task with issues

- **WHEN** the reviewer finds issues and is about to reject a task (return it to `in_progress`)
- **THEN** the agent SHALL first call `td handoff <id> --done "Review complete, rejected" --remaining "<specific issues that must be fixed>"`
- **THEN** the agent SHALL return the task to `in_progress` (via `td start <id>` or equivalent)

#### Scenario: Rejection handoff captures actionable feedback

- **WHEN** the agent writes the `--remaining` value for a rejection handoff
- **THEN** the value SHALL describe specific, actionable issues rather than vague feedback (e.g., "Missing error handling in the reject path of verify skill" not "needs work")
