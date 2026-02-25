---
name: skill-composition
description:
  Compose multiple skills for complex multi-domain tasks. Use when a task requires expertise from
  more than one skill domain (e.g. a feature that spans Go development, API design, and
  observability instrumentation).
compatibility: opencode
metadata:
  maturity: stable
---

# Skill Composition

Some tasks span multiple domains and require guidance from more than one skill. This document
defines how to compose skills and how tasks declare their skill requirements.

## How Composition Works

Skills are loaded additively. When a task requires multiple skills, load each in sequence — later
skills do not override earlier ones; they extend the context. Apply all loaded skills' constraints
simultaneously when implementing.

## Loading Multiple Skills

To load multiple skills for a task, use the skill tool once per skill:

```
skill: go-developer
skill: observability-instrumentation
```

Both skills are now active. Follow all guidelines from both simultaneously. Where guidelines
conflict, prefer the more specific skill (e.g. `observability-instrumentation` over `go-developer`
on tracing questions).

## Declaring Composite Skills on Tasks

Workers receive their skill from `worker:next_task`. For multi-domain tasks, the `skill` field may
be a comma-separated list:

```
skill: go-developer,observability-instrumentation
```

The worker loads each skill before beginning implementation.

## Common Compositions

These combinations appear frequently — load all listed skills when the task description matches:

| Task type                    | Skills to load                                                 |
| ---------------------------- | -------------------------------------------------------------- |
| New Go HTTP service          | `go-developer`, `observability-instrumentation`                |
| Go service with database     | `go-developer`, `observability-instrumentation`                |
| CI/CD pipeline               | `devops-automation`, `go-developer` (if Go artifacts involved) |
| Backstage catalog + TechDocs | `dev-portal-manager`                                           |
| New technology adoption      | `create-usage-rules`, `address-usage-gaps`                     |
| OpenSpec change (standard)   | determined by `## Agent Skills` table in design.md             |

## Conflict Resolution

When two loaded skills give conflicting guidance:

1. **More specific wins**: a skill scoped to a single technology overrides a general pattern skill
2. **Later-loaded wins** on purely stylistic questions with no correctness impact
3. **When genuinely ambiguous**: log a `--decision` entry via `td log` explaining which guidance was
   followed and why

## Guardrails

- Load ALL required skills before beginning work — do not load skills mid-task
- Do not merge skill content into task output; skills are constraints, not content
- If a required skill does not exist, log a `--blocker` and create a research task:
  `td create "Create skill: <name>" --type task --parent <change-root-id>`
