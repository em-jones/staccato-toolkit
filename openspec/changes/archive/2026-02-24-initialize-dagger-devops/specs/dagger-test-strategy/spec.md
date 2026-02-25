---
td-board: initialize-dagger-devops-dagger-test-strategy
td-issue: td-84cacf
---

# Specification: dagger-test-strategy

## Overview

Defines the test strategy for dagger modules, covering unit tests for task logic, integration tests that execute against a real container runtime, and CI gating rules.

## ADDED Requirements

### Requirement: Dagger task functions are unit-testable

Each dagger task function SHALL be structured so that its core logic can be tested without a running container runtime. Side-effectful container interactions SHALL be isolated at a boundary per `patterns/code/functional-design.md`.

#### Scenario: Pure logic separated from container calls

- **WHEN** a dagger task function is reviewed
- **THEN** input validation, argument construction, and result parsing are in pure functions
- **THEN** container execution is called through a single injectable interface

#### Scenario: Unit tests exist for task logic

- **WHEN** the test suite runs via `go test`
- **THEN** at least one unit test per task function validates its argument construction or result parsing
- **THEN** tests follow the AAA pattern per `patterns/code/testing.md`

### Requirement: Integration tests execute dagger tasks against a real container runtime

The test suite SHALL include at least one integration test per dagger task that runs the task end-to-end using a real dagger engine.

#### Scenario: Integration tests pass in CI with container runtime available

- **WHEN** a CI environment with Docker available runs the integration test suite
- **THEN** each integration test invokes its dagger task and asserts the exit code and expected output
- **THEN** all integration tests pass on a clean checkout

#### Scenario: Integration tests are skipped when no container runtime is present

- **WHEN** the test runner detects no container runtime (e.g., Docker socket absent)
- **THEN** integration tests are skipped with a clear skip message
- **THEN** the test suite does not fail due to missing runtime

### Requirement: CI pipeline gates on both unit and integration tests

The GitHub Actions pipeline SHALL run unit tests on every push and integration tests on every push where container access is available.

#### Scenario: Unit test failure blocks merge

- **WHEN** a PR is opened with a dagger module change
- **THEN** the unit test job runs
- **THEN** a failure marks the required check as failed, blocking merge

#### Scenario: Integration test job is required and runs with container access

- **WHEN** the CI pipeline runs
- **THEN** the integration test job has Docker available
- **THEN** a failure blocks merge in the same way as unit tests
