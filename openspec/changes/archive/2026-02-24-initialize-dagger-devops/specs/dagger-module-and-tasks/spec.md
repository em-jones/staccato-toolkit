---
td-board: initialize-dagger-devops-dagger-module-and-tasks
td-issue: td-50cd2f
---

# Specification: dagger-module-and-tasks

## Overview

Defines the core dagger module structure and the initial set of CI tasks that integrate with the existing repository scripts.

## ADDED Requirements

### Requirement: Dagger module is initialized with chosen SDK

A dagger module SHALL be initialized in the repository using the Go SDK selected in `dagger-language-and-layout`. The module SHALL be the single entry point for all dagger-defined CI/CD tasks.

#### Scenario: Module initializes and executes without error

- **WHEN** a developer runs `dagger call --help` from the repository root (or the dagger module directory)
- **THEN** the available functions are listed without errors
- **THEN** no additional installation beyond devbox shell is required

#### Scenario: Module uses the language selected in the design

- **WHEN** the module code is reviewed
- **THEN** it is written in the language documented in the design decision record
- **THEN** it follows the naming and function conventions from `patterns/code/naming.md` and `patterns/code/functions.md`

### Requirement: Dagger module exposes a lint task

The module SHALL expose a `lint` function that runs the project's existing linting tooling (if any) inside a container.

#### Scenario: Lint task executes successfully on clean code

- **WHEN** `dagger call lint` is run against a clean checkout
- **THEN** it exits zero
- **THEN** output identifies what linter was run

#### Scenario: Lint task is skipped gracefully when no linter is configured

- **WHEN** no linting tool is present in `devbox.json` or `package.json`
- **THEN** the lint task outputs a clear "no linter configured" message and exits zero

### Requirement: Dagger module exposes a test task

The module SHALL expose a `test` function that runs the project's existing test suite inside a container.

#### Scenario: Test task runs and reports results

- **WHEN** `dagger call test` is run
- **THEN** it invokes the existing test runner (e.g., `yarn test`, `cargo test`, or equivalent)
- **THEN** it exits with the test runner's exit code (non-zero on failure)

### Requirement: Dagger module exposes a build task

The module SHALL expose a `build` function that produces build artifacts (or validates the project builds) inside a container.

#### Scenario: Build task produces artifact or validates build

- **WHEN** `dagger call build` is run
- **THEN** it runs the project's build command
- **THEN** it exits zero on success, non-zero on failure

### Requirement: Dagger tasks do not replace existing agent-facing CLIs

The dagger module SHALL NOT wrap or replace `td`, `openspec`, or other agent-facing CLIs. Integration is limited to standard developer scripts only.

#### Scenario: td and openspec are not in dagger module

- **WHEN** the dagger module code is reviewed
- **THEN** there are no references to `td` or `openspec` commands
- **THEN** the module scope is limited to lint, test, build, and repository-specific scripts listed in `package.json` or `devbox.json`
