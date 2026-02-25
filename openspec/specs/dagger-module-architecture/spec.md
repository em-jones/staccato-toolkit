# dagger-module-architecture Specification

## Purpose
TBD - created by archiving change adopt-dagger-ci-cd. Update Purpose after archive.
## Requirements
### Requirement: Dagger module structure follows platform conventions

The Dagger module SHALL be located at `src/ops/workloads/` and initialized with the Go SDK (v0.19.11). The module's entry point SHALL be a single exported type (`Platform`) with methods corresponding to pipeline tasks.

#### Scenario: Module initializes and is discoverable

- **WHEN** a developer enters `devbox shell` and runs `cd src/ops/workloads && dagger call --help`
- **THEN** available functions are listed without error
- **THEN** the module name from `dagger.json` is displayed (currently: `platform`)

#### Scenario: Go code organization follows naming conventions

- **WHEN** the module source code is reviewed
- **THEN** the main type is exported (`Platform`)
- **THEN** each exported method corresponds to a callable task (e.g., `Lint`, `Test`, `Build`)
- **THEN** method names follow CapitalCase (Go convention) and task names use lowercase kebab-case in CLI invocation

### Requirement: Module uses container isolation for task execution

All pipeline tasks SHALL execute within isolated containers. No task shall modify the host filesystem. The module SHALL accept a `source` parameter (or similar) to mount the repository as a read-only or read-write directory.

#### Scenario: Tasks execute in containers without host mutation

- **WHEN** `dagger call lint --source <path>` is invoked
- **THEN** the task runs inside a container (e.g., `golang:1.23-alpine`)
- **THEN** no files are modified outside the container
- **THEN** output is captured and returned to stdout

#### Scenario: Source code is mounted from host

- **WHEN** a task is invoked with `--source <path>`
- **THEN** the directory at `<path>` is mounted into the container
- **THEN** the task can read and process files from the mounted source

### Requirement: Module documents caching strategy

The module architecture SHALL define which layers are cacheable and which are not. Container image layers, dependency caches (Go modules, npm packages), and build artifacts SHALL be managed through Dagger's caching primitives.

#### Scenario: Container layers are reused between runs

- **WHEN** a task is invoked multiple times locally
- **THEN** Dagger's layer cache is used to speed up container image construction
- **THEN** re-running the same task is measurably faster on the second invocation

#### Scenario: Dependency caches are managed across invocations

- **WHEN** Go modules or npm packages are fetched in a task
- **THEN** they are cached by Dagger's dependency caching layer
- **THEN** rebuilding with no dependency changes skips the fetch step

### Requirement: Module integration with GitHub Actions is documented

The module SHALL be designed to work seamlessly with GitHub Actions CI/CD workflows. The orchestration model (invocation via `dagger call`, no secret logging, caching setup) SHALL be documented.

#### Scenario: Module tasks are invoked from CI workflows

- **WHEN** a GitHub Actions workflow runs `dagger call lint`, `dagger call test`, etc.
- **THEN** the invocations succeed and produce exit codes reflecting task success/failure
- **THEN** output is captured and available in the Actions job log

#### Scenario: Module design supports secrets without logging

- **WHEN** a task requires credentials (e.g., registry authentication)
- **THEN** the module design accommodates passing secrets via Dagger's secret API
- **THEN** secrets are not leaked into task output or logs

### Requirement: Module architecture is documented in platform reference

All design decisions (why Go SDK, why container isolation, caching strategy, module organization) SHALL be recorded in a platform pattern document at `.opencode/rules/patterns/delivery/dagger-ci-cd.md`.

#### Scenario: Design decisions are available in the pattern rule

- **WHEN** a developer or architect reviews `.opencode/rules/patterns/delivery/dagger-ci-cd.md`
- **THEN** the Dagger module's architecture, SDK choice, and orchestration model are explained
- **THEN** the rationale for container isolation and caching is articulated
- **THEN** links to source code and specifications are provided

