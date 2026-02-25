---
td-board: adopt-playwright-e2e-playwright-test-organization
td-issue: td-2b42b3
---

# Specification: Playwright Test Organization

## Overview

This spec defines how E2E tests are organized, structured, and named to support maintainability, discovery, and execution across multiple packages in the Backstage dev portal.

## ADDED Requirements

### Requirement: Test Directory Structure

Test files SHALL be colocated with the packages they test, in an `e2e-tests` directory at the package root. Each test file MUST be named with a `.test.ts` suffix and grouped by feature or page component.

#### Scenario: Organizing tests by package
- **WHEN** a package requires E2E tests
- **THEN** tests are placed in `packages/<package-name>/e2e-tests/` directory

#### Scenario: Naming convention for test files
- **WHEN** creating an E2E test file
- **THEN** the file is named `<feature>.test.ts` (e.g., `catalog.test.ts`, `search.test.ts`)

### Requirement: Test Suite Organization

Test files SHALL use `test.describe()` blocks to organize related test cases by feature or workflow. Each describe block MUST be given a clear, concise name that reflects the feature being tested.

#### Scenario: Grouping related tests
- **WHEN** writing tests for a single feature with multiple scenarios
- **THEN** all related tests are wrapped in a `test.describe()` block with a descriptive name

#### Scenario: Nested describe blocks for workflows
- **WHEN** a feature has multiple independent workflows to test
- **THEN** each workflow can have its own nested `test.describe()` block

### Requirement: Test Naming Convention

Individual test cases SHALL be named descriptively using `test()` or `test.only()`. Test names MUST follow the pattern: "Should [action] when [condition]" or "User can [action] in [scenario]".

#### Scenario: Clear test case naming
- **WHEN** defining a test case
- **THEN** the test name clearly describes what is being tested and the expected outcome

### Requirement: Shared Utilities Location

Common test utilities, helpers, and page object models SHALL be placed in a `utils/` subdirectory within `e2e-tests/`. Utilities SHALL be named by function: `page-objects.ts`, `test-data.ts`, `api-helpers.ts`.

#### Scenario: Organizing page objects
- **WHEN** reusing selectors and navigation patterns across tests
- **THEN** page objects are defined in `e2e-tests/utils/page-objects.ts`

#### Scenario: Test data helpers
- **WHEN** multiple tests need the same test data setup
- **THEN** data generation and cleanup functions are in `e2e-tests/utils/test-data.ts`

### Requirement: Comment Documentation

Each test file SHALL include a comment block at the top describing the feature or workflow being tested. Each test.describe() block MAY include a comment explaining the scope of tests within it.

#### Scenario: File-level documentation
- **WHEN** opening a test file
- **THEN** the first comment block explains what feature or workflow is under test

#### Scenario: Describe-block documentation
- **WHEN** a describe block tests a complex workflow
- **THEN** the describe block includes a comment explaining the scope and any setup expectations

### Requirement: Test File Module Structure

Test files SHALL export helper functions or page object classes that are reused across multiple test files. Circular dependencies MUST be avoided through proper module organization.

#### Scenario: Avoiding circular dependencies
- **WHEN** utilities are organized hierarchically
- **THEN** lower-level utilities (selectors, API calls) do not import from higher-level utilities (workflows, test data)

#### Scenario: Exporting reusable test utilities
- **WHEN** a utility is needed by multiple test files
- **THEN** it is exported from `utils/` with clear, namespaced functions

