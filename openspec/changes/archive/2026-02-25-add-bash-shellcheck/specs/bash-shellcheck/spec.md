---
td-board: add-bash-shellcheck-bash-shellcheck
td-issue: td-95d7ca
---

# Specification: bash-shellcheck Capability

## Overview

The `bash-shellcheck` capability provides automated static analysis linting for bash/shell scripts using shellcheck, integrated into the platform's Dagger-based CI pipeline. It ensures consistent quality for all `.sh` files in the repository, matching the linting posture already in place for Go and TypeScript.

## ADDED Requirements

### Requirement: shellcheck in devbox

The platform development environment SHALL include `shellcheck` as an available tool via devbox so that developers can run shell linting locally before pushing.

**Issue**: td-e7698d

#### Scenario: shellcheck is present in devbox.json

- **WHEN** `devbox.json` is inspected
- **THEN** `shellcheck` is listed in the `packages` array

#### Scenario: shellcheck is available in devbox shell

- **WHEN** a developer runs `devbox shell` and executes `shellcheck --version`
- **THEN** the command succeeds and reports the installed version

---

### Requirement: shellcheck Dagger task

The `src/ops/workloads` Dagger module SHALL expose a `Shellcheck` function that runs shellcheck against all `.sh` files found in the source directory.

**Issue**: td-a5f7af

#### Scenario: Shellcheck task finds and lints all .sh files

- **WHEN** `dagger call shellcheck --source ../..` is executed from `src/ops/workloads`
- **THEN** shellcheck is run against every `.sh` file in the repository (excluding `.git/` and `node_modules/`)
- **AND** the output lists any violations found

#### Scenario: Shellcheck task exits non-zero on violations

- **WHEN** any `.sh` file contains a shellcheck violation
- **AND** `dagger call shellcheck --source ../..` is executed
- **THEN** the function returns a non-zero exit code
- **AND** the violation details are included in the output

#### Scenario: Shellcheck task exits zero on clean scripts

- **WHEN** all `.sh` files pass shellcheck
- **AND** `dagger call shellcheck --source ../..` is executed
- **THEN** the function exits with code 0

#### Scenario: Shellcheck task returns graceful message when no scripts found

- **WHEN** the source directory contains no `.sh` files
- **THEN** the function returns `"no shell scripts found"` and exits zero

---

### Requirement: shellcheck wired into CI lint job

The CI pipeline's `lint` job in `.github/workflows/ci.yml` SHALL invoke the shellcheck Dagger task so that shell linting runs on every PR and push to main.

**Issue**: td-29f4bf

#### Scenario: CI lint job runs shellcheck

- **WHEN** the CI `lint` job runs
- **THEN** it executes `dagger call shellcheck --source ../..` as a step in the job
- **AND** a shellcheck failure causes the lint job to fail

#### Scenario: Shell violations fail CI

- **WHEN** a `.sh` file in the repository has a shellcheck violation
- **AND** the CI lint job runs
- **THEN** the lint job fails with a non-zero exit code

#### Scenario: Clean scripts pass CI lint

- **WHEN** all `.sh` files pass shellcheck
- **AND** the CI lint job runs
- **THEN** the lint job passes (exit code 0)

---

### Requirement: lint passes for all platform bash scripts

All existing `.sh` files in the repository MUST pass shellcheck with no errors so that the lint job is green from day one.

**Issue**: td-5bd196

#### Scenario: All platform scripts pass shellcheck

- **WHEN** `dagger call shellcheck --source ../..` is run against the current codebase
- **THEN** all files under `.opencode/`, `.ops/`, and any other non-vendor paths pass
- **AND** the task exits zero

#### Scenario: Violations in existing scripts are fixed before merging

- **WHEN** shellcheck identifies violations in existing scripts
- **THEN** those scripts SHALL be fixed in this same change before the CI job is enabled
