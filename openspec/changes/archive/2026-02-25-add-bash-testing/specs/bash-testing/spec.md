# Specification: bash-testing Capability

## Overview

The `bash-testing` capability provides automated test execution for bash/shell scripts using `bats-core` (Bash Automated Testing System), integrated into the platform's Dagger-based CI pipeline. It ensures correctness of platform bash scripts, matching the testing posture already in place for Go and TypeScript.

## Requirements

### Requirement: bats-core in devbox

The platform development environment SHALL include `bats-core` as an available tool via devbox so that developers can run bash tests locally before pushing.

#### Scenario: bats-core is present in devbox.json

- **WHEN** `devbox.json` is inspected
- **THEN** `bats-core` is listed in the `packages` array

#### Scenario: bats command is available in devbox shell

- **WHEN** a developer runs `devbox shell` and executes `bats --version`
- **THEN** the command succeeds and reports the installed version

---

### Requirement: BatsTest Dagger task

The `src/ops/workloads` Dagger module SHALL expose a `BatsTest` function that discovers and runs all `.bats` test files found in the source directory.

#### Scenario: BatsTest task discovers and runs all bats test files

- **WHEN** `dagger call bats-test --source ../..` is executed from `src/ops/workloads`
- **THEN** all `.bats` files in the repository (excluding `.git/`, `node_modules/`, `.devbox/`) are discovered
- **AND** bats is run against each discovered test file
- **AND** the output reports test results (pass/fail counts and names)

#### Scenario: BatsTest task exits non-zero on test failures

- **WHEN** any `.bats` test file contains a failing test
- **AND** `dagger call bats-test --source ../..` is executed
- **THEN** the function returns a non-zero exit code
- **AND** the failing test names and output are included in the result

#### Scenario: BatsTest task exits zero when all tests pass

- **WHEN** all `.bats` test files contain only passing tests
- **AND** `dagger call bats-test --source ../..` is executed
- **THEN** the function exits with code 0

#### Scenario: BatsTest task returns graceful message when no test files found

- **WHEN** the source directory contains no `.bats` files
- **THEN** the function returns `"no bats test files found"` and exits zero

---

### Requirement: bats wired into CI test job

The CI pipeline's `test` job in `.github/workflows/ci.yml` SHALL invoke the BatsTest Dagger task so that bash tests run on every PR and push to main.

#### Scenario: CI test job runs bats

- **WHEN** the CI `test` job runs
- **THEN** it executes `dagger call bats-test --source ../..` as a step in the job
- **AND** a test failure causes the test job to fail

#### Scenario: Bash test failures fail CI

- **WHEN** a `.bats` file in the repository has a failing test
- **AND** the CI test job runs
- **THEN** the test job fails with a non-zero exit code

#### Scenario: Passing tests pass CI test job

- **WHEN** all `.bats` tests pass
- **AND** the CI test job runs
- **THEN** the test job passes (exit code 0)

---

### Requirement: Initial bats test coverage for platform scripts

At least one `.bats` test file SHALL exist for platform bash scripts to establish coverage from day one.

#### Scenario: Test file exists for at least one platform script

- **WHEN** the repository is inspected after this change
- **THEN** at least one `.bats` file exists under `.opencode/` or `.ops/`
- **AND** that test file exercises at least one function or behaviour from a platform script

#### Scenario: All initial bats tests pass

- **WHEN** `dagger call bats-test --source ../..` is run after this change
- **THEN** all newly-added `.bats` tests pass with exit code 0
