# Specification: bash-formatting Capability

## Overview

The `bash-formatting` capability provides automated formatting enforcement for bash/shell scripts using `shfmt`, integrated into the platform's Dagger-based CI pipeline. It ensures consistent style for all `.sh` files in the repository, matching the formatting posture already in place for Go (`gofmt`) and completing the quality tooling pair for bash alongside `shellcheck`.

## Requirements
### Requirement: shfmt in devbox

The platform development environment SHALL include `shfmt` as an available tool via devbox so that developers can format shell scripts locally before pushing.

#### Scenario: shfmt is present in devbox.json

- **WHEN** `devbox.json` is inspected
- **THEN** `shfmt` is listed in the `packages` array

#### Scenario: shfmt is available in devbox shell

- **WHEN** a developer runs `devbox shell` and executes `shfmt --version`
- **THEN** the command succeeds and reports the installed version

---

### Requirement: shfmt Dagger task

The `src/ops/workloads` Dagger module SHALL expose a `ShfmtCheck` function that checks whether all `.sh` files in the source directory are formatted according to `shfmt` defaults.

#### Scenario: ShfmtCheck task finds and checks all .sh files

- **WHEN** `dagger call shfmt-check --source ../..` is executed from `src/ops/workloads`
- **THEN** shfmt is run in diff mode against every `.sh` file in the repository (excluding `.git/`, `node_modules/`, and `.devbox/`)
- **AND** any files that differ from shfmt output are listed

#### Scenario: ShfmtCheck task exits non-zero on unformatted files

- **WHEN** any `.sh` file differs from its shfmt-formatted form
- **AND** `dagger call shfmt-check --source ../..` is executed
- **THEN** the function returns a non-zero exit code
- **AND** the diff output identifies which files need formatting

#### Scenario: ShfmtCheck task exits zero on correctly formatted scripts

- **WHEN** all `.sh` files are already shfmt-formatted
- **AND** `dagger call shfmt-check --source ../..` is executed
- **THEN** the function exits with code 0

#### Scenario: ShfmtCheck task returns graceful message when no scripts found

- **WHEN** the source directory contains no `.sh` files
- **THEN** the function returns `"no shell scripts found"` and exits zero

---

### Requirement: shfmt wired into CI format job

The CI pipeline's `format` job in `.github/workflows/ci.yml` SHALL invoke the shfmt Dagger task so that shell formatting is checked on every PR and push to main.

#### Scenario: CI format job runs shfmt check

- **WHEN** the CI `format` job runs
- **THEN** it executes `dagger call shfmt-check --source ../..` as a step in the job
- **AND** a formatting failure causes the format job to fail

#### Scenario: Unformatted scripts fail CI

- **WHEN** a `.sh` file in the repository is not shfmt-formatted
- **AND** the CI format job runs
- **THEN** the format job fails with a non-zero exit code

#### Scenario: Correctly formatted scripts pass CI format

- **WHEN** all `.sh` files are shfmt-formatted
- **AND** the CI format job runs
- **THEN** the format job passes (exit code 0)

---

### Requirement: all platform bash scripts are shfmt-formatted

All existing `.sh` files in the repository MUST be formatted with `shfmt` so that the format check is green from day one.

#### Scenario: All platform scripts pass shfmt check

- **WHEN** `dagger call shfmt-check --source ../..` is run against the current codebase
- **THEN** all files under `.opencode/`, `.ops/`, and any other non-vendor paths pass
- **AND** the task exits zero

#### Scenario: Unformatted existing scripts are fixed before enabling CI

- **WHEN** shfmt identifies files that need reformatting
- **THEN** those scripts SHALL be reformatted in this same change before the CI job is enabled
