# dagger-ci-cd-platform-pattern Specification

## Purpose
TBD - created by archiving change adopt-dagger-ci-cd. Update Purpose after archive.
## Requirements
### Requirement: Dagger tasks support multi-stage pipeline orchestration

The Dagger platform module SHALL support defining a DAG of pipeline stages where some tasks depend on others (e.g., `test` depends on `lint`). Task execution order SHALL be explicit and reviewable without running the pipeline.

#### Scenario: Pipeline stages can be defined with explicit dependencies

- **WHEN** the GitHub Actions workflow is reviewed
- **THEN** job dependencies are declared with `needs:` (e.g., `test` job has `needs: lint`)
- **THEN** Dagger tasks can be composed to reflect this DAG

#### Scenario: Task output can feed into downstream tasks

- **WHEN** a task completes and returns output
- **THEN** downstream tasks can accept that output (or the artifacts it references)
- **THEN** the pipeline DAG is acyclic and reviewable

### Requirement: Local and CI execution have documented differences

The Dagger module SHALL work in both local development (`devbox shell && dagger call`) and GitHub Actions CI contexts. Differences in execution environment (cache behavior, container network, secret handling) SHALL be documented.

#### Scenario: Tasks work identically on localhost and in CI

- **WHEN** a developer runs `dagger call lint --source .` locally
- **AND** the same command is run in a GitHub Actions job
- **THEN** both executions produce the same output and exit code (modulo timing and log verbosity)

#### Scenario: Cache behavior is consistent between environments

- **WHEN** a task is run locally and then in CI
- **THEN** both executions benefit from Dagger's caching
- **THEN** CI cache behavior is not dependent on GitHub Actions cache (Dagger manages its own)

#### Scenario: Environment differences are documented

- **WHEN** `.opencode/rules/patterns/delivery/dagger-ci-cd.md` is reviewed
- **THEN** differences between local and CI execution are listed (e.g., network isolation, container registry access)
- **THEN** any workarounds are explained

### Requirement: Secrets are passed securely to Dagger tasks

Secrets (API tokens, registry credentials) required by tasks SHALL be passed via Dagger's secret API or environment variables marked as secret. Secrets SHALL NOT be logged, printed, or exposed in task output.

#### Scenario: GitHub Actions secrets are passed to dagger without logging

- **WHEN** a GitHub Actions workflow needs to pass a secret to a Dagger task
- **THEN** the workflow uses `dagger call --secret <name> <value>` or equivalent
- **WHEN** the task accesses the secret internally
- **THEN** the secret value does not appear in stdout, stderr, or logs

#### Scenario: Local development can provide secrets without requiring GitHub Actions secrets

- **WHEN** a developer runs a task locally that uses a secret
- **THEN** they can provide the secret via environment variable or Dagger's secret input mechanism
- **THEN** no GitHub Actions setup is required

### Requirement: Module organization supports multiple task categories

The `Platform` module MAY be extended to group tasks by category (e.g., `Lint`, `Test`, `Build`, `Deploy`). If multiple task types are defined, they SHALL be organized coherently and documented.

#### Scenario: Related tasks can be grouped logically

- **WHEN** new tasks are added (e.g., container image building)
- **THEN** they are organized alongside similar tasks
- **THEN** task naming and grouping is consistent

#### Scenario: Task enumeration is discoverable

- **WHEN** `dagger call --help` is run
- **THEN** all available tasks are listed and grouped (if applicable)

### Requirement: Caching strategy is explicitly defined for each task

Each task in the module SHALL document which inputs are cached and which are not. This includes:
- Dependency caches (Go modules, npm packages)
- Build artifacts
- Container image layers
- Intermediate outputs

#### Scenario: Dependency caching is leveraged

- **WHEN** a task downloads dependencies (e.g., `go mod download`)
- **THEN** Dagger's caching ensures repeated invocations with unchanged dependencies skip the download step
- **THEN** the cache is shared between local and CI execution (within the Dagger store)

#### Scenario: Build artifacts are not cached inappropriately

- **WHEN** a build output is produced
- **THEN** the artifact is not cached if the source code or dependencies change
- **THEN** cache invalidation is automatic and correct

### Requirement: Platform pattern is documented in `.opencode/rules/patterns/delivery/dagger-ci-cd.md`

The entire platform pattern (orchestration, caching, secrets, local vs. CI differences, module organization) SHALL be documented in a canonical pattern rule file. This document SHALL be the single source of truth for teams implementing new Dagger tasks.

#### Scenario: Pattern rule is comprehensive

- **WHEN** a new developer joins the team and needs to add a Dagger task
- **THEN** they can read `.opencode/rules/patterns/delivery/dagger-ci-cd.md` end-to-end and understand the platform
- **THEN** all key design decisions (SDK, container isolation, caching, secrets) are explained
- **THEN** examples are provided for common task patterns (lint, test, build)

#### Scenario: Pattern rule links to specifications and source code

- **WHEN** the pattern rule is reviewed
- **THEN** it links to the relevant OpenSpec specs (dagger-module-architecture, dagger-pipeline-usage-rules)
- **THEN** it references source code examples from `src/ops/workloads/`

