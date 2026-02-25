---
td-board: add-bash-formatting
td-issue: td-fcc6d8
---

# Proposal: Add Bash Formatting with shfmt

## Why

The platform contains bash scripts used by agents and operators, but there is no automated formatting enforcement for shell code — style inconsistencies accumulate silently and diffs are harder to review. Adding `shfmt` enforces a consistent formatting standard for bash scripts, completing the quality tooling pair for bash alongside the recently-added `shellcheck` linting.

## What Changes

- Add `shfmt` to `devbox.json` as a developer tool
- Add a `ShfmtCheck` Dagger task to the `src/ops/workloads` module that checks (but does not auto-fix) formatting
- Wire the shfmt check into the CI `format` job so all `.sh` files are format-checked on every PR
- Format all existing platform `.sh` files with `shfmt` so the check is green from day one

## Capabilities

### New Capabilities

- `bash-formatting`: Formatting enforcement for bash/shell scripts using shfmt, integrated into the Dagger-based CI pipeline

### Modified Capabilities

_(none)_

## Impact

- Affected services/modules: `src/ops/workloads` (Dagger module), `.github/workflows/ci.yml`
- API changes: No
- Data model changes: No
- Dependencies: `shfmt` added to `devbox.json`
