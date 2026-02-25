---
td-board: update-skills-for-task-tool-orchestration-orchestration-worker-protocol
td-issue: td-752d7a
---

# Specification: Orchestration Worker Protocol

## Overview

Defines the required skill-level changes to align all four OpenSpec orchestration skills with the Task tool worker dispatch protocol. Each skill file must be updated to reference the `Task` tool explicitly rather than using abstract prose about launching or dispatching agents.

## MODIFIED Requirements

### Requirement: Update development-orchestration worker dispatch section

The `development-orchestration` skill's Step 5b SHALL describe worker dispatch using the `Task` tool with `subagent_type: "worker"`, replacing the current prose description of "Launch one `worker` agent per stream simultaneously."

#### Scenario: Dispatch section uses Task tool language

- **WHEN** a reader follows Step 5b of `development-orchestration`
- **THEN** they SHALL see a concrete example of a `Task` tool call with `subagent_type: "worker"`, `description`, and `prompt` fields
- **AND** the example prompt SHALL contain only the board name and `openspec-execute` skill reference

#### Scenario: Catalog task dispatch uses Task tool

- **WHEN** open `Catalog:` tasks remain after implementation streams complete
- **THEN** the skill SHALL describe dispatching a worker via the `Task` tool (not prose "dispatch a worker")

### Requirement: Update openspec-execute role description

The `openspec-execute` skill's Role section SHALL clarify that it is invoked by a `Task` tool call with `subagent_type: "worker"` from the orchestrator.

#### Scenario: Role section references Task tool invocation

- **WHEN** a reader reads the Role section of `openspec-execute`
- **THEN** they SHALL understand the skill runs inside a `worker` subagent spawned via the `Task` tool

### Requirement: Update openspec-ff-change worker epic references

The `openspec-ff-change` skill's worker epic note (step 4b2) SHALL be updated to align with Task tool dispatch: the worker epic is the entry point for a `Task`-dispatched worker subagent.

#### Scenario: Worker epic note references Task tool

- **WHEN** a reader reads step 4b2 of `openspec-ff-change`
- **THEN** the worker epic purpose note SHALL reference that workers are dispatched via the `Task` tool with `subagent_type: "worker"`

### Requirement: Update openspec-continue-change worker epic purpose note

The `openspec-continue-change` skill's Worker epic purpose note SHALL be updated to clarify that the orchestrator dispatches workers via the `Task` tool.

#### Scenario: Worker epic purpose note references Task tool

- **WHEN** a reader reads the Worker epic purpose note in `openspec-continue-change`
- **THEN** the note SHALL state workers are spawned via the `Task` tool with `subagent_type: "worker"` (not via an unspecified mechanism)
