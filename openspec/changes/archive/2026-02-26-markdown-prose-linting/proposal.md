---
td-board: markdown-prose-linting
td-issue: td-3958af
---

# Proposal: Markdown Prose Linting

## Why

The repository's markdown files — specs, ADRs, skill docs, and rules — are authoritative platform documentation. Passive voice, ambiguous language, inconsistent terminology, and overly complex sentences erode their clarity and usefulness. No tooling currently enforces prose quality standards across these files.

## What Changes

- Introduce Vale as the prose linter for all markdown files
- Add a `.vale.ini` configuration file and a styles directory with selected rule packages (e.g., Google, Microsoft, or a custom platform style)
- Add a Dagger task (`lint-prose`) that runs Vale on all `.md` files
- Wire the new task into the existing `lint` CI job in `.github/workflows/ci.yml`

## Capabilities

### New Capabilities

- `markdown-prose-linting`: Automated prose quality checking of all markdown files using Vale, enforced in CI

### Modified Capabilities

_(none)_

## Impact

- Affected systems: CI pipeline, all `.md` files in the repository
- API changes: No
- Data model changes: No
- Dependencies: Vale binary (installed via devbox or Dagger container step)
