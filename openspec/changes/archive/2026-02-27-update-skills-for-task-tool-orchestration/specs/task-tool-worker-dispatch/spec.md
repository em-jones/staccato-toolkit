---
td-board: update-skills-for-task-tool-orchestration-task-tool-worker-dispatch
td-issue: td-9fe132
---

# Specification: Task Tool Worker Dispatch

## Overview

Defines the canonical protocol for dispatching worker subagents using Claude's `Task` tool (`mcp_task`) within the OpenSpec orchestration skills. This replaces ambiguous prose about "launching agents" with a concrete, typed invocation contract.

## ADDED Requirements

### Requirement: Task tool invocation format for worker dispatch

The `development-orchestration` skill SHALL dispatch each worker stream by invoking the `Task` tool with `subagent_type: "worker"`, a descriptive `description` field, and a `prompt` containing the board name and skill load instruction.

#### Scenario: Dispatching a worker for a capability stream

- **WHEN** the orchestrator identifies a capability board with open tasks
- **THEN** it SHALL call the `Task` tool with:
  - `subagent_type: "worker"`
  - `description: "Implement <change-name>-<capability> tasks"` (5-10 words)
  - `prompt` containing only: the assigned board name and the instruction to load `openspec-execute`

#### Scenario: No prompt content beyond board name and skill reference

- **WHEN** the orchestrator constructs the worker prompt
- **THEN** the prompt SHALL NOT include artifact content, other board names, or implementation details — only the board name and skill reference

### Requirement: subagent_type selection rules

The orchestration skills SHALL use `subagent_type: "worker"` for implementation workers and MAY use `subagent_type: "general"` for orchestration-level subagents when needed.

#### Scenario: Worker agent for implementation tasks

- **WHEN** dispatching an agent to implement tasks on a capability board
- **THEN** `subagent_type` SHALL be `"worker"`

#### Scenario: General agent for orchestration subtasks

- **WHEN** the orchestrator needs a subagent for non-implementation work (e.g., artifact authoring delegation)
- **THEN** `subagent_type` SHALL be `"general"`

### Requirement: description field conventions for Task tool calls

Every `Task` tool invocation SHALL include a `description` field of 5-10 words that identifies the stream being processed.

#### Scenario: Description for worker dispatch

- **WHEN** invoking the `Task` tool for a worker
- **THEN** `description` SHALL follow the pattern: `"Implement <change-name>-<capability> tasks"` or `"Implement <capability> capability tasks"`

### Requirement: parallel dispatch protocol using Task tool

Multiple capability streams SHALL be dispatched as simultaneous `Task` tool calls in a single message — one per stream.

#### Scenario: Parallel worker dispatch for multiple streams

- **WHEN** two or more capability boards have open tasks
- **THEN** the orchestrator SHALL issue all `Task` tool calls in the same message (not sequentially)

#### Scenario: Single stream dispatch

- **WHEN** only one capability board has open tasks
- **THEN** a single `Task` tool call SHALL still be used (for context isolation)
