---
td-board: markdown-formatting
td-issue: td-90668a
status: accepted
date: 2026-02-26
tech-radar:
  - name: Prettier (Markdown)
    quadrant: Patterns/Processes
    ring: Adopt
    description: Industry-standard formatter with native markdown support; already in the npm ecosystem for this repo
    moved: 1
---

# Design: Markdown Formatting

## Context and problem statement

The repository contains 500+ markdown files with no enforced formatting standard. Inconsistent whitespace, prose wrap styles, and trailing content degrade diff readability and make collaborative authoring harder. Prettier is already part of the Node/npm ecosystem used in this repo and has first-class markdown support.

## Decision criteria

This design achieves:

- Automated formatting enforcement without developer friction: 60%
- Consistency with existing CI pipeline patterns (Dagger): 30%
- Minimal configuration overhead: 10%

Explicitly excludes:

- Opinionated prose rewriting (handled by prose linting change)
- Front matter field validation

## Considered options

### Option 1: Prettier

Prettier has native markdown support, is already in the npm ecosystem, handles YAML front matter blocks, and produces stable idempotent output. Widely adopted.

### Option 2: dprint

dprint is faster but has less markdown ecosystem maturity and would introduce a new binary dependency. Not selected.

## Decision outcome

Use **Prettier** configured via `.prettierrc` scoped to markdown rules. A Dagger task `format-md` wraps `prettier --check "**/*.md"` and is added to the existing `format` CI job.

## Risks / trade-offs

- Risk: Initial formatting run produces a large diff touching hundreds of files → Mitigation: Land the formatter config in a single dedicated commit with no other changes; reviewers are instructed to treat it as a mechanical change
- Trade-off: Prettier enforces fixed prose wrap width which may reflow some long-form docs — acceptable given the consistency gains

## Migration plan

1. Add `prettier` to root `package.json` devDependencies
2. Write `.prettierrc` with markdown-specific overrides
3. Add `format-md` Dagger function to the Dagger module
4. Wire `format-md` into the `format` CI job
5. Run `prettier --write "**/*.md"` once to format all existing files
6. Commit the mass-format as a standalone commit

## Confirmation

- `format-md` exits 0 on a clean repo
- `format-md` exits non-zero on a file with trailing spaces or inconsistent list indentation
- CI `format` job includes `format-md` step and blocks merge on failure

## Open questions

_(none)_

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| Prettier (Markdown) | platform | — | pending |

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
