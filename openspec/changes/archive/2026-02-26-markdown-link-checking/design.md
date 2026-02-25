---
td-board: markdown-link-checking
td-issue: td-edd461
status: accepted
date: 2026-02-26
tech-radar:
  - name: lychee
    quadrant: Patterns/Processes
    ring: Adopt
    description: Fast parallel link checker with configurable retries, exclusion patterns, and native markdown support; runs as a standalone binary
    moved: 1
---

# Design: Markdown Link Checking

## Context and problem statement

With 500+ markdown files containing cross-references to specs, ADRs, skills, and external resources, broken links silently degrade the developer experience as files are moved or renamed. `lychee` is a fast, parallel link checker that handles both relative file links and HTTP/HTTPS URLs, with configurable exclusion patterns for known-unreachable targets.

## Decision criteria

This design achieves:

- Reliable detection of both broken internal file links and broken external URLs: 55%
- Configurable exclusions for known-unreachable targets: 25%
- Independent CI job to prevent slow network checks from blocking fast lint checks: 20%

Explicitly excludes:

- Anchor/section-level link validation within documents
- Redirect following beyond configurable max hops

## Considered options

### Option 1: lychee

Rust-based binary with excellent performance on large repos, built-in retry logic, native YAML config, and good internal path resolution. No runtime dependency. Selected.

### Option 2: markdown-link-check (npm)

Node-based; slower on large repos, less configurable retry/timeout handling. Would add to npm toolchain but performance is a concern at 500+ files. Not selected.

## Decision outcome

Use **lychee** as the link checker, configured via `lychee.toml`. Key configuration:

- `timeout = 20` (seconds per request)
- `retry_wait_time = 2`
- `max_retries = 2`
- `exclude` patterns: `localhost`, `127.0.0.1`, `example.com`, `*.internal`
- Internal relative links checked by file existence

A dedicated Dagger task `check-links` wraps `lychee **/*.md` and runs in a **dedicated `links` CI job** — separate from `lint` — because network-dependent checks are slower and benefit from independent scheduling (can run in parallel with lint/format without delaying them).

## Risks / trade-offs

- Risk: External URLs become temporarily unreachable causing flaky CI → Mitigation: Retry logic in `lychee.toml`; external URLs that are consistently unreachable can be added to exclusion list
- Risk: Large number of internal broken links on first run (from file moves during archiving) → Mitigation: Run lychee in report-only mode first; fix links in batches
- Trade-off: lychee does not validate anchor targets (`#section-name`) — only full URL/file existence is checked

## Migration plan

1. Install lychee binary via devbox (or as a Dagger container step)
2. Write `lychee.toml` with timeout, retry, and exclusion configuration
3. Run `lychee **/*.md` to identify all broken links in the current repo
4. Fix broken internal file links
5. Add persistent external URL failures to exclusion list
6. Add `check-links` Dagger function
7. Add `links` job to `.github/workflows/ci.yml` (separate from `lint`)

## Confirmation

- `check-links` exits 0 when all links are valid
- `check-links` exits non-zero and reports file, line, and broken URL/path for each failure
- Excluded patterns are not reported as failures
- CI `links` job is a separate job from `lint` and blocks merge on failure

## Open questions

- Should the `links` job run on a schedule (nightly) in addition to pull requests to catch external link rot? Defaulting to PR-only for now; a scheduled run can be added later.

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| lychee | platform | — | pending |

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
