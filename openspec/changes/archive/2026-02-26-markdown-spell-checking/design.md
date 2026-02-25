---
td-board: markdown-spell-checking
td-issue: td-b053f0
status: accepted
date: 2026-02-26
tech-radar:
  - name: cspell
    quadrant: Patterns/Processes
    ring: Adopt
    description: Fast npm-native spell checker with project wordlist support; handles technical terminology well via custom dictionaries
    moved: 1
---

# Design: Markdown Spell Checking

## Context and problem statement

Misspelled words in authoritative specs, ADRs, and rule documents undermine their credibility and can cause confusion when terms like API names, tool names, or domain vocabulary are misspelled. `cspell` is a fast spell checker with native support for custom wordlists that handles technical repos well.

## Decision criteria

This design achieves:

- Catching genuine typos without requiring constant wordlist maintenance: 50%
- Compatibility with existing npm toolchain: 30%
- Bootstrapping a project-specific technical wordlist: 20%

Explicitly excludes:

- Grammar or style checking (handled by prose linting change)
- Front matter field validation

## Considered options

### Option 1: cspell

npm-native, supports custom dictionaries, has built-in technical wordlists (code, software terms), and integrates well with Dagger. Selected.

### Option 2: aspell/hunspell

Traditional spell checkers with no native npm integration; require binary installation and lack custom technical dictionary support. Not selected.

## Decision outcome

Use **cspell** with a `cspell.config.yaml` configuration file. The config includes:
- Built-in `en-gb` and `software-terms` dictionaries
- A project-specific `words` list for all known platform terms
- Exclusion of `node_modules/`, `.vale/styles/`, and generated files

A Dagger task `spell-check` wraps `cspell lint "**/*.md"` and is added to the `lint` CI job.

### Initial project wordlist

Bootstrapped with: `openspec`, `staccato`, `dagger`, `devbox`, `kubectl`, `kubernetes`, `grpc`, `protobuf`, `otel`, `lychee`, `markdownlint`, `prettierrc`, `cspell`, `backstage`, `grafana`, `prometheus`, `loki`, `tempo`, `healthz`, `tdq`, `td`, `kebab`, `frontmatter`, `mkdocs`

## Risks / trade-offs

- Risk: High initial violation count across 500+ files requires significant wordlist bootstrapping → Mitigation: Run cspell in report-only mode first; batch-add legitimate technical terms to wordlist; fix genuine typos
- Risk: Wordlist grows large and becomes hard to audit → Mitigation: Keep wordlist sorted alphabetically; review wordlist additions in PR
- Trade-off: cspell cannot distinguish intentional code snippets from prose — exclusion patterns will be needed for inline code

## Migration plan

1. Add `cspell` to root `package.json` devDependencies
2. Write `cspell.config.yaml` with initial project wordlist
3. Run `cspell lint "**/*.md"` to identify all violations
4. Add legitimate technical terms to project wordlist
5. Fix genuine typos
6. Add `spell-check` Dagger function
7. Wire `spell-check` into `lint` CI job

## Confirmation

- `spell-check` exits 0 on a repo with no spelling violations
- `spell-check` exits non-zero and reports file, line, and misspelled word for violations
- Known technical terms in `cspell.config.yaml` wordlist are not flagged
- CI `lint` job includes `spell-check` step and blocks merge on failure

## Open questions

_(none)_

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| cspell | platform | — | pending |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| — | — | — | none | No agent-facing workflow changes |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | No new catalog entities |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| n/a | — | — |
