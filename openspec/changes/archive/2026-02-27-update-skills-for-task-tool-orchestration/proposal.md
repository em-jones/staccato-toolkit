---
td-board: update-skills-for-task-tool-orchestration
td-issue: td-10faac
---

# Proposal: Update OpenSpec Skills to Use Task Tool for Worker Orchestration

## Why

The OpenSpec orchestration skills (`development-orchestration`, `openspec-execute`, `openspec-ff-change`, `openspec-continue-change`) describe worker dispatch using vague prose ("launch a worker agent", "dispatch workers in parallel"), leaving the actual invocation mechanism undefined. Claude's `Task` tool provides a structured, typed mechanism for spawning subagents with specific `subagent_type` values (`worker`, `general`, `explore`). Updating the skills to explicitly use the `Task` tool ensures workers are dispatched correctly with proper parallelism and context isolation.

## What Changes

- Update `development-orchestration` skill: replace prose "Launch one `worker` agent per stream simultaneously" with explicit `Task` tool invocation using `subagent_type: "worker"`
- Update `openspec-execute` skill: clarify it is the skill loaded by `Task`-dispatched worker subagents; remove any ambiguity about how the orchestrator calls it
- Update `openspec-ff-change` skill: align worker epic references to match the Task tool dispatch model
- Update `openspec-continue-change` skill: align worker epic purpose note to reference Task tool dispatch

## Capabilities

### New Capabilities

- `task-tool-worker-dispatch`: Define how the `Task` tool is used to dispatch `worker` subagents from `development-orchestration`, including the exact prompt format, `subagent_type`, and `description` field conventions

### Modified Capabilities

- `orchestration-worker-protocol`: Update existing worker dispatch language across all four skills to reference the `Task` tool explicitly, with correct `subagent_type: "worker"` parameter

## Impact

- Affected files: `.opencode/skills/development-orchestration/SKILL.md`, `.opencode/skills/openspec-execute/SKILL.md`, `.opencode/skills/openspec-ff-change/SKILL.md`, `.opencode/skills/openspec-continue-change/SKILL.md`
- API changes: No
- Data model changes: No
- Dependencies: No new dependencies — uses Claude's built-in `Task` tool (`mcp_task`)
