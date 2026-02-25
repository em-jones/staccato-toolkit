---
td-board: td-handoff-in-apply-verify-openspec-apply-change
td-issue: td-d51419
---

# Specification: openspec-apply-change

## Overview

Delta spec for the `openspec-apply-change` skill. Adds a mandatory `td handoff` step immediately before submitting a task for review, ensuring session context is preserved across agent boundaries.

## ADDED Requirements

### Requirement: Handoff before review submission

The skill SHALL instruct the agent to run `td handoff <id>` with `--done` and `--remaining` flags immediately before calling `td review <id>` to submit a task for review.

#### Scenario: Task implementation complete, submitting for review

- **WHEN** the agent has finished implementing an issue and is about to call `td review <id>`
- **THEN** the agent SHALL first call `td handoff <id> --done "<summary of what was implemented>" --remaining "none"` (with optional `--decision` if a key decision was made)
- **THEN** the agent SHALL call `td review <id>` to submit the task

#### Scenario: Handoff content is specific, not boilerplate

- **WHEN** the agent writes the `--done` and `--remaining` values
- **THEN** the values SHALL accurately reflect the actual work completed and any genuine remaining concerns, not generic placeholder text
