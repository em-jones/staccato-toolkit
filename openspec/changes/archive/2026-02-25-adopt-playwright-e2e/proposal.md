---
td-board: adopt-playwright-e2e
td-issue: td-800b7c
---

# Proposal: Adopt Playwright E2E Testing

## Why

Playwright is actively used for end-to-end testing of the Backstage dev portal but has zero documentation on test organization, fixture patterns, browser selection, flakiness mitigation, or CI integration. New team members must reverse-engineer practices from scattered test files. Documenting this strategy creates a shared foundation for reliable, maintainable E2E tests across the platform.

## What Changes

- Establish E2E testing strategy and architectural patterns for Playwright-based testing
- Document test organization, fixture patterns, and reusable utilities
- Define browser selection criteria and multi-browser testing approach
- Implement flakiness mitigation strategies (retries, timeouts, wait strategies)
- Integrate comprehensive E2E testing into CI pipeline with browser provisioning and artifact collection
- Create usage rules for test authoring and quality standards

## Capabilities

### New Capabilities

- `playwright-test-organization`: Test file structure, fixture patterns, and utility organization
- `playwright-fixture-patterns`: Reusable fixtures, context setup, and test data management
- `playwright-browser-selection`: Browser compatibility strategy and project configuration
- `playwright-flakiness-mitigation`: Retry logic, wait strategies, and test stability patterns
- `playwright-ci-integration`: CI pipeline integration, browser provisioning, and artifact collection
- `playwright-usage-rules`: Test authoring standards and quality requirements

### Modified Capabilities

None

## Impact

- **Affected services/modules**: Backstage dev portal (`src/dev-portal/backstage`)
- **API changes**: No
- **Data model changes**: No
- **Dependencies**: Playwright is already a dependency; no new runtime dependencies
- **Documentation**: Requires creation of specs and usage rules in `.opencode/rules/patterns/`
