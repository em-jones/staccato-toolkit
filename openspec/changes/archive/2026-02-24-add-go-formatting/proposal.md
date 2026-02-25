---
td-board: add-go-formatting
td-issue: td-440716
---

# Proposal: Add Go Formatting Tooling

## Why

Following the adoption of Go modules in the monorepo (td-77c2c4), we currently have no automated enforcement of Go code formatting standards. Without formatter enforcement:

- Code can drift from the canonical `gofmt` style without CI catching it
- Pull requests may introduce inconsistent formatting, creating noise in diffs
- Developers must manually remember to run `gofmt` before committing
- Code reviews waste time discussing formatting instead of logic

The Go community has a strong convention around `gofmt` as the canonical formatter. Enforcing this in CI ensures all Go code maintains consistent, idiomatic formatting.

## What Changes

This change introduces automated Go formatting checks for all Go modules in the monorepo:
- `src/staccato-toolkit/cli`
- `src/staccato-toolkit/server`
- `src/staccato-toolkit/domain`
- `src/ops/workloads`

**Implementation approach:**
1. Add a `Format` function to the dagger workloads module that runs `gofmt -l` across all Go source files
2. Add a format check step to the CI pipeline (`.github/workflows/ci.yml`) that calls `dagger call format`
3. Ensure all existing Go files are `gofmt`-clean before enforcement begins

**Tooling:**
- `gofmt` (ships with Go toolchain, already available via devbox)
- Dagger integration for consistent local/CI execution

## Capabilities

This change introduces one new capability:

### `go-formatting`

Automated enforcement of Go code formatting standards using `gofmt`.

**Provides:**
- CI pipeline step that blocks merge if Go files are not formatted
- Dagger function for local format checking
- Consistent, idiomatic Go code formatting across all modules

**Requirements:**
- All Go source files must pass `gofmt -l` (no output = formatted correctly)
- CI must fail if any files require formatting
- Format check must run on every pull request

## Impact

**Developer Experience:**
- Eliminates formatting debates in code reviews
- Provides fast feedback via CI if formatting is incorrect
- Developers can run `dagger call format` locally before pushing

**Code Quality:**
- Enforces Go community formatting standards
- Reduces diff noise from inconsistent formatting
- Makes codebase more approachable for Go developers

**CI/CD:**
- Adds one additional check to CI pipeline (fast: `gofmt` is very quick)
- Blocks merge on formatting violations

**Risks:**
- If existing Go files are not `gofmt`-clean, they must be formatted atomically as part of this change to avoid breaking CI
- Future consideration: `goimports` (superset of `gofmt` that also manages imports) — deferred to avoid scope creep

## Dependencies

- Requires: td-77c2c4 (adopt-golang-monorepo) — provides the Go modules to format
- Blocks: td-2c34c3 (Gate: Go quality tooling in place for staccato-toolkit)

## Technology Adoption

- **delivery/quality-tooling**: `gofmt` as formatting standard
- **delivery/ci-cd**: Format check integration in CI pipeline
