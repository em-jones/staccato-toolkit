---
td-board: add-go-linting
td-issue: td-2e8e25
---

# Proposal: Add Go Linting Tooling

## Why

The monorepo now contains four Go modules introduced in the `adopt-golang-monorepo` change:
- `src/staccato-toolkit/cli`
- `src/staccato-toolkit/server`
- `src/staccato-toolkit/domain`
- `src/ops/workloads`

Currently, there is **no linting configured** for these modules. The existing CI pipeline (`.github/workflows/ci.yml`) runs `dagger call lint`, which checks for `.golangci.yml` and returns "no linter configured" because the file does not exist.

Without linting:
- Code quality issues go undetected
- Style inconsistencies accumulate
- Common Go pitfalls are not caught early
- The existing CI lint infrastructure is not utilized

## What Changes

This change introduces `golangci-lint` as the standard linting tool for all Go modules:

1. **Add `.golangci.yml`** at the repository root with sensible defaults and rules appropriate for Go development
2. **Add `golangci-lint` to `devbox.json`** to ensure the tool is available in all development environments
3. **Wire into existing Dagger Lint function** — the function already checks for `.golangci.yml` and runs golangci-lint if present; we just need to provide the configuration
4. **Ensure CI passes** — verify that `dagger call lint` runs successfully in CI for all staccato-toolkit modules

## Capabilities

This proposal introduces **one new capability**:

### `go-linting`

Automated static analysis of Go code using golangci-lint, integrated into the development workflow and CI pipeline.

**Key behaviors**:
- Runs on all Go modules in the workspace
- Enforces consistent code style and quality standards
- Catches common errors and anti-patterns
- Integrates seamlessly with existing dagger-based CI

## Impact

**Positive**:
- Improved code quality across all Go modules
- Early detection of bugs and anti-patterns
- Consistent code style enforcement
- Leverages existing CI infrastructure (no new pipeline steps needed)

**Risks**:
- Initial linting may reveal existing issues in Go modules (acceptable — we want to find these)
- golangci-lint version must be pinned to avoid CI breakage from tool updates
- Configuration must balance strictness with pragmatism

**Dependencies**:
- Requires `adopt-golang-monorepo` (td-77c2c4) — the Go modules being linted
- Existing dagger Lint function already has golangci-lint support

**Effort**: Small (1-2 tasks)
- Configuration file creation
- devbox.json update
- CI verification
