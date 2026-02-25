# Specification: Playwright Fixture Patterns

## Overview

This spec defines reusable fixture patterns for Playwright tests, including context setup, page objects, test data management, and resource lifecycle management.

## Requirements
### Requirement: Base Page Fixture

Test files SHALL use a base page fixture that provides a standardized `page` context with pre-configured navigation and assertion helpers. The fixture SHALL initialize the page, set viewport size, and handle navigation timeouts.

#### Scenario: Creating tests with base page fixture
- **WHEN** a test is created
- **THEN** the fixture automatically provides a configured `page` context ready for navigation

#### Scenario: Consistent viewport across tests
- **WHEN** a page fixture is initialized
- **THEN** the viewport is set to a standard size (e.g., 1280x720) for consistent rendering

### Requirement: Authenticated User Fixture

Tests that require authentication SHALL use an `authenticatedUser` fixture that sets up login state before test execution. The fixture SHALL handle cookie/token persistence across test cases in the same suite.

#### Scenario: Logging in before a test
- **WHEN** a test requires user authentication
- **THEN** the fixture automatically logs in using test credentials and persists the session

#### Scenario: Session isolation per test
- **WHEN** a test completes
- **THEN** authentication state is cleared and the next test starts with a fresh login

### Requirement: Test Data Fixture

Tests SHALL use a `testData` fixture that provides factory functions for creating test entities (users, catalogs, components). The fixture SHALL clean up created entities after test completion.

#### Scenario: Creating test entities
- **WHEN** a test needs to create test data
- **THEN** factory functions create entities with predictable names/IDs and return their identifiers

#### Scenario: Automatic cleanup after test
- **WHEN** a test completes
- **THEN** all entities created by the testData fixture are automatically deleted

### Requirement: API Mock Fixture

Tests that need to mock API responses SHALL use an `apiMock` fixture that intercepts HTTP calls and returns mock data. The fixture SHALL support both request matching by URL and by body content.

#### Scenario: Mocking API responses
- **WHEN** a test needs to mock an API endpoint
- **THEN** the fixture intercepts requests and returns predefined responses

#### Scenario: Verifying mocked requests
- **WHEN** a test makes an API call through the page
- **THEN** the fixture captures the request and allows verification of parameters

### Requirement: Browser Context Fixture

Multi-tab or multi-window tests SHALL use a `browserContext` fixture that creates isolated browser contexts. The fixture SHALL handle context cleanup and prevent cross-context data leakage.

#### Scenario: Creating multiple contexts
- **WHEN** a test needs to simulate multiple user sessions
- **THEN** the fixture provides separate browser contexts with independent storage

#### Scenario: Context isolation
- **WHEN** tests run in separate contexts
- **THEN** cookies, local storage, and session data are isolated between contexts

### Requirement: Accessibility Audit Fixture

Tests that verify accessibility compliance SHALL use an `a11yAudit` fixture that runs automated accessibility checks on page load or specific interactions. The fixture SHALL report violations and maintain an audit log.

#### Scenario: Running accessibility checks
- **WHEN** accessibility testing is enabled for a test
- **THEN** the fixture runs automated checks and reports violations

#### Scenario: Auditing specific components
- **WHEN** a specific component is tested
- **THEN** the audit fixture can scan just that component and report violations

### Requirement: Screenshot Fixture

Tests that require visual regression detection SHALL use a `screenshot` fixture that captures screenshots and compares them against baselines. The fixture SHALL support both full-page and component-specific screenshots.

#### Scenario: Capturing baseline screenshot
- **WHEN** a visual test runs for the first time
- **THEN** the screenshot is saved as a baseline for future comparisons

#### Scenario: Comparing against baseline
- **WHEN** a test re-runs
- **THEN** the screenshot is compared against the baseline and differences are reported

