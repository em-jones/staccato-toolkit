---
td-board: adopt-playwright-e2e
td-issue: td-800b7c
tech-radar: []
---

# Design: Adopt Playwright E2E Testing

## Context and problem statement

Playwright is actively used for E2E testing in the Backstage dev portal but lacks standardized documentation, organizational patterns, and CI integration. Tests are scattered across the codebase with inconsistent naming conventions, fixture usage, and flakiness mitigation strategies. New team members must reverse-engineer practices from existing tests, leading to inconsistency and maintenance overhead.

## Decision criteria

This design achieves:

- **Establish consistent testing patterns**: Unified test organization, fixture usage, and selector strategies across the platform
- **Document browser compatibility strategy**: Clear decision-making for multi-browser testing and project configuration
- **Reduce test flakiness**: Comprehensive guidance on timeouts, wait strategies, and retry logic
- **Integrate with CI pipeline**: Automated browser provisioning, report generation, and artifact collection
- **Create actionable usage rules**: Coding standards and anti-patterns that guide developers

Explicitly excludes:

- Migration of existing tests to new patterns (only establishes patterns going forward)
- Playwright version upgrades or breaking changes
- Browser-specific debugger integration

## Decided options

### Option 1: Comprehensive specification with detailed usage rules (Selected)

Create separate specs for each major concern (test organization, fixtures, browsers, flakiness, CI) plus a dedicated usage rules spec. Link all requirements to implementation tasks.

**Rationale**: Allows independent team streams to work on different capabilities while sharing a common foundation. Usage rules become a living document for developers to reference during coding.

### Option 2: Monolithic spec with all requirements in one file

Combine all requirements into a single large spec with all cross-dependencies managed centrally.

**Rejected**: Creates bottlenecks during implementation and makes it difficult to focus on individual capability streams.

### Option 3: Minimal spec with patterns documented in code comments

Rely on code comments and inline documentation rather than formal specifications.

**Rejected**: Patterns are harder to discover, harder to maintain across multiple files, and harder to verify compliance.

## Key technical decisions

1. **Multi-browser projects**: Configuration SHALL define separate Playwright projects for Chromium, Firefox, and WebKit. Each test file runs in all browsers unless explicitly skipped.

2. **Fixture-based pattern reuse**: Fixtures (authenticated user, test data, API mocks) SHALL provide reusable test contexts that eliminate boilerplate and enforce patterns.

3. **Expectation-driven waits**: Tests SHALL use Playwright's built-in expectations (`toBeVisible()`, `toBeEnabled()`) with auto-retry rather than manual waits or timeouts.

4. **Automatic retry with artifact capture**: CI SHALL retry failed tests up to 2 times. Traces and videos SHALL be captured only on first retry to reduce storage.

5. **Parallel execution in CI**: E2E tests SHALL run in parallel across multiple workers. Test distribution SHALL be based on file sharding.

6. **Deterministic test data**: All test data factories SHALL produce consistent output. Random data SHALL not be used except for unique values derived from seeds/timestamps.

## Risks and trade-offs

- **Risk**: Multi-browser execution increases CI time → **Mitigation**: Run tests in parallel and use fast-fail strategy (fail immediately if one browser fails critical path)
- **Risk**: Flaky tests become visible and may temporarily block CI → **Mitigation**: Introduce flaky-test quarantine queue that does not block merge
- **Trade-off**: Strict selector policies (no CSS/XPath) may require test-id attributes on components → **Justification**: Improves accessibility and reduces brittleness of tests
- **Risk**: Fixture complexity increases learning curve → **Mitigation**: Provide extensive fixture documentation and example tests

## Migration plan

1. **Phase 1**: Publish all specs and usage rules (this change)
2. **Phase 2**: Create fixture library in `packages/e2e-test-utils/fixtures.ts` (linked task)
3. **Phase 3**: Integrate E2E test execution into Dagger CI pipeline (linked task)
4. **Phase 4**: Audit and refactor existing tests to comply with new standards (tracked separately)

Rollback: Standards are documented guidance; existing tests can continue to operate. No breaking changes to Playwright configuration.

## Confirmation

How to verify this design is met:

- **Artifact**: All specs authored and linked to requirement tasks
- **Test coverage**: Requirements in specs have corresponding test implementation tasks
- **CI integration**: E2E tests run and report artifacts in CI pipeline (verified in Phase 3)
- **Standards adoption**: New tests follow patterns defined in usage rules

## Open questions

- Should we enforce eslint rules to prevent manual `setTimeout()` calls in test files?
- What is the acceptable flaky-test threshold before auto-quarantine is triggered?
- Should screenshots and traces be retained indefinitely or rotated after N days?

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| n/a | — | n/a — documented patterns are part of this OpenSpec change | n/a |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------| 
| Playwright E2E testing | implementation agents | `.opencode/skills/playwright-e2e-testing/SKILL.md` | create | New skill needed to guide implementation of E2E testing standards and patterns |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | E2E testing is a cross-platform concern; no new curated components |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| n/a | — | — |

