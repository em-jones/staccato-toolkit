---
td-board: add-bash-testing
td-issue: td-51b4e1
status: accepted
date: 2026-02-25
decision-makers: [platform-architect]
component: src/ops/workloads

tech-radar:
  - name: bats-core
    quadrant: Patterns/Processes
    ring: Adopt
    description: >
      Bash Automated Testing System — the de-facto standard test harness for bash scripts.
      Adopted to complete the quality tooling triad for bash (alongside shellcheck linting
      and shfmt formatting), consistent with the platform's posture that every language/runtime
      must have automated testing, linting, and formatting enforced in CI.
    moved: 1
---

# Design: Add Bash Testing with bats-core

## Context and problem statement

The platform contains bash scripts used by agents and operators under `.opencode/` and `.ops/`. Shellcheck linting (`add-bash-shellcheck`, archived) and shfmt formatting (`add-bash-formatting`, in progress) are being added as parallel changes. Testing is the remaining gap in the quality tooling triad. Without automated tests, logic errors and regressions in platform scripts go undetected until runtime.

## Decision criteria

This design achieves:

- **Quality parity** [60%]: bash scripts are held to the same automated test standard as Go (`go test`) and TypeScript (Jest)
- **Developer ergonomics** [25%]: bats available locally via devbox so developers can run tests before pushing
- **Minimal disruption** [15%]: integrate via the existing Dagger-based CI pipeline without adding new CI infrastructure

Explicitly excludes:

- Bash linting (shellcheck) — addressed in archived change `add-bash-shellcheck`
- Bash formatting (shfmt) — addressed in parallel change `add-bash-formatting`
- Comprehensive test coverage of all platform scripts (initial coverage only; expanding coverage is ongoing work)

## Considered options

### Option 1: Run bats directly in CI via a GitHub Actions step

Add a `bats` step directly in `.github/workflows/ci.yml` using a community action.

Rejected: inconsistent with the platform's Dagger-first CI principle. All quality checks run through Dagger tasks so they are reproducible locally and in CI identically.

### Option 2: Add BatsTest as a new Dagger function in `src/ops/workloads`

Add a `BatsTest(ctx, source)` method to the existing `Platform` Dagger module. The function uses a container with bats-core installed, finds all `.bats` files (excluding vendor paths), and runs them. Wire it into the existing CI `test` job.

**Selected.** Consistent with the Dagger-first pattern. Reuses existing module. Locally reproducible.

### Option 3: Create a separate Dagger module for bash tooling

Rejected: premature. With shellcheck + shfmt + bats, a dedicated module could be considered in the future, but the existing module keeps things simple for now.

## Decision outcome

Implement Option 2: add a `BatsTest` function to the existing `Platform` Dagger module in `src/ops/workloads/main.go`. Use a container with bats-core available (e.g., `bats/bats` Docker image or Alpine + bats package). Find all `.bats` files via `find`, excluding `.git`, `node_modules`, and `.devbox` paths. Wire the step into the CI `test` job.

Add `bats-core` to `devbox.json` so developers can run tests locally without Docker.

Add at least one `.bats` test file for existing platform scripts to establish baseline coverage.

## Risks / trade-offs

- Risk: very few `.bats` files exist initially → Mitigation: requirement mandates at least one test file from day one; coverage grows incrementally
- Trade-off: bats tests are integration-style (run actual bash) rather than pure unit tests — acceptable for shell scripts
- Risk: container image availability → Mitigation: use official bats image or Alpine package (both stable and well-maintained)

## Migration plan

1. Add `bats-core` to `devbox.json`
2. Add `BatsTest` function to `src/ops/workloads/main.go`
3. Write at least one `.bats` test file for a platform script
4. Add bats-test step to CI `test` job in `.github/workflows/ci.yml`
5. Verify CI test job passes end-to-end

## Confirmation

How to verify this design is met:

- Test cases: `dagger call bats-test --source ../..` runs successfully and reports results
- CI: `test` job in `.github/workflows/ci.yml` includes a bats step that passes
- Acceptance criteria: all new `.bats` tests pass; `bats --version` works in devbox shell

## Open questions

_(none)_

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| bats-core | platform-architect | n/a — no dedicated usage rule needed; bats follows standard test patterns | n/a |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| — | — | — | none | No agent-facing workflow changes introduced by this change |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | No new curated entities introduced by this change |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| n/a | — | — |
