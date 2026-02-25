---
td-board: add-bash-shellcheck
td-issue: td-3a7cbd
status: accepted
date: 2026-02-25
decision-makers: [platform-architect]
component: src/ops/workloads

tech-radar:
  - name: shellcheck
    quadrant: Patterns/Processes
    ring: Adopt
    description: >
      Static analysis for bash/shell scripts. Catches syntax errors, unsafe patterns,
      and portability issues before they reach production. Adopted as the standard
      linting tool for all .sh files in the platform, consistent with the platform's
      quality tooling posture for Go (golangci-lint) and TypeScript (ESLint).
    moved: 1
---

# Design: Add Bash Shellcheck Linting

## Context and problem statement

The platform contains several bash scripts used by agents and operators (under `.opencode/scripts/`, `.opencode/skills/dev-portal-manager/scripts/`, and `.ops/scripts/`). These scripts have no automated linting — shellcheck violations, unsafe patterns (unquoted variables, missing `set -euo pipefail`), and portability issues go undetected until runtime. The platform already enforces quality tooling for Go (golangci-lint + gofmt + go test) and TypeScript (ESLint + Prettier + Jest), but bash has no equivalent coverage.

## Decision criteria

This design achieves:

- **Quality parity** [60%]: bash scripts are held to the same automated quality standard as Go and TypeScript
- **Developer ergonomics** [25%]: shellcheck available locally via devbox so developers can lint before pushing
- **Minimal disruption** [15%]: integrate via the existing Dagger-based CI pipeline without adding new CI infrastructure

Explicitly excludes:

- Bash formatting (shfmt) — tracked in parallel change `add-bash-formatting`
- Bash testing (bats) — tracked in parallel change `add-bash-testing`
- Linting of scripts inside `node_modules/` or `.devbox/` (excluded by the Dagger task's find pattern)

## Considered options

### Option 1: Run shellcheck directly in CI via a GitHub Actions step

Add a `shellcheck` step directly in `.github/workflows/ci.yml` using the `ludeeus/action-shellcheck` action.

Rejected: inconsistent with the platform's Dagger-first CI principle. All quality checks run through Dagger tasks so they are reproducible locally and in CI identically.

### Option 2: Add shellcheck as a new Dagger `Shellcheck` function in `src/ops/workloads`

Add a `Shellcheck(ctx, source)` method to the existing `Platform` Dagger module. The function uses a container with shellcheck installed, finds all `.sh` files (excluding vendor paths), and runs shellcheck. Wire it into the existing CI `lint` job as an additional step.

**Selected.** Consistent with the Dagger-first pattern. Reuses existing module. Locally reproducible.

### Option 3: Create a separate Dagger module for bash tooling

Rejected: premature. There is only one bash quality tool being added now. A dedicated module makes sense when bash tooling reaches 3+ tools (shellcheck + shfmt + bats). Revisit at `add-bash-testing`.

## Decision outcome

Implement Option 2: add a `Shellcheck` function to the existing `Platform` Dagger module in `src/ops/workloads/main.go`. Use `koalaman/shellcheck-alpine` as the base container image (official shellcheck image). Find all `.sh` files via `find`, excluding `.git`, `node_modules`, and `.devbox` paths. Wire the step into the CI `lint` job.

Add `shellcheck` to `devbox.json` so developers can run it locally without Docker.

Fix any existing violations in platform scripts before enabling CI enforcement.

## Risks / trade-offs

- Risk: existing scripts have shellcheck violations → Mitigation: requirement `lint passes for all platform bash scripts` (td-5bd196) mandates fixing violations in this same change before CI is enabled
- Trade-off: using `koalaman/shellcheck-alpine` pulls a small Docker image in CI; acceptable given Dagger already pulls several images
- Risk: new scripts added after this change introduce violations → Mitigation: CI blocks merge on failure, so violations are caught before merging

## Migration plan

1. Add `shellcheck` to `devbox.json`
2. Add `Shellcheck` function to `src/ops/workloads/main.go`
3. Run shellcheck against all existing `.sh` files; fix any violations
4. Add shellcheck step to CI `lint` job in `.github/workflows/ci.yml`
5. Verify CI lint job passes end-to-end

Rollback: remove the CI step and revert `main.go` changes. No state is modified; rollback is a code revert.

## Confirmation

- `dagger call shellcheck --source ../..` exits 0 on the current codebase
- CI `lint` job passes on a clean PR
- CI `lint` job fails when a test `.sh` file with a known violation is introduced
- `shellcheck --version` is available inside `devbox shell`

## Open questions

_(none)_

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| shellcheck (bash static analysis) | platform-architect | n/a — tooling, no pattern rule needed | n/a |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| — | — | — | none | shellcheck is tooling; no agent workflow change required |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| Component | devops-workloads | existing | platform-architect | .entities/component-devops-workloads.yaml | declared | The Dagger module `src/ops/workloads` is extended with the shellcheck task |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| devops-workloads | src/ops/workloads/mkdocs.yml | src/ops/workloads/docs/adrs/ | shellcheck usage guide | pending | pending |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| add-bash-formatting | Bash formatting (shfmt) is the natural companion to linting; tracked separately to keep changes focused | spawned |
| add-bash-testing | Bash testing (bats) completes the quality tooling triad; tracked separately | spawned |
