# 0021. Playwright for E2E Testing

**Date:** 2026-02-25

## Status
Accepted

## Context

Backstage requires end-to-end (E2E) testing to validate user workflows across the full application stack (frontend, backend, database). We need a testing framework that supports multiple browsers, reliable selectors, and CI/CD integration.

**Playwright** provides:
- Cross-browser testing (Chromium, Firefox, WebKit)
- Auto-waiting for elements (reduces flaky tests)
- Network interception and mocking
- Parallel test execution
- Built-in test runner and reporting

Alternatives considered:
- **Cypress**: Popular but limited to Chromium-based browsers
- **Selenium**: Mature but slower and more flaky
- **Puppeteer**: Chromium-only, lacks test runner
- **TestCafe**: Cross-browser but smaller ecosystem

Playwright's auto-waiting, cross-browser support, and TypeScript integration make it ideal for Backstage E2E testing.

## Decision

Adopt Playwright as the standard E2E testing framework for Backstage.

E2E tests must:
- Use Playwright Test runner with TypeScript
- Test critical user workflows (plugin navigation, API integration)
- Run against local Kind cluster or test environment
- Execute in CI/CD before merging to main
- Use Page Object Model (POM) for maintainable selectors

## Consequences

**Easier:**
- Cross-browser testing (Chromium, Firefox, WebKit)
- Auto-waiting reduces flaky tests
- Network interception for API mocking
- Parallel test execution for speed
- Rich debugging tools (screenshots, videos, traces)

**Harder:**
- E2E tests slower than unit tests
- Requires running full Backstage stack (frontend + backend)
- Selector maintenance as UI changes
- CI/CD must provision test environment

**Maintenance implications:**
- Playwright configuration must be maintained (`playwright.config.ts`)
- Test selectors should use data-testid attributes
- Page Object Models should encapsulate UI structure
- CI/CD must run Playwright tests in headless mode
- Test artifacts (screenshots, videos) should be captured on failure

## Related Decisions

- ADR-0002: Adopt TypeScript + React for frontend
- ADR-0020: Jest for unit testing
- ADR-0017: Kind for local Kubernetes testing
- Usage rule: E2E testing patterns with Playwright
