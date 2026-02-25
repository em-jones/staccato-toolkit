---
td-board: initialize-dagger-devops-devops-automation-skill
td-issue: td-9f86dd
---

# Specification: devops-automation-skill

## Overview

Defines the `devops-automation` agent skill that guides developers and agents in managing and maintaining dagger tooling within this repository.

## ADDED Requirements

### Requirement: Skill file exists at expected path

A skill file SHALL exist at `.opencode/skills/devops-automation/SKILL.md`. It SHALL be discoverable by the agent skills loader and follow the skill file format used by other skills in this repository.

#### Scenario: Skill file is found at correct path

- **WHEN** an agent lists available skills
- **THEN** `devops-automation` appears as an available skill
- **THEN** its SKILL.md is at `.opencode/skills/devops-automation/SKILL.md`

### Requirement: Skill documents how to add a new dagger task

The skill SHALL include a step-by-step procedure for adding a new dagger task function to the module, including: where to add the function, naming conventions, how to write the unit test, how to expose it in the GitHub Actions workflow, and how to update the devops-automation-skill documentation.

#### Scenario: Agent follows skill to add a new task

- **WHEN** an agent loads the devops-automation skill and is asked to add a new CI task
- **THEN** it finds unambiguous instructions for: file location, function signature, test file location, workflow job addition, and skill update
- **THEN** the resulting code passes lint and tests without additional guidance

### Requirement: Skill documents how to modify or remove an existing dagger task

The skill SHALL describe how to modify a task's behavior and how to remove a task, including: updating the function, updating its tests, removing the corresponding workflow job, and updating the skill documentation.

#### Scenario: Agent follows skill to modify a task

- **WHEN** a task's behavior changes
- **THEN** the skill guides the agent to update the function, update unit and integration tests, and verify CI still passes

#### Scenario: Agent follows skill to remove a task

- **WHEN** a task is no longer needed
- **THEN** the skill guides the agent to delete the function, delete its tests, remove the workflow job, and update documentation

### Requirement: Skill documents repository layout for dagger code

The skill SHALL describe the exact directory structure for dagger code in this repository, consistent with the layout established in `dagger-language-and-layout`.

#### Scenario: Skill provides directory map

- **WHEN** an agent reads the devops-automation skill
- **THEN** it finds a directory tree showing where module files, task files, and test files are located
- **THEN** the paths match the actual repository structure

### Requirement: Skill documents how to run dagger tasks locally

The skill SHALL explain how to run any dagger task locally using devbox, including the commands needed and any environment setup.

#### Scenario: Developer runs a task locally following skill instructions

- **WHEN** a developer follows the "running locally" section of the skill
- **THEN** they can invoke `dagger call <task>` successfully from a devbox shell
- **THEN** no other setup is required beyond `devbox shell`
