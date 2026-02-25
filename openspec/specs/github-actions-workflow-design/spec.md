---
td-board: document-github-actions-patterns-github-actions-workflow-design
td-issue: td-1b66c3
---

# Specification: GitHub Actions Workflow Design

## Overview

This spec defines patterns and best practices for structuring GitHub Actions workflows, including job orchestration, step composition, conditional execution, and workflow organization.

## ADDED Requirements

### Requirement: Workflow structure and naming conventions

Workflow files SHALL follow a consistent naming convention and directory structure. Workflow names SHALL be descriptive and match the purpose of the automation.

#### Scenario: Workflow discovery and clarity

- **WHEN** a developer opens the `.github/workflows/` directory
- **THEN** workflow files are named with clear, purposeful names (e.g., `ci.yml`, `deploy-staging.yml`) that indicate their purpose

### Requirement: Job organization and orchestration

Workflows SHALL organize related steps into logical jobs. Jobs SHALL have descriptive names and properly configured dependencies when execution order matters.

#### Scenario: Job dependency management

- **WHEN** multiple jobs exist in a workflow
- **THEN** job dependencies are explicitly declared using `needs:` to control execution order
- **THEN** independent jobs can run in parallel for efficiency

### Requirement: Step-level structure and naming

Each step within a job SHALL have a clear `name` property that describes its purpose. Steps SHALL be organized logically within a job.

#### Scenario: Step clarity and debugging

- **WHEN** a workflow run fails
- **THEN** the failed step is immediately identifiable by its descriptive name
- **THEN** developers can easily understand what the step was attempting to do

### Requirement: Conditional execution patterns

Workflows SHALL use conditional expressions to control step and job execution based on specific conditions (success, failure, branch, event type).

#### Scenario: Branch-specific deployment

- **WHEN** a workflow runs on a non-main branch
- **THEN** deployment steps are skipped
- **WHEN** a workflow runs on the main branch
- **THEN** deployment steps execute

### Requirement: Environment variable and input management

Workflows SHALL define and pass environment variables and inputs clearly. Parameters SHALL be documented in the workflow file.

#### Scenario: Configuration clarity

- **WHEN** a workflow accepts inputs (for reusable workflows or manual triggers)
- **THEN** inputs are defined in the workflow with descriptions and default values
- **THEN** steps reference inputs through consistent patterns (e.g., `${{ inputs.variable }}`)

### Requirement: Error handling and failure strategies

Workflows SHALL explicitly handle failures with appropriate strategies (fail fast, continue on error, retry).

#### Scenario: Robust CI/CD handling

- **WHEN** a non-critical step fails (e.g., optional linting)
- **THEN** the step is marked with `continue-on-error: true` to prevent workflow failure
- **WHEN** a critical step fails (e.g., build)
- **THEN** the workflow fails immediately and subsequent steps do not run

### Requirement: Workflow performance and efficiency

Workflows SHALL be optimized for execution time by leveraging caching, parallelization, and avoiding redundant operations.

#### Scenario: Build performance optimization

- **WHEN** a workflow includes a build step that uses external dependencies
- **THEN** dependency caches are configured (e.g., `actions/setup-go` with cache)
- **THEN** build artifacts are cached when appropriate to reduce subsequent build times

### Requirement: Workflow documentation and comments

Workflows SHALL include inline comments explaining non-obvious configuration choices and complex step interactions.

#### Scenario: Maintenance and onboarding

- **WHEN** a developer reviews a workflow file for the first time
- **THEN** comments explain the purpose of each major section
- **THEN** complex conditional expressions or job dependencies are annotated with their rationale
