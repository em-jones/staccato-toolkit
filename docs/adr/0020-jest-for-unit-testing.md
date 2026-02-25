# 0020. Jest for Unit Testing

**Date:** 2026-02-25

## Status
Accepted

## Context

Backstage plugins and frontend components require unit testing for React components, TypeScript utilities, and business logic. We need a testing framework with TypeScript support, snapshot testing, and mocking capabilities.

**Jest** is the standard testing framework for React applications and provides:
- Zero-config TypeScript support with ts-jest
- Snapshot testing for React components
- Built-in mocking and spying
- Code coverage reporting
- Fast parallel test execution

Alternatives considered:
- **Vitest**: Faster and modern but less ecosystem maturity
- **Mocha + Chai**: Flexible but requires more configuration
- **Testing Library alone**: Component testing but not a full framework

Backstage uses Jest by default, and the ecosystem tooling (testing-library, MSW) integrates seamlessly.

## Decision

Adopt Jest as the standard unit testing framework for all Backstage plugins and TypeScript code.

Tests must:
- Use Jest with `@testing-library/react` for component tests
- Follow Backstage testing conventions and utilities
- Achieve minimum 80% code coverage for critical paths
- Use snapshot tests sparingly (prefer explicit assertions)
- Mock external dependencies (APIs, services) with MSW or Jest mocks

## Consequences

**Easier:**
- Zero-config TypeScript support (ts-jest)
- Rich assertion library and matchers
- Snapshot testing for React components
- Built-in code coverage reporting
- Parallel test execution for speed
- Native Backstage ecosystem integration

**Harder:**
- Snapshot tests can become brittle and noisy
- Mocking complex dependencies requires setup
- Jest configuration can grow complex for edge cases
- Slower than Vitest for large test suites

**Maintenance implications:**
- Jest configuration must be maintained in `jest.config.js`
- Snapshots must be reviewed carefully in PRs
- Coverage thresholds should be enforced in CI
- Mock data and fixtures must be maintained
- Test utilities should be shared across packages

## Related Decisions

- ADR-0002: Adopt TypeScript + React for frontend
- ADR-0021: Playwright for E2E testing
- ADR-0019: Yarn workspaces monorepo
- Usage rule: Frontend testing patterns
