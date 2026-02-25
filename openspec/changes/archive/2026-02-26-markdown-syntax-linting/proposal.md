---
td-board: markdown-syntax-linting
td-issue: td-2e2218
---

# Proposal: Markdown Syntax Linting

## Why

Markdown files across the repository are authored without structural guardrails — headings skip levels, code fences lack language tags, bare URLs appear in prose, and trailing spaces go unchecked. These violations reduce rendering consistency across MkDocs, Backstage TechDocs, and GitHub preview, and make automated parsing fragile.

## What Changes

- Introduce `markdownlint-cli2` as the canonical markdown syntax linter
- Add a `.markdownlint.json` configuration file defining the active rule set
- Add a Dagger task (`lint-md`) that runs `markdownlint-cli2` on all `.md` files
- Wire the new task into the existing `lint` CI job in `.github/workflows/ci.yml`

## Capabilities

### New Capabilities

- `markdown-syntax-linting`: Automated syntax linting of all markdown files using markdownlint-cli2, enforced in CI

### Modified Capabilities

_(none)_

## Impact

- Affected systems: CI pipeline, all `.md` files in the repository
- API changes: No
- Data model changes: No
- Dependencies: `markdownlint-cli2` (npm) added to root `package.json`
