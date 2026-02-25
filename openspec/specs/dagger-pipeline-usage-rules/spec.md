# dagger-pipeline-usage-rules Specification

## Purpose
TBD - created by archiving change adopt-dagger-ci-cd. Update Purpose after archive.
## Requirements
### Requirement: Task method names follow Go convention and task invocation uses lowercase

Pipeline tasks in the `Platform` type SHALL be exported methods with CapitalCase names (Go convention). When invoked via `dagger call`, the command-line task name SHALL be the lowercase version of the method name (e.g., `Lint()` → `dagger call lint`).

#### Scenario: Method naming is consistent across the module

- **WHEN** a developer reviews the `Platform` type methods
- **THEN** all public methods are CapitalCase (e.g., `Lint`, `Test`, `Build`)
- **THEN** invoking them via CLI uses lowercase (e.g., `dagger call lint`)

#### Scenario: New tasks follow the same convention

- **WHEN** a new task method is added to `Platform`
- **THEN** it is exported (CapitalCase) and can be invoked via `dagger call <lowercase>`

### Requirement: All tasks accept a source parameter

All pipeline tasks SHALL accept a `source` parameter of type `*Directory` (or equivalent) representing the repository root. This parameter SHALL be mounted read-only or read-write as appropriate for the task.

#### Scenario: Source is mounted for read-only inspection

- **WHEN** `dagger call lint --source <path>` is invoked
- **THEN** the source directory is mounted into the task container
- **THEN** files can be read but not modified

#### Scenario: Source is mounted for potential modification

- **WHEN** `dagger call format --source <path>` is invoked
- **THEN** the source directory is mounted
- **THEN** formatting changes can be made (if the task is designed to do so)

### Requirement: Exit behavior is explicit and documented

Every task SHALL have clear exit behavior: returning an exit code of 0 on success and non-zero on failure. The task signature SHALL be `(ctx context.Context, ...) (string, error)` where error captures failure state.

#### Scenario: Successful execution returns zero exit code

- **WHEN** a task completes successfully (e.g., linter finds no issues)
- **THEN** the task returns `(output, nil)` from the Go function
- **WHEN** invoked via `dagger call`, the exit code is 0
- **THEN** the output string is printed to stdout

#### Scenario: Failure returns non-zero exit code

- **WHEN** a task encounters an error (e.g., test failure)
- **THEN** the Go function returns `(output, err)` where `err` is non-nil
- **WHEN** invoked via `dagger call`, the exit code is non-zero
- **THEN** the output string and error details are printed

### Requirement: Container base images are chosen based on language and tools

All tasks SHALL declare which container image they use as the base. The choice of base image SHALL be documented and motivated by the tools and languages required by the task.

#### Scenario: Language-specific task chooses appropriate base image

- **WHEN** a Go linting task is implemented
- **THEN** it uses `golang:1.23-alpine` (or the version specified in `devbox.json`)
- **WHEN** a shell linting task is implemented
- **THEN** it uses `koalaman/shellcheck-alpine:stable`

#### Scenario: Base image choice is documented

- **WHEN** the `Platform` type or the platform pattern rule is reviewed
- **THEN** the rationale for each base image choice is explained (e.g., "golang:1.23-alpine chosen for minimal footprint and built-in Go toolchain")

### Requirement: Task output is human-readable and machine-parseable

All task output SHALL be designed to be readable in a terminal and, when appropriate, parseable by CI tools. Task output SHALL clearly indicate success or failure and provide diagnostic information on error.

#### Scenario: Lint task output identifies what was linted

- **WHEN** `dagger call lint` completes
- **THEN** the output includes which linter was run (e.g., "golangci-lint")
- **THEN** if issues are found, the output includes file names, line numbers, and violation descriptions

#### Scenario: Test task output shows pass/fail summary

- **WHEN** `dagger call test` completes
- **THEN** the output includes test counts (passed, failed, skipped)
- **THEN** on failure, the output includes stack traces or assertion details

### Requirement: Graceful handling of missing tools

If a task depends on a tool that is not configured (e.g., no linter is found), the task SHALL return a clear message and exit with code 0, not 1. This prevents CI from failing on repositories that don't use a particular tool.

#### Scenario: No linter configured does not fail CI

- **WHEN** no `.golangci.yml`, `.eslintrc`, or equivalent is found
- **THEN** the `lint` task returns `"no linter configured"` as output
- **THEN** the task exits with code 0 (success)

#### Scenario: Missing tool message is clear

- **WHEN** a task message is printed
- **THEN** it clearly states what tool is missing or not configured
- **THEN** developers can understand why the task was skipped

