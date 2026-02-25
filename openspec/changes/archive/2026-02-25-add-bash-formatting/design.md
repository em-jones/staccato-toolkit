---
td-board: add-bash-formatting
td-issue: td-fcc6d8
status: accepted
date: 2026-02-25
decision-makers: [platform-architect]
component: src/ops/workloads

tech-radar:
  - name: shfmt
    quadrant: Patterns/Processes
    ring: Adopt
    description: >
      Formatter for bash/shell scripts. Enforces consistent style and catches
      structural issues. Adopted as the standard formatting tool for all .sh
      files in the platform, consistent with the quality tooling posture for
      Go (gofmt) and TypeScript (Prettier).
    moved: 1
---

# Design: Add Bash Formatting with shfmt

## Context and problem statement

The platform contains several bash scripts under `.opencode/scripts/`, `.opencode/skills/`, and `.ops/scripts/`. With `shellcheck` now enforcing linting, the natural next step is formatting enforcement: `shfmt` provides deterministic, opinionated formatting for bash scripts analogous to `gofmt` for Go. Without it, style inconsistencies accumulate across scripts, making diffs harder to review and onboarding harder for new contributors. The platform's existing `format` CI job (which runs `gofmt` for Go) is the natural home for the shfmt check.

## Decision criteria

This design achieves:

- **Quality parity** [60%]: bash scripts are held to the same automated formatting standard as Go (gofmt) and TypeScript (Prettier)
- **Developer ergonomics** [25%]: shfmt available locally via devbox so developers can format before pushing
- **Minimal disruption** [15%]: integrate via the existing Dagger-based CI pipeline and the existing `format` job without new CI infrastructure

Explicitly excludes:

- Auto-fixing formatting in CI (check-only mode enforced; developers run `shfmt -w` locally)
- Bash testing (bats) — tracked in parallel change `add-bash-testing`
- Formatting of scripts inside `node_modules/` or `.devbox/` (excluded by the Dagger task's find pattern)

## Considered options

### Option 1: Run shfmt directly in CI via a GitHub Actions step

Add a `shfmt` step directly in `.github/workflows/ci.yml` using a shell command or a third-party action.

Rejected: inconsistent with the platform's Dagger-first CI principle. All quality checks run through Dagger tasks so they are reproducible locally and in CI identically.

### Option 2: Add shfmt as a new Dagger `ShfmtCheck` function in `src/ops/workloads`

Add a `ShfmtCheck(ctx, source)` method to the existing `Platform` Dagger module. The function uses a container with shfmt installed, finds all `.sh` files (excluding vendor paths), and runs `shfmt -d` (diff mode — exits non-zero if any file differs). Wire it into the existing CI `format` job as an additional step.

**Selected.** Consistent with the Dagger-first pattern. Reuses existing module. Locally reproducible. Mirrors the shellcheck approach exactly.

### Option 3: Extend the existing `Format` function to also cover bash

Modify the existing Go `Format` function to detect `.sh` files and run shfmt alongside gofmt.

Rejected: conflates two distinct language formatters in one function, making the output harder to parse and the function harder to test independently. A dedicated `ShfmtCheck` function keeps concerns separated and matches the naming pattern established by `Shellcheck`.

## Decision outcome

Implement Option 2: add a `ShfmtCheck` function to the existing `Platform` Dagger module in `src/ops/workloads/main.go`. Use `mvdan/shfmt` as the base container image (the official shfmt image). Find all `.sh` files via `find`, excluding `.git`, `node_modules`, and `.devbox` paths. Run `shfmt -d` (diff mode) — it exits non-zero and prints the diff when files are unformatted. Wire the step into the existing CI `format` job as an additional step.

Add `shfmt` to `devbox.json` so developers can run `shfmt -w <file>` locally to auto-fix formatting before pushing.

Reformat all existing platform `.sh` files with `shfmt -w` before enabling CI enforcement.

## Risks / trade-offs

- Risk: existing scripts have formatting deviations → Mitigation: requirement `all platform bash scripts are shfmt-formatted` (td-fb5c84) mandates reformatting in this same change before CI is enabled
- Trade-off: using `mvdan/shfmt` pulls a small Docker image in CI; acceptable given Dagger already pulls several images
- Risk: new scripts added after this change are not formatted → Mitigation: CI `format` job blocks merge on failure
- Trade-off: shfmt uses opinionated defaults (e.g., indent with tabs); no per-project config file is used, keeping setup minimal

## Migration plan

1. Add `shfmt` to `devbox.json`
2. Add `ShfmtCheck` function to `src/ops/workloads/main.go`
3. Run `shfmt -w` against all existing `.sh` files; commit the formatting changes
4. Add shfmt step to CI `format` job in `.github/workflows/ci.yml`
5. Verify CI format job passes end-to-end

Rollback: remove the CI step and revert `main.go` changes. The reformatted scripts remain formatted — no functional rollback needed for style-only changes.

## Confirmation

- `dagger call shfmt-check --source ../..` exits 0 on the current codebase
- CI `format` job passes on a clean PR
- CI `format` job fails when a test `.sh` file with known formatting deviation is introduced
- `shfmt --version` is available inside `devbox shell`

## Open questions

_(none)_

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| shfmt (bash formatter) | platform-architect | n/a — tooling, no pattern rule needed | n/a |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| — | — | — | none | shfmt is tooling; no agent workflow change required |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| Component | devops-workloads | existing | platform-architect | .entities/component-devops-workloads.yaml | declared | The Dagger module `src/ops/workloads` is extended with the ShfmtCheck task |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| devops-workloads | src/ops/workloads/mkdocs.yml | src/ops/workloads/docs/adrs/ | shfmt usage guide | pending | pending |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| add-bash-testing | Bash testing (bats) completes the quality tooling triad; tracked separately | spawned |
