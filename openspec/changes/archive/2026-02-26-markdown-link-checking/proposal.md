---
td-board: markdown-link-checking
td-issue: td-edd461
---

# Proposal: Markdown Link Checking

## Why

With 500+ markdown files containing cross-references to specs, ADRs, rules, and external resources, broken links silently degrade the developer experience. As files are moved, renamed, or archived, internal links rot undetected. No automated link validation exists today.

## What Changes

- Introduce `lychee` as the link checker for all markdown files
- Add a `lychee.toml` configuration file specifying timeout, retry settings, and exclusion patterns for known-unreachable targets
- Add a Dagger task (`check-links`) that runs lychee across all `.md` files
- Wire the new task as a dedicated `links` CI job in `.github/workflows/ci.yml` (separate from lint — link checks are slower and benefit from independent scheduling)

## Capabilities

### New Capabilities

- `markdown-link-checking`: Automated broken link detection across all markdown files using lychee, enforced in CI

### Modified Capabilities

_(none)_

## Impact

- Affected systems: CI pipeline, all `.md` files in the repository
- API changes: No
- Data model changes: No
- Dependencies: `lychee` binary (installed via Dagger container step or devbox)
