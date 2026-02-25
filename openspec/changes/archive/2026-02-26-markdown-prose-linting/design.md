---
td-board: markdown-prose-linting
td-issue: td-3958af
status: accepted
date: 2026-02-26
tech-radar:
  - name: Vale
    quadrant: Patterns/Processes
    ring: Adopt
    description: Language-agnostic prose linter with pluggable style packages; runs as a standalone binary without runtime dependencies
    moved: 1
---

# Design: Markdown Prose Linting

## Context and problem statement

Specs, ADRs, and rule documents in this repository are authoritative platform documentation. Passive voice, weasel words, overly complex sentences, and inconsistent terminology in these files reduce clarity and trust. Vale is a prose linter that enforces configurable style rules and runs as a binary with no language runtime dependency.

## Decision criteria

This design achieves:

- Enforceable prose quality standards in CI: 55%
- Configurable severity to avoid developer frustration on subjective rules: 30%
- No new language runtime dependency: 15%

Explicitly excludes:

- Spell checking (handled by spell checking change)
- Structural markdown rules (handled by syntax linting change)

## Considered options

### Option 1: Vale

Binary-only, language-agnostic, supports Google and Microsoft style packages out of the box, extensible with custom rules. Selected.

### Option 2: textlint

Node-based plugin ecosystem; more setup overhead, slower, and less stable CI integration than Vale. Not selected.

## Decision outcome

Use **Vale** with `.vale.ini` configuration and the **Google** style package as the baseline. Styles are committed to the repository under `.vale/styles/` so no network fetch is required at CI time.

Configuration approach:
- Severity: `warning` for stylistic rules (passive voice, weasel words), `error` for hard rules (undefined terms, inconsistent headings)
- Scope: all `*.md` files
- Exceptions: generated files and `node_modules/` are excluded

A Dagger task `lint-prose` wraps `vale --output=line **/*.md` and is added to the `lint` CI job.

## Risks / trade-offs

- Risk: Google style rules generate high false-positive rates on technical prose → Mitigation: Start with a curated subset; tune severity levels during initial rollout; add project-specific term exceptions
- Risk: Vendoring Vale styles increases repo size → Mitigation: Styles directory is small (~200KB); acceptable trade-off for reproducible offline CI
- Trade-off: Vale does not auto-fix violations — all fixes are manual

## Migration plan

1. Install Vale binary via devbox
2. Write `.vale.ini` with Google style package configuration
3. Run `vale sync` to download and vendor styles to `.vale/styles/`
4. Add `lint-prose` Dagger function using Vale binary in container
5. Wire `lint-prose` into the `lint` CI job
6. Do a baseline scan; address `error`-level violations; downgrade chronic `warning`-level false positives

## Confirmation

- `lint-prose` exits 0 on prose conforming to configured rules
- `lint-prose` exits non-zero and reports file, line, rule, and suggestion for violations
- CI `lint` job includes `lint-prose` step and blocks merge on error-level failures

## Open questions

- Should `warning`-level violations block merge or only surface as annotations? Defaulting to non-blocking warnings for initial rollout.

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| Vale | platform | — | pending |

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
