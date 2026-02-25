# Specification: Playwright Usage Rules

## Overview

This spec defines the coding standards, patterns, and anti-patterns for writing E2E tests with Playwright.

## Requirements
### Requirement: Test Import Standards

Test files SHALL import from `@playwright/test` only. Other testing libraries (Jest, Vitest, Mocha) SHALL NOT be used in E2E tests. Type definitions SHALL come from Playwright's TypeScript stubs.

#### Scenario: Importing from Playwright
- **WHEN** creating a test file
- **THEN** it imports `test` and `expect` from `@playwright/test`

#### Scenario: No mixing testing frameworks
- **WHEN** writing E2E tests
- **THEN** Jest, Vitest, or other testing libraries are not imported

### Requirement: Async/Await Pattern

All test functions and helper functions SHALL use async/await syntax. Promise.then() chains or callbacks SHALL NOT be used. Tests that use callbacks SHALL be refactored to async/await.

#### Scenario: Async test function
- **WHEN** writing a test
- **THEN** the test function is declared as `async`

#### Scenario: Awaiting page interactions
- **WHEN** interacting with the page
- **THEN** all interactions are awaited (e.g., `await page.click()`)

### Requirement: Selector Best Practices

Tests SHALL prioritize accessible selectors: `getByRole()`, `getByLabel()`, `getByPlaceholder()`. Data-testid attributes MAY be used as a fallback. CSS selectors and XPath SHALL only be used when no accessible selector is available.

#### Scenario: Using role-based selectors
- **WHEN** selecting an element
- **THEN** prefer `getByRole('button', { name: 'Submit' })`

#### Scenario: Fallback to data-testid
- **WHEN** no role-based selector is available
- **THEN** use `getByTestId('custom-element')` instead of CSS selectors

### Requirement: No Implicit Waits

Tests SHALL NOT use manual `setTimeout()` or `sleep()` calls. Implicit waits are race conditions and MUST be avoided. All waits SHALL use Playwright's expectation system or `.waitFor*()` methods.

#### Scenario: Avoiding sleep
- **WHEN** waiting for an element to appear
- **THEN** use `expect(locator).toBeVisible()` instead of `await page.waitForTimeout(1000)`

#### Scenario: Dynamic content loading
- **WHEN** waiting for async content
- **THEN** use `.waitForLoadState('networkidle')` or `.waitForSelector()`

### Requirement: Error Message Clarity

Test failure messages SHALL be clear and actionable. Custom error messages SHALL be used in assertions to explain what was expected. Generic assertion errors SHALL be supplemented with context.

#### Scenario: Clear failure messages
- **WHEN** an assertion fails
- **THEN** the error message explains what was expected and what was found

#### Scenario: Custom error messages
- **WHEN** using `.toEqual()` or manual checks
- **THEN** custom messages describe the business logic, not just the assertion

### Requirement: Test Isolation

Each test SHALL be completely independent. Tests SHALL NOT depend on the order of execution. Tests SHALL NOT share state or side effects. Each test SHALL set up its own preconditions and clean up after itself.

#### Scenario: Test independence
- **WHEN** running tests in any order
- **THEN** each test produces the same result regardless of execution order

#### Scenario: Cleanup after test
- **WHEN** a test creates test data
- **THEN** the test automatically deletes the data in cleanup

### Requirement: Code Organization and Readability

Test files SHALL be organized with setup (fixtures), execution (test steps), and verification (assertions) in clear sections. Complex test logic SHALL be extracted into named helper functions. Comments SHALL explain non-obvious steps.

#### Scenario: Clear test structure
- **WHEN** reading a test
- **THEN** setup, execution, and verification are visually distinct

#### Scenario: Named helper functions
- **WHEN** test logic is complex
- **THEN** complex steps are extracted into helper functions with descriptive names

### Requirement: Avoiding Test Anti-Patterns

Tests SHALL NOT hard-code delays, use external dependencies, or make assumptions about timing. Tests SHALL NOT modify global state or environment variables during execution. Tests SHALL NOT use browser developer tools API.

#### Scenario: No hard-coded delays
- **WHEN** timing is needed
- **THEN** use Playwright's wait strategies instead of `sleep()`

#### Scenario: No global state modification
- **WHEN** a test needs to set environment variables
- **THEN** variables are set in the fixture, not globally, and restored after the test

