---
td-board: adopt-playwright-e2e-playwright-ci-integration
td-issue: td-c1feeb
---

# Specification: Playwright CI Integration

## Overview

This spec defines how E2E tests are integrated into the CI pipeline, including browser provisioning, artifact collection, and reporting.

## ADDED Requirements

### Requirement: E2E Test Execution in CI

The CI pipeline SHALL execute E2E tests as a required stage after deployment to the test environment. E2E tests SHALL run only after the application has been built and deployed. Failed E2E tests SHALL block merge to main.

#### Scenario: Running E2E tests in CI
- **WHEN** a pull request is opened or commits are pushed
- **THEN** E2E tests automatically run after the application is deployed to the test environment

#### Scenario: Blocking merge on E2E failure
- **WHEN** E2E tests fail
- **THEN** the PR status is marked as failed and merge is blocked

### Requirement: Browser Installation in CI

The CI pipeline SHALL automatically install Playwright browsers before test execution. Browser installation SHALL use the `playwright install` command. Installation SHALL be cached between builds to reduce execution time.

#### Scenario: Installing browsers on first run
- **WHEN** CI runs E2E tests for the first time
- **THEN** Playwright browsers are installed before tests start

#### Scenario: Using cached browsers
- **WHEN** CI runs E2E tests on subsequent builds
- **THEN** cached browsers are reused and installation is skipped

### Requirement: Test Report Generation and Upload

The CI pipeline SHALL generate an HTML test report including screenshots, traces, and videos. Reports SHALL be uploaded as build artifacts and linked in PR comments. Failed test details SHALL be prominently displayed.

#### Scenario: Report generation
- **WHEN** E2E tests complete
- **THEN** Playwright generates an HTML report with all test results

#### Scenario: Uploading report as artifact
- **WHEN** the report is generated
- **THEN** it is uploaded as a CI artifact and linked in the PR

### Requirement: Failure Artifact Collection

Failed tests SHALL collect comprehensive debugging artifacts including screenshots, videos, and traces. Artifacts SHALL be organized by test name and failure reason. Artifacts SHALL be stored with appropriate retention policies.

#### Scenario: Collecting failure artifacts
- **WHEN** a test fails
- **THEN** screenshot, video, and trace are automatically captured

#### Scenario: Organizing artifacts by test
- **WHEN** multiple tests fail
- **THEN** artifacts are organized hierarchically by test name for easy navigation

### Requirement: Environment Configuration for CI

The CI environment SHALL be configured with appropriate environment variables for E2E tests: `CI=true`, `PLAYWRIGHT_URL`, `NODE_ENV=test`. Sensitive credentials (test account passwords, API tokens) SHALL be injected via CI secrets.

#### Scenario: Setting environment variables
- **WHEN** E2E tests run in CI
- **THEN** required environment variables are set and available to Playwright config

#### Scenario: Using secrets for credentials
- **WHEN** tests need to authenticate
- **THEN** credentials are injected from CI secrets, not hardcoded in test files

### Requirement: Parallel Test Execution in CI

E2E tests SHALL be executed in parallel across multiple workers/machines. Test distribution SHALL be based on test suite size or explicit sharding. Parallel execution SHALL reduce overall CI time without increasing resource requirements significantly.

#### Scenario: Distributing tests across workers
- **WHEN** E2E tests run in CI
- **THEN** tests are automatically distributed across multiple parallel workers

#### Scenario: Sharding by test file
- **WHEN** test distribution is configured
- **THEN** each worker runs a subset of test files to reduce execution time

### Requirement: Flaky Test Reporting

The CI pipeline SHALL identify and report tests that pass on retry. Flaky tests SHALL be tracked separately and not block CI. Weekly reports SHALL aggregate flaky test trends to inform prioritization.

#### Scenario: Flaky test identification
- **WHEN** a test fails but passes on retry
- **THEN** it is marked as flaky and reported in test results

#### Scenario: Non-blocking flaky test status
- **WHEN** a flaky test fails
- **THEN** the PR status is warning (not failure) and merge is not blocked

### Requirement: E2E Test Stability Monitoring

The CI system SHALL monitor test pass rates and trend data. Tests with pass rates below 95% SHALL trigger alerts. Stability dashboard SHALL be publicly visible to track improvements over time.

#### Scenario: Detecting low pass rate
- **WHEN** a test's pass rate falls below 95%
- **THEN** an alert is triggered for the team to investigate

#### Scenario: Stability dashboard
- **WHEN** viewing team dashboards
- **THEN** E2E test stability trends are displayed and tracked over time

