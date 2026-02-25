---
td-board: initialize-dagger-devops
td-issue: td-e468f7
---

# Proposal: Initialize Dagger DevOps Tooling

## Why

The project lacks containerized, reproducible CI/CD tooling. Introducing `dagger` provides portable pipeline execution that runs identically locally and in GitHub Actions, reducing "works on my machine" friction and enabling scriptable, composable DevOps automation.

## What Changes

- Add `dagger` as the containerized execution layer for CI/CD pipelines and developer scripts
- Select a language for dagger modules (with documented decision analysis vs. alternatives)
- Establish monorepo layout and tooling for the chosen dagger language
- Define and implement a test strategy for dagger tasks
- Add a GitHub Actions CI/CD pipeline that runs dagger tasks
- Integrate dagger with existing repository scripts (excluding `td`, `openspec`, and other agent-facing CLIs)
- Add a `devops-automation` skill to help agents manage and maintain dagger tooling

## Capabilities

### New Capabilities

- `dagger-language-and-layout`: Language selection for dagger modules, monorepo structure, and build tooling — including decision analysis comparing dagger language options (Go, Python, TypeScript); Go selected with module path at `src/ops/platform/`
- `dagger-module-and-tasks`: Core dagger module with initial CI tasks (lint, test, build) and integration with existing repo scripts
- `dagger-test-strategy`: Test strategy for dagger modules: unit tests for individual functions, integration tests that execute tasks against a real container runtime, and CI gating rules
- `dagger-github-actions`: GitHub Actions workflow that invokes dagger tasks on push/PR, with caching and secrets handling
- `devops-automation-skill`: A `.opencode/skills/devops-automation/SKILL.md` skill that documents how to add, modify, and test dagger tasks, guiding agents and developers who work on the pipeline

### Modified Capabilities

(none)

## Impact

- Affected services/modules: repository root tooling, `.github/workflows/`, `.opencode/skills/`
- API changes: No
- Data model changes: No
- Dependencies: `dagger` CLI, Go runtime, devbox integration
