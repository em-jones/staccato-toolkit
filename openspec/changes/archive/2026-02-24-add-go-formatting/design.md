---
td-board: add-go-formatting
td-issue: td-440716
status: accepted
date: 2026-02-24
---

# Design: Add Go Formatting Tooling

## Context

Following the adoption of Go modules in the monorepo (td-77c2c4), we need automated enforcement of Go code formatting standards. The Go community has a strong convention around `gofmt` as the canonical formatter, and enforcing this in CI ensures all Go code maintains consistent, idiomatic formatting.

**Current state:**
- CI runs `dagger call lint` via `.github/workflows/ci.yml`
- The dagger workloads module has a `Lint` function but no `Format` function
- No automated format checking exists

**Goal:**
- Add format checking to CI that blocks merge on violations
- Provide developers with a consistent local/CI format check via dagger
- Ensure all Go code follows `gofmt` standards

## Decision

We will implement Go formatting enforcement using `gofmt` via a new dagger `Format` function.

### Implementation approach

1. **Dagger Format function** (`src/ops/workloads/main.go`):
   - Add a `Format()` function that runs `gofmt -l` across all Go source files
   - Use `gofmt -l` (list files that differ from gofmt output) for CI suitability
   - Return non-zero exit status if any files are unformatted
   - Scan all Go modules: `cli`, `server`, `domain`, `workloads`

2. **CI integration** (`.github/workflows/ci.yml`):
   - Add a new job `format-check` that runs `dagger call format`
   - Configure job to block merge on failure
   - Run on pull requests and pushes to main branches

3. **Pre-enforcement cleanup**:
   - Run `gofmt -w` on all existing Go files to ensure they are formatted
   - Commit formatting changes before enabling CI enforcement
   - This ensures CI does not immediately break when format check is added

### Technical details

**`gofmt -l` flag:**
- Lists files whose formatting differs from `gofmt` output
- Exit status 0 if all files are formatted correctly (no output)
- Exit status non-zero if any files need formatting (lists files)
- Suitable for CI: no files modified, only check

**Dagger integration:**
- Consistent execution environment (local and CI)
- Developers can run `dagger call format` before pushing
- Same tooling as existing `dagger call lint`

**Tooling availability:**
- `gofmt` ships with the Go toolchain
- Already available via devbox (no additional packages needed)

## Alternatives Considered

### Alternative 1: goimports instead of gofmt

`goimports` is a superset of `gofmt` that also manages import statements (adds missing imports, removes unused imports, groups imports).

**Pros:**
- Single tool for formatting and import management
- More comprehensive code cleanup

**Cons:**
- Adds import sorting concern (changes import order, which can create noise)
- May add imports that are not needed (false positives)
- Increases scope of this change

**Decision:** Deferred to future change. Start with `gofmt` for pure formatting enforcement, add `goimports` later if import management becomes a pain point.

### Alternative 2: Format check in pre-commit hook

Run `gofmt -l` as a pre-commit hook instead of (or in addition to) CI check.

**Pros:**
- Catches formatting issues before push
- Faster feedback loop for developers

**Cons:**
- Requires all developers to install pre-commit hooks
- Can be bypassed with `--no-verify`
- Does not prevent unformatted code from reaching CI

**Decision:** Not implemented. CI enforcement is sufficient and cannot be bypassed. Developers can opt into pre-commit hooks if desired, but it is not required.

### Alternative 3: Auto-fix in CI

Have CI automatically run `gofmt -w` and commit formatting fixes.

**Pros:**
- Developers do not need to manually fix formatting

**Cons:**
- CI should not modify code (violates principle of CI as read-only check)
- Creates additional commits in pull requests
- Complicates git history

**Decision:** Not implemented. CI only checks; developers run `gofmt -w` locally to fix.

## Risks

### Risk 1: Pre-existing unformatted files

**Impact:** If existing Go files are not `gofmt`-clean, enabling CI enforcement will immediately break CI.

**Mitigation:**
- Run `gofmt -l` on entire codebase before adding CI check
- If any files are unformatted, run `gofmt -w` to fix them
- Commit formatting changes atomically as part of this change
- Enable CI check only after all files are formatted

### Risk 2: Developer friction

**Impact:** Developers may be surprised by CI failures if they are not used to running `gofmt`.

**Mitigation:**
- Document the format check in the change proposal
- CI output lists which files are unformatted and how to fix them
- Developers can run `dagger call format` locally before pushing

### Risk 3: False positives

**Impact:** `gofmt` may flag files that are intentionally formatted differently (e.g., generated code).

**Mitigation:**
- `gofmt` is deterministic and follows Go community standards (false positives are rare)
- If generated code is not `gofmt`-clean, regenerate it with `gofmt` applied
- For truly exceptional cases, exclude files from format check (not expected to be needed)

## Technology Adoption

This design has been reviewed against the following usage rules:

### delivery/quality-tooling
- **Status:** Reviewed
- **Alignment:** `gofmt` is the canonical Go formatter and aligns with quality tooling standards
- **Notes:** Using dagger for consistent local/CI execution follows existing lint integration pattern

### delivery/ci-cd
- **Status:** Reviewed
- **Alignment:** Adding format check as a CI job follows existing CI pipeline patterns
- **Notes:** Format check is fast (gofmt is very quick) and does not significantly increase CI time

### code/naming
- **Status:** Reviewed
- **Alignment:** `gofmt` enforces Go naming conventions implicitly (e.g., exported vs unexported names)
- **Notes:** No additional naming rules needed; `gofmt` handles this

## Agent Skills

No new agent skills are required for this change. Standard implementation skills apply:
- Dagger module development (Go)
- CI pipeline configuration (GitHub Actions)
- Shell scripting for format checks

## Catalog Entities

Not applicable. This change does not introduce new catalog entities (no new services, libraries, or infrastructure components).

## Implementation Tasks

The following tasks implement this design:

1. **td-6ae9e3**: Implement gofmt dagger function
   - Add `Format()` function to `src/ops/workloads/main.go`
   - Run `gofmt -l` on all Go modules
   - Return non-zero exit status if any files are unformatted

2. **td-e4a554**: Implement format check in CI pipeline
   - Add `format-check` job to `.github/workflows/ci.yml`
   - Call `dagger call format`
   - Block merge on failure

3. **td-ee7bec**: Implement all existing Go files pass gofmt
   - Run `gofmt -l` on all Go files
   - If any files are unformatted, run `gofmt -w` to fix them
   - Commit formatting changes

4. **Cross-cutting CI integration** (see Step 8 below)

## Success Criteria

- [ ] Dagger `Format` function exists and correctly identifies unformatted Go files
- [ ] CI pipeline includes format check job that blocks merge on failure
- [ ] All Go files in the repository pass `gofmt -l` with no output
- [ ] Developers can run `dagger call format` locally to check formatting before pushing
- [ ] CI provides actionable feedback when format check fails (lists unformatted files)

## References

- [gofmt documentation](https://pkg.go.dev/cmd/gofmt)
- [Effective Go: Formatting](https://go.dev/doc/effective_go#formatting)
- Related change: td-77c2c4 (adopt-golang-monorepo)
