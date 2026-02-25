---
td-board: add-go-testing
td-issue: td-d31af8
---

# Proposal: Add Go Testing Tooling

## Why

The `adopt-golang-monorepo` change (td-77c2c4) introduced three new Go modules under `src/staccato-toolkit/`:
- `cli` — command-line interface for staccato operations
- `server` — HTTP server for staccato services
- `domain` — core domain logic

These modules currently have **no test suite**. Without test coverage:
- Code can grow without a safety net, increasing risk of regressions
- Developers lack confidence when refactoring or extending functionality
- CI cannot validate correctness of changes to staccato-toolkit
- The project lacks a foundation for test-driven development

The existing CI pipeline (`.github/workflows/ci.yml`) runs `dagger call test`, which invokes the dagger workloads module's `Test` function. However, this function does not yet cover the staccato-toolkit modules — only the dagger workloads module itself has test files (`platform_test.go`, `tests/integration_test.go`).

## What Changes

This change introduces **go testing capability** for staccato-toolkit modules:

1. **Initial test files** — Add at least one `_test.go` file to each module (`cli`, `server`, `domain`) with passing smoke tests that confirm:
   - The package compiles correctly
   - The test runner can execute tests
   - The test infrastructure is wired correctly

2. **Dagger integration** — Extend the dagger workloads `Test` function to run `go test ./...` across staccato-toolkit modules, failing the build if any test fails

3. **CI coverage** — Ensure the CI pipeline's test job invokes `dagger call test` and covers staccato-toolkit modules, blocking merge on test failure

At this scaffold stage, tests are intentionally minimal (smoke tests). Behavior-driven tests will be added in subsequent capability-specific changes as functionality grows.

## Capabilities

This change delivers **one capability**:

- **`go-testing`** — Ability to run `go test` across staccato-toolkit modules via dagger, with CI enforcement

## Impact

### Benefits
- Establishes test infrastructure foundation for future behavior tests
- Enables test-driven development for staccato-toolkit
- Provides CI-enforced quality gate for Go code
- Reduces risk of regressions as codebase grows

### Risks
- Tests remain trivially passing until behavior is added — **accepted at scaffold stage**; behavior tests are required per-capability in future changes
- Additional test execution time in CI — **minimal impact**; Go tests are fast and modules are small

### Dependencies
- **Requires**: `adopt-golang-monorepo` (td-77c2c4) — Go modules must exist
- **Blocks**: Quality tooling gate (td-2c34c3) — testing is prerequisite for production-ready Go code

### Technology Adoption
- **`code/testing`** — Go testing patterns, test file organization
- **`delivery/ci-cd`** — CI pipeline integration, build failure gates
- **`delivery/quality-tooling`** — Test runner configuration, dagger integration

All relevant usage rules exist and will be reviewed during design.
