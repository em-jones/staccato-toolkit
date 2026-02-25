---
td-board: markdown-spell-checking
td-issue: td-b053f0
---

# Proposal: Markdown Spell Checking

## Why

The repository contains 500+ markdown files including authoritative specs, ADRs, and rules. Misspelled identifiers, technology names, and domain terms in these documents undermine their credibility and can cause confusion. No spell-checking tooling is currently configured, meaning typos accumulate silently.

## What Changes

- Introduce `cspell` as the spell checker for all markdown files
- Add a `cspell.config.yaml` configuration file with a project-specific word list covering known technical terms (`openspec`, `staccato`, `dagger`, `td`, `devbox`, etc.)
- Add a Dagger task (`spell-check`) that runs cspell on all `.md` files
- Wire the new task into the existing `lint` CI job in `.github/workflows/ci.yml`

## Capabilities

### New Capabilities

- `markdown-spell-checking`: Automated spell checking of all markdown files using cspell with a project wordlist, enforced in CI

### Modified Capabilities

_(none)_

## Impact

- Affected systems: CI pipeline, all `.md` files in the repository
- API changes: No
- Data model changes: No
- Dependencies: `cspell` (npm) added to root `package.json`
