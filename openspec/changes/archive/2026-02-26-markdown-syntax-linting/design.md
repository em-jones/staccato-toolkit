---
td-board: markdown-syntax-linting
td-issue: td-2e2218
status: accepted
date: 2026-02-26
tech-radar:
  - name: markdownlint-cli2
    quadrant: Patterns/Processes
    ring: Adopt
    description: Widely adopted markdown structure linter with a rich configurable rule set; npm-native and CI-friendly
    moved: 1
---

# Design: Markdown Syntax Linting

## Context and problem statement

Markdown files in this repo are rendered in multiple contexts (MkDocs, Backstage TechDocs, GitHub). Structural violations — skipped heading levels, code fences without language tags, bare URLs, trailing spaces — silently cause rendering inconsistencies. `markdownlint-cli2` provides a configurable rule-based linter specifically for markdown structure.

## Decision criteria

This design achieves:

- Consistent, renderable markdown structure across all contexts: 60%
- Compatibility with existing npm toolchain: 25%
- Configurable rule set to avoid false positives on intentional patterns: 15%

Explicitly excludes:

- Prose quality rules (handled by prose linting change)
- Spell checking (handled by spell checking change)

## Considered options

### Option 1: markdownlint-cli2

Modern rewrite of markdownlint with improved glob support, native config file auto-discovery, and faster execution. Actively maintained. Selected.

### Option 2: remark-lint

More powerful AST-based linter but requires a plugin ecosystem and more configuration overhead. Overkill for structural rules only.

## Decision outcome

Use **markdownlint-cli2** with a `.markdownlint.json` configuration file. A Dagger task `lint-md` wraps `markdownlint-cli2 "**/*.md"` and is added to the existing `lint` CI job.

Key rules enabled:
- MD001: Heading levels increment by one
- MD031: Fenced code blocks surrounded by blank lines
- MD040: Fenced code blocks have a language tag
- MD034: No bare URLs in prose
- MD009: No trailing spaces
- MD041: First line is a top-level heading

## Risks / trade-offs

- Risk: Existing files have many violations requiring a mass-fix commit → Mitigation: Land configuration + mass fix in one dedicated commit; scope suppressions for known-acceptable patterns
- Trade-off: MD013 (line length) is disabled by default — long spec requirement descriptions should not be penalised

## Migration plan

1. Add `markdownlint-cli2` to root `package.json` devDependencies
2. Write `.markdownlint.json` with the active rule set
3. Add `lint-md` Dagger function to the Dagger module
4. Wire `lint-md` into the `lint` CI job
5. Run `markdownlint-cli2 --fix "**/*.md"` to auto-fix all fixable violations
6. Manually address remaining violations
7. Commit the mass-fix as a standalone commit

## Confirmation

- `lint-md` exits 0 on a clean repo
- `lint-md` exits non-zero and reports rule name + line number for files with violations
- CI `lint` job includes `lint-md` step and blocks merge on failure

## Open questions

_(none)_

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| markdownlint-cli2 | platform | — | pending |

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
