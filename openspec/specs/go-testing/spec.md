---
td-board: add-go-testing-go-testing
td-issue: td-92fe43
---

# Spec: go-testing capability

## Overview

This specification defines the requirements for establishing Go test infrastructure for staccato-toolkit modules. The capability enables developers to run `go test` across all modules, integrated with dagger and enforced by CI.

At this scaffold stage, tests are intentionally minimal (smoke tests). Behavior-driven tests will be added in subsequent capability-specific changes.

## Requirements

### R1: Initial test file per module

**Each of `cli`, `server`, and `domain` modules SHALL have at least one `_test.go` file with at least one passing test.**

The test confirms:
- The package compiles correctly
- The test runner can execute tests
- The test infrastructure is wired correctly

#### Scenario: CLI module has executable smoke test

**GIVEN** the `src/staccato-toolkit/cli` module exists  
**WHEN** a developer runs `go test ./...` in the cli directory  
**THEN** at least one test executes and passes  
**AND** the test output confirms the package compiled successfully

#### Scenario: Server module has executable smoke test

**GIVEN** the `src/staccato-toolkit/server` module exists  
**WHEN** a developer runs `go test ./...` in the server directory  
**THEN** at least one test executes and passes  
**AND** the test output confirms the package compiled successfully

#### Scenario: Domain module has executable smoke test

**GIVEN** the `src/staccato-toolkit/core` module exists  
**WHEN** a developer runs `go test ./...` in the core directory  
**THEN** at least one test executes and passes  
**AND** the test output confirms the package compiled successfully

---

### R2: Dagger test function covers staccato-toolkit

**The dagger workloads `Test` function SHALL run `go test ./...` across staccato-toolkit modules and fail if any test fails.**

This ensures:
- All staccato-toolkit tests are executed via dagger
- Test failures block the build
- CI can invoke a single `dagger call test` command to cover all Go tests

#### Scenario: Dagger test function executes staccato-toolkit tests

**GIVEN** staccato-toolkit modules have test files  
**WHEN** a developer runs `dagger call test` from the repository root  
**THEN** the dagger function executes `go test ./...` in each staccato-toolkit module  
**AND** the command returns exit code 0 if all tests pass

#### Scenario: Dagger test function fails on test failure

**GIVEN** a staccato-toolkit module has a failing test  
**WHEN** a developer runs `dagger call test`  
**THEN** the dagger function returns a non-zero exit code  
**AND** the output includes the failing test details

---

### R3: Test suite runs in CI

**The CI pipeline's test job SHALL invoke `dagger call test` covering staccato-toolkit modules, blocking merge on test failure.**

This ensures:
- All pull requests execute staccato-toolkit tests
- Test failures prevent merge
- Test coverage is enforced automatically

#### Scenario: CI executes staccato-toolkit tests

**GIVEN** a pull request modifies staccato-toolkit code  
**WHEN** the CI pipeline runs  
**THEN** the test job invokes `dagger call test`  
**AND** the job includes staccato-toolkit test results in the output

#### Scenario: CI blocks merge on test failure

**GIVEN** a pull request introduces a failing staccato-toolkit test  
**WHEN** the CI pipeline runs  
**THEN** the test job fails with a non-zero exit code  
**AND** the pull request cannot be merged until tests pass

---

## Out of Scope

- **Behavior-driven tests** — Tests at this stage are smoke tests only; behavior tests are added per-capability as functionality grows
- **Test coverage metrics** — Coverage tooling is deferred to a future quality tooling enhancement
- **Mocking/stubbing infrastructure** — Deferred until complex behavior requires it
- **Benchmark tests** — Performance testing is out of scope for this scaffold change
