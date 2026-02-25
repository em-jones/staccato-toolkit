---
status: proposed
date: 2026-02-24
decision-makers: platform-architect-agent
td-board: add-skaffold-to-devbox
td-issue: td-34d363
tech-radar:
  - name: skaffold
    quadrant: Infrastructure
    ring: Trial
    description: Already added to Tech Radar in support-kubernetes; this change
      implements the adoption
    moved: 0
---

# Design: Add skaffold to devbox

## Context and problem statement

`skaffold` automates the inner development loop for Kubernetes: build → load into kind → deploy → watch. The `support-kubernetes` ADR selected skaffold as the iterative development workflow tool. Without skaffold, developers must manually coordinate `docker build`, `kind load docker-image`, and `helm upgrade` — a slow, error-prone process. skaffold handles this loop automatically, redeploying on file changes.

## Decision criteria

This design achieves:

- **Developer productivity** (70%): reduces the edit-deploy-test cycle from minutes to seconds
- **Reproducibility** (30%): pinned skaffold version

Explicitly excludes:

- skaffold.yaml configuration for specific services — deferred to per-service changes
- CI skaffold usage — deferred to CI integration changes

## Considered options

### Option 1: Add skaffold to devbox.json (chosen)

Pin `skaffold@<version>` in `devbox.json`. Google OSS; strong helm+Go support; aligns with Dagger-first CI approach.

### Option 2: Tilt

Rejected: both are excellent tools; skaffold has stronger Go and helm integration and its model is more compatible with our Dagger CI approach. Tilt can be reconsidered in future.

## Decision outcome

Add `skaffold` at a pinned version to `devbox.json`. Version to use: look up the latest skaffold release (≥2.14) at implementation time and pin it.

## Risks / trade-offs

- Risk: skaffold is in Trial ring — not yet validated in our CI → Mitigation: skaffold is adopted for local dev only; CI remains Dagger
- Trade-off: another build tool in the stack → acceptable; skaffold is local-dev only and Dagger remains CI authority

## Migration plan

1. Add `"skaffold@<version>"` to `devbox.json`
2. `devbox install` to verify
3. `skaffold version` inside `devbox shell`
4. Rollback: remove entry

## Confirmation

- `skaffold version` succeeds inside `devbox shell`
- `devbox.json` contains a versioned skaffold entry

## Open questions

- None

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| skaffold / iterative dev workflow | platform-architect-agent | `.opencode/rules/patterns/delivery/iac.md` | reviewed |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| — | — | — | none | Adding skaffold to devbox does not change any agent workflow |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | devbox package addition; no new catalog entities |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |
