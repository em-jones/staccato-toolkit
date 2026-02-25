---
td-board: adopt-playwright-e2e-playwright-flakiness-mitigation
td-issue: td-d2ca99
---

# Specification: Playwright Flakiness Mitigation

## Overview

This spec defines strategies and patterns for reducing test flakiness through proper wait strategies, timeout configuration, and retry logic.

## ADDED Requirements

### Requirement: Automatic Retry Configuration

Failing tests SHALL be automatically retried. In CI, tests SHALL retry up to 2 times on first failure. In local development, retries SHALL default to 0 but be configurable. Tests that fail on retry SHALL be treated as flaky and reported separately.

#### Scenario: Automatic retry in CI
- **WHEN** a test fails in CI
- **THEN** the test automatically retries up to 2 times

#### Scenario: First-retry trace capture
- **WHEN** a test fails and is retried
- **THEN** trace/video is automatically captured during retry for debugging

### Requirement: Timeout Configuration

Test-level timeouts SHALL be configured based on test type: unit/integration tests 30s, E2E navigation tests 60s, long-running workflows 120s. Timeouts SHALL be enforced strictly to catch hanging tests early.

#### Scenario: Navigation timeout
- **WHEN** a test navigates to a page
- **THEN** the timeout is 60 seconds for the navigation to complete

#### Scenario: Long-running workflow timeout
- **WHEN** a test exercises a multi-step workflow (e.g., creation, edit, delete)
- **THEN** timeout is set to 120 seconds

### Requirement: Expectation Wait Strategies

Tests SHALL use Playwright's built-in wait strategies (`.toBeVisible()`, `.toBeEnabled()`) rather than manual `waitFor()` calls. Manual waits SHALL only be used when Playwright's built-ins cannot express the condition.

#### Scenario: Waiting for visibility
- **WHEN** a test needs an element to appear on screen
- **THEN** the test uses `expect(locator).toBeVisible()` with auto-retry

#### Scenario: Waiting for dynamic content
- **WHEN** a test needs to wait for async content to load
- **THEN** the test uses `.waitForLoadState('networkidle')` or similar built-in

### Requirement: Deterministic Test Data

Tests SHALL use deterministic test data with predictable IDs and values. Random data SHALL not be used except where necessary (e.g., unique email addresses). Test data factories SHALL produce consistent output for the same input.

#### Scenario: Consistent test data IDs
- **WHEN** a test creates an entity
- **THEN** the entity ID is derived deterministically (e.g., hash of timestamp + name)

#### Scenario: No random test data
- **WHEN** a test needs a unique value (e.g., email)
- **THEN** the value is generated from a seed/timestamp, not Math.random()

### Requirement: Page Load State Verification

Tests that navigate SHALL verify page load state. Before interacting with elements, tests SHALL call `.waitForLoadState('domcontentloaded')` or `.waitForLoadState('networkidle')` as appropriate.

#### Scenario: Waiting for DOM to load
- **WHEN** a test navigates to a new page
- **THEN** it calls `.waitForLoadState('domcontentloaded')` before querying elements

#### Scenario: Waiting for network to idle
- **WHEN** a page has async data loading
- **THEN** test calls `.waitForLoadState('networkidle')` before verifying content

### Requirement: Flaky Test Monitoring and Quarantine

Tests that fail intermittently (flaky tests) SHALL be marked with a `@flaky` tag and moved to a separate quarantine suite. Flaky tests SHALL not block CI. Once fixed, the tag SHALL be removed and tests re-integrated.

#### Scenario: Quarantining a flaky test
- **WHEN** a test is found to be flaky
- **THEN** it is tagged with `@flaky` and runs in a separate job that does not block CI

#### Scenario: Removing flaky status
- **WHEN** a flaky test is fixed
- **THEN** the `@flaky` tag is removed and test re-joins the main suite

### Requirement: Implicit Wait Strategy Override

Tests MAY override the implicit retry/wait timeout using test.slow() or explicit timeout options. The override SHALL be documented with a comment explaining why the override is necessary.

#### Scenario: Slow test marker
- **WHEN** a test is inherently slow (e.g., file upload)
- **THEN** the test calls `test.slow()` to increase timeout and is marked with a comment

#### Scenario: Explicit timeout override
- **WHEN** a specific interaction needs a longer timeout
- **THEN** the timeout is set via `page.goto(url, { waitUntil: 'networkidle', timeout: 120000 })`

