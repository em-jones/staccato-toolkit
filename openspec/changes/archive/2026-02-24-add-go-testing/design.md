---
td-board: add-go-testing
td-issue: td-d31af8
status: accepted
date: 2026-02-24
---

# Design: Add Go Testing Tooling

## Context

The `adopt-golang-monorepo` change (td-77c2c4) introduced three Go modules under `src/staccato-toolkit/`:
- `cli` — command-line interface
- `server` — HTTP server
- `domain` — core domain logic

These modules currently have **no test files**. The existing dagger workloads module (`src/ops/workloads`) has its own tests (`platform_test.go`, `tests/integration_test.go`), but the dagger `Test` function does not yet cover staccato-toolkit.

Without test infrastructure:
- Developers cannot write tests for new functionality
- CI cannot validate staccato-toolkit code correctness
- The project lacks a foundation for test-driven development

This design establishes the test infrastructure foundation at a **scaffold stage** — tests are intentionally minimal (smoke tests). Behavior-driven tests will be added in subsequent capability-specific changes as functionality grows.

## Decision

### Test Framework: Go's Built-in `go test`

Use Go's standard testing package (`testing`) with no additional frameworks at this stage.

**Rationale**:
- Zero additional dependencies — `go test` is part of the Go toolchain already in devbox
- Sufficient for smoke tests (package compilation, basic execution)
- Well-supported by all Go tooling (IDEs, CI systems, coverage tools)
- Can be extended with `testify` or other libraries when behavior tests are needed

### Test Organization

Each module SHALL have at least one `_test.go` file with at least one passing test:

- `src/staccato-toolkit/cli/cli_test.go` — smoke test confirming CLI package compiles
- `src/staccato-toolkit/server/server_test.go` — smoke test confirming server package compiles
- `src/staccato-toolkit/domain/domain_test.go` — smoke test confirming domain package compiles

Example smoke test pattern:
```go
package cli_test

import "testing"

func TestPackageCompiles(t *testing.T) {
    // This test confirms the package compiles and test infrastructure works
    t.Log("cli package compiled successfully")
}
```

### Dagger Integration

Extend the dagger workloads `Test` function (`src/ops/workloads/main.go`) to:
1. Run `go test ./...` in each staccato-toolkit module directory
2. Fail with non-zero exit code if any test fails
3. Aggregate test output for CI visibility

The dagger function SHALL use the `golang` dagger module to:
- Mount the staccato-toolkit source directories
- Execute `go test ./...` in each module
- Return combined test results

### CI Integration

The existing CI pipeline (`.github/workflows/ci.yml`) already runs `dagger call test`. No changes to the workflow file are needed — the dagger `Test` function extension automatically adds staccato-toolkit coverage.

**Verification**:
- CI job SHALL execute `dagger call test`
- Job output SHALL include staccato-toolkit test results
- Job SHALL fail if any staccato-toolkit test fails

## Alternatives Considered

### Alternative 1: Use `testify` assertion library

**Rejected for scaffold stage**. 

`testify` provides rich assertions (`assert.Equal`, `require.NoError`, etc.) and is valuable for behavior tests. However:
- Adds external dependency when standard library is sufficient for smoke tests
- Behavior tests (which would benefit from `testify`) don't exist yet
- Can be adopted later when behavior-driven tests are added

**Decision**: Defer `testify` adoption until behavior tests are needed.

### Alternative 2: Add test coverage reporting

**Rejected for scaffold stage**.

Coverage metrics (via `go test -cover` or dedicated tools) are useful for mature test suites. However:
- Smoke tests provide trivial coverage (near 0%)
- Coverage targets are meaningless until behavior tests exist
- Coverage tooling adds complexity without value at this stage

**Decision**: Defer coverage reporting to a future quality tooling enhancement.

### Alternative 3: Separate dagger function for staccato-toolkit tests

**Rejected**.

Could create `dagger call test-staccato` separate from `dagger call test`. However:
- Increases CI complexity (multiple test commands)
- Fragments test execution (developers must remember multiple commands)
- No clear benefit — single `Test` function can cover all Go tests

**Decision**: Extend existing `Test` function to cover all Go modules.

## Risks

### Risk 1: Tests remain trivially passing

**Description**: Smoke tests confirm compilation but don't validate behavior. The test suite could remain green while bugs are introduced.

**Mitigation**: 
- Document explicitly that behavior tests are required per-capability in future changes
- Smoke tests are a scaffold — they establish infrastructure, not correctness validation
- Each capability change SHALL add behavior tests for new functionality

**Acceptance**: This is an expected and acceptable state at scaffold stage.

### Risk 2: Dagger function complexity

**Description**: Extending the dagger `Test` function to cover multiple modules could increase complexity.

**Mitigation**:
- Use dagger's `golang` module for standardized test execution
- Keep test logic simple (iterate modules, run `go test ./...`, aggregate results)
- Document the dagger function's behavior in code comments

**Likelihood**: Low — dagger provides good abstractions for multi-module testing.

## Technology Adoption

### Patterns Reviewed

- **`code/testing`** ✓ — Reviewed for Go testing patterns, test file organization, smoke test examples
- **`delivery/ci-cd`** ✓ — Reviewed for CI pipeline integration, test failure gates, dagger usage
- **`delivery/quality-tooling`** ✓ — Reviewed for test runner configuration, dagger module patterns

All relevant usage rules exist and have been linked to requirement tasks.

### New Technologies

None — `go test` is already part of the Go toolchain in devbox.

## Agent Skills

No custom agent skills are required. Standard code implementation and CI configuration skills are sufficient.

## Catalog Entities

Not applicable — this change does not introduce new Backstage catalog entities.

## Implementation Notes

### Execution Order

1. **Add test files** (R1) — Create `_test.go` files in each module with smoke tests
2. **Extend dagger Test function** (R2) — Wire staccato-toolkit modules into dagger test execution
3. **Verify CI integration** (R3) — Confirm CI runs updated dagger function and enforces test failures

### Cross-Cutting Tasks

A single cross-cutting task covers dagger integration:
- **"Wire staccato-toolkit tests into dagger Test function"** — Extends `src/ops/workloads/main.go` to execute staccato-toolkit tests

This task is a child of the root issue (td-d31af8) and supports all three requirements.

### Verification

After implementation:
- Run `go test ./...` in each staccato-toolkit module — all tests SHALL pass
- Run `dagger call test` from repository root — output SHALL include staccato-toolkit test results
- Trigger CI on a test branch — CI SHALL execute staccato-toolkit tests and report results
