---
td-board: add-bash-testing
td-issue: td-51b4e1
---

# Proposal: Add Bash Testing with bats-core

## Why

The platform contains bash scripts used by agents and operators, but there is no automated testing for shell code — logic errors and regressions go undetected until runtime. Adding `bats-core` (Bash Automated Testing System) provides a structured, CI-integrated test harness for bash scripts, completing the quality tooling triad for bash alongside the recently-added `shellcheck` linting and `shfmt` formatting.

## What Changes

- Add `bats-core` to `devbox.json` as a developer tool
- Add a `BatsTest` Dagger task to the `src/ops/workloads` module that discovers and runs all `.bats` test files
- Wire the bats task into the CI `test` job so bash tests run on every PR and push to main
- Add initial bats tests for existing platform bash scripts to establish coverage from day one

## Capabilities

### New Capabilities

- `bash-testing`: Automated test execution for bash/shell scripts using bats-core, integrated into the Dagger-based CI pipeline

### Modified Capabilities

_(none)_

## Impact

- Affected services/modules: `src/ops/workloads` (Dagger module), `.github/workflows/ci.yml`
- API changes: No
- Data model changes: No
- Dependencies: `bats-core` added to `devbox.json`
