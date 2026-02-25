---
td-board: markdown-formatting
td-issue: td-90668a
---

# Proposal: Markdown Formatting

## Why

The repository contains 500+ markdown files spanning specs, ADRs, skill documentation, and rules, with no automated formatting enforcement. Inconsistent whitespace, list styles, and line endings accumulate silently and degrade diff quality and readability over time.

## What Changes

- Introduce Prettier as the canonical markdown formatter for the repository
- Add a Dagger task (`format-md`) that runs Prettier on all `.md` files
- Wire the new task into the existing `format` CI job in `.github/workflows/ci.yml`
- Add a `.prettierrc` configuration scoped to markdown formatting rules

## Capabilities

### New Capabilities

- `markdown-formatting`: Automated Prettier-based formatting check and auto-fix for all markdown files, enforced in CI

### Modified Capabilities

_(none)_

## Impact

- Affected systems: CI pipeline, all `.md` files in the repository
- API changes: No
- Data model changes: No
- Dependencies: `prettier` (npm) added to root `package.json`
