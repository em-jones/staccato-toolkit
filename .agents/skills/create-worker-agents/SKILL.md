# Create Worker Agent Skill

This skill creates worker agent specifications for the newest free models from opencode and openrouter.

## When to Use This Skill

Use this skill when you need to:

- Create worker agent specifications for new free AI models
- Update existing worker agents when new models become available
- Maintain consistency in worker agent specifications across different providers

## Skill Overview

This skill creates agent specification files following the pattern `[provider_abbreviation]_[model_name]_worker.md` where:

- `provider_abbreviation` is either `oc` for opencode or `or` for openrouter
- `model_name` is the specific model identifier

The skill checks for the latest free models from both opencode and openrouter and creates corresponding worker agent specifications.

## Steps

### 1. Get Current Free Models

The skill queries the OpenRouter API to get the latest free models:

```bash
curl -s "https://openrouter.ai/api/v1/models" | jq -r '.data[] | select(.pricing.prompt=="0" and .pricing.completion=="0") | .id'
```

### 2. Filter for Target Models

The skill filters the results for the target model families:

- qwen
- kimi
- nemotron
- gpt-oss
- step

### 3. Create Agent Specifications

For each qualifying model, the skill creates two agent specification files:

- One for opencode: `oc_[model_name]_worker.md`
- One for openrouter: `or_[model_name]_worker.md`

Each file follows the standard worker agent template with appropriate model specification in the frontmatter.

### 4. Handle Special Cases

The skill handles special cases like:

- Model names with special characters (slashes, dashes, etc.)
- Avoiding duplicate creation of existing files
- Skipping models that don't have free tiers available

## Usage

To use this skill, invoke it with:

```
/agents/skills/create-worker-agents/create_worker_agents.sh
```

Or call it from another skill or agent workflow.

## Template

The generated worker agent files follow this template:

````
---
description: Parallelizable general-purpose worker; expertise attached to td task as skill to use.
mode: subagent
model: [provider]/[model_id]:free
temperature: 0.7
tools:
  write: true
  edit: true
  bash: true
  kubernetes_*: true
---

# Worker agent

## Session start

```bash
task worker:next_task <worker_feature_id> # Returns null or {task_id: <task_id>, skill: <skill>, context: <context>, status: status}
````

## **IMPORTANT**

**Whenever** `worker:next_task` returns null, that's a signal that the feature is `complete`

## WHEN: status in [`in_progress`, `open`] Implementation operations

1. use the `context` and `skill` returned from `worker:next_task` to implement the task while
   logging progress. If `skill` is a comma-separated list, load each skill before beginning (see
   `skill-composition` skill for guidance)
2. link implementation files after completing work: `td link <id> <files> --role implementation`
3. [perform handoff](#handoff)
4. Progress the task status: `td review <id>`

## WHEN: status == `in_review` Review operations

1. use the `context` and `skill` returned from `worker:next_task` to review the implementation of
   the task while logging progress. If `skill` is a comma-separated list, load each skill before
   reviewing
2. Get implementation files: `td files <id> --role implementation` and review them
3. [perform handoff](#handoff)
4. Progress the task status:
   - **IF VERIFIED**: `td approve <id>`
   - **IF REJECTED**: `td reject <id>`

## Core responsibilities

- Perform task retrieved from `worker:next_task`
- Use rely on the specified skill for the guide to implementing the task
- Log progress and decisions with `td log` and use flags:
  - `--decision` for significant decisions made during implementation
  - `--hypothesis` for assumptions or hypotheses that are being tested during implementation
  - `--tried` for approaches or solutions that were attempted during implementation
  - `--result` for outcomes of the approaches or solutions that were attempted during implementation
  - `--blocker` for any blockers encountered during implementation
- Link implementation files after completing work: `td link <id> <files> --role implementation`
- Progress the task status

## Handoff

Handoff captures the session's work and decisions, preserving context for the next session. Handoff
is required at each task state transition:

- **Before `td review` (submitting for review)**:

  ```bash
  td handoff <id> --done "<what was implemented>" --remaining "none" [--decision "<key decision made>"]
  ```

- **Before `td approve` (approving a reviewed task)**:

  ```bash
  td handoff <id> --done "Verified: <summary of what was confirmed>" --remaining "none"
  ```

- **Before `td reject` (returning task to implementer)**:

  ```bash
  td handoff <id> --done "Review complete, rejected" --remaining "<specific actionable issues to fix>"
  ```

Handoff ensures the next agent session knows what was done, what remains, and why decisions were
made.

```

## Example Output

When run, this skill might create files like:
- `.opencode/agents/oc_qwen-worker.md`
- `.opencode/agents/or_qwen-worker.md`
- `.opencode/agents/oc_nemotron-worker.md`
- `.opencode/agents/or_nemotron-worker.md`
- And so on for other qualifying free models

## Notes

- The skill respects existing files and will not overwrite them unless explicitly designed to do so
- Only creates workers for models that have confirmed free tiers (both prompt and completion pricing at 0)
- Follows the exact same format as existing worker agent specifications in the repository
```
