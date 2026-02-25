---
td-board: openspec-branching-prerequisite-changes-prerequisite-change-status
td-issue: td-5b7472
---

# Specification: prerequisite-change-status

## Overview

Extends the skill-driven status narration so that when a change has declared prerequisite changes, `openspec status` output is supplemented with the artifact progress and open gate task count for each prerequisite. The `development-orchestration` skill's completion gate is also updated to check for open gate tasks before declaring ready-to-archive.

## ADDED Requirements

### Requirement: Skills narrate prerequisite change status alongside the parent

When checking change status in the `openspec-continue-change`, `openspec-ff-change`, or `development-orchestration` skills, if the parent change's `design.md` contains a non-`n/a` `## Prerequisite Changes` table, the skill SHALL query each named prerequisite's artifact status and surface it in the status output.

#### Scenario: Parent change has declared prerequisites

- **WHEN** the skill runs `openspec status --change <parent>` and `design.md` contains a populated `## Prerequisite Changes` table
- **THEN** the skill also runs `openspec status --change <prereq-name>` for each declared prerequisite
- **THEN** the output includes a `Prerequisite Changes:` section listing: prereq name, artifact progress (e.g., `1/3`), and open task count
- **THEN** the parent change status is shown first, followed by the prerequisite section

#### Scenario: Prerequisite change does not yet exist

- **WHEN** a prerequisite is declared in `design.md` but its change directory has not been created yet
- **THEN** the skill shows: `⚠ <prereq-name>: not yet created`
- **THEN** the skill does not error or stop

#### Scenario: Parent change has no prerequisites

- **WHEN** the `## Prerequisite Changes` table contains only `n/a`
- **THEN** the status output is unchanged from the current behaviour
- **THEN** no `Prerequisite Changes:` section is shown

### Requirement: development-orchestration completion gate checks for open prerequisite gate tasks

At the completion step (Step 6), the `development-orchestration` skill SHALL check for open `Gate:` tasks on the change board before displaying "Ready to archive".

#### Scenario: Open gate tasks remain when all implementation tasks close

- **WHEN** all implementation and catalog tasks across all worker streams are closed
- **AND** one or more tasks with titles matching `Gate:` remain open on the change board
- **THEN** the orchestrator SHALL NOT display "Ready to archive"
- **THEN** it SHALL display: `⚠ Implementation complete but prerequisite gate tasks remain open:` followed by the list of open gate tasks with their prereq change names
- **THEN** it SHALL prompt the architect to archive the prerequisite changes first, then close the gate tasks manually

#### Scenario: All tasks including gate tasks are closed

- **WHEN** all tasks including `Gate:` tasks are closed on the change board
- **THEN** the existing "Execution Complete / Ready to archive" logic is unchanged

#### Scenario: No gate tasks exist

- **WHEN** the board contains no tasks with titles matching `Gate:`
- **THEN** the existing completion logic is unchanged

