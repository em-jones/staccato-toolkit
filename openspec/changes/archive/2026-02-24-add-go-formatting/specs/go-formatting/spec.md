---
td-board: add-go-formatting-go-formatting
td-issue: td-d02b5c
---

# Specification: go-formatting capability

## Overview

The `go-formatting` capability enforces Go code formatting standards using `gofmt` for all Go modules in the monorepo. This ensures consistent, idiomatic Go code formatting and prevents unformatted code from being merged.

## Requirements

### REQ-1: gofmt dagger function

The dagger workloads module SHALL expose a `Format` function that:
- Runs `gofmt -l` across all Go source files in the monorepo
- Returns a list of files that are not formatted (if any)
- Exits with non-zero status if any files require formatting
- Exits with zero status if all files are correctly formatted

**Rationale:** `gofmt -l` lists files that differ from `gofmt` output, making it suitable for CI checks. The dagger integration ensures consistent behavior between local development and CI.

**Scenarios:**

#### SCENARIO: All Go files are formatted correctly
**GIVEN** all Go source files in the repository are formatted according to `gofmt` standards  
**WHEN** the dagger Format function is invoked  
**THEN** the function SHALL exit with status 0  
**AND** no files SHALL be listed in the output

#### SCENARIO: Some Go files are not formatted
**GIVEN** one or more Go source files are not formatted according to `gofmt` standards  
**WHEN** the dagger Format function is invoked  
**THEN** the function SHALL exit with non-zero status  
**AND** all unformatted files SHALL be listed in the output

#### SCENARIO: Format check runs on all Go modules
**GIVEN** the monorepo contains multiple Go modules (`cli`, `server`, `domain`, `workloads`)  
**WHEN** the dagger Format function is invoked  
**THEN** the function SHALL check all `.go` files in all modules  
**AND** SHALL report unformatted files from any module

---

### REQ-2: format check in CI pipeline

The CI pipeline SHALL include a format check job that:
- Calls `dagger call format` 
- Blocks merge if the format check fails
- Runs on every pull request and push to main branches

**Rationale:** Automated enforcement in CI prevents unformatted code from being merged, eliminating the need for manual format checks in code review.

**Scenarios:**

#### SCENARIO: CI blocks merge on format violations
**GIVEN** a pull request contains Go files that are not `gofmt`-formatted  
**WHEN** the CI pipeline runs  
**THEN** the format check job SHALL fail  
**AND** the pull request SHALL be blocked from merging

#### SCENARIO: CI passes when all files are formatted
**GIVEN** a pull request contains only `gofmt`-formatted Go files  
**WHEN** the CI pipeline runs  
**THEN** the format check job SHALL pass  
**AND** the pull request SHALL be allowed to merge (subject to other checks)

#### SCENARIO: Format check provides actionable feedback
**GIVEN** the format check fails in CI  
**WHEN** a developer views the CI output  
**THEN** the output SHALL list which files are not formatted  
**AND** the developer SHALL be able to run `gofmt -w <file>` to fix them

---

### REQ-3: all existing Go files pass gofmt

All Go source files in the repository SHALL be `gofmt`-clean at the time this change is applied.

**Rationale:** Enforcing format checks on a codebase with existing unformatted files would immediately break CI. All files must be formatted before enforcement begins.

**Scenarios:**

#### SCENARIO: Repository is gofmt-clean before enforcement
**GIVEN** the format check is about to be added to CI  
**WHEN** `gofmt -l` is run on all Go files in the repository  
**THEN** no files SHALL be listed (all are formatted correctly)

#### SCENARIO: Pre-existing files are formatted atomically
**GIVEN** some Go files are not `gofmt`-formatted before this change  
**WHEN** this change is applied  
**THEN** all unformatted files SHALL be formatted using `gofmt -w`  
**AND** the formatting changes SHALL be committed as part of this change  
**AND** the format check SHALL be enabled only after all files are formatted

---

## Out of Scope

- **Import management**: `goimports` (superset of `gofmt` that also sorts imports) is deferred to a future change
- **Auto-fixing in CI**: CI only checks formatting; developers must run `gofmt -w` locally to fix issues
- **Editor integration**: Developer editor setup for auto-formatting is not prescribed by this change

## Technology Adoption

This specification requires review of the following usage rules:

- **delivery/quality-tooling**: Formatting standards and tooling
- **delivery/ci-cd**: CI pipeline integration patterns
- **code/naming**: Go naming conventions (implicitly enforced by `gofmt`)

## Success Criteria

- [ ] Dagger `Format` function exists and correctly identifies unformatted Go files
- [ ] CI pipeline includes format check job that blocks merge on failure
- [ ] All Go files in the repository pass `gofmt -l` with no output
- [ ] Developers can run `dagger call format` locally to check formatting before pushing
