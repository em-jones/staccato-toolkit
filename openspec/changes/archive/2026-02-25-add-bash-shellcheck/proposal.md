---
td-board: add-bash-shellcheck
td-issue: td-3a7cbd
---

# Proposal: Add Bash Shellcheck Linting

## Why

The platform contains bash scripts used by agents and operators, but there is no automated linting for shell code — meaning syntax errors, unsafe patterns, and portability issues go undetected until runtime. Adding shellcheck enforces a consistent quality bar for bash scripts, consistent with the platform's existing linting posture for Go and TypeScript.

## What Changes

- Add `shellcheck` to `devbox.json` as a developer tool
- Add a `shellcheck` Dagger task to the `src/ops/workloads` module
- Wire the shellcheck task into the CI `lint` job so all `.sh` files are checked on every PR

## Capabilities

### New Capabilities

- `bash-shellcheck`: Static analysis linting for bash/shell scripts using shellcheck, integrated into the Dagger-based CI pipeline

### Modified Capabilities

_(none)_

## Impact

- Affected services/modules: `src/ops/workloads` (Dagger module), `.github/workflows/ci.yml`
- API changes: No
- Data model changes: No
- Dependencies: `shellcheck` added to `devbox.json`
