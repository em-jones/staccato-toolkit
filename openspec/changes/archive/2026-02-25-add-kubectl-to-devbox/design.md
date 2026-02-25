---
status: proposed
date: 2026-02-24
decision-makers: platform-architect-agent
td-board: add-kubectl-to-devbox
td-issue: td-7550fd
tech-radar:
  - name: kubectl
    quadrant: Infrastructure
    ring: Adopt
    description: Already added to Tech Radar in support-kubernetes; this change
      implements the adoption
    moved: 0
---

# Design: Add kubectl to devbox

## Context and problem statement

`kubectl` is the standard CLI for interacting with Kubernetes clusters. The `support-kubernetes` ADR established Kubernetes as the platform's runtime target. Developers need `kubectl` available in their devbox shell to interact with kind-based local clusters and with CI/CD environments. Currently there is no canonical kubectl in the project environment.

## Decision criteria

This design achieves:

- **Reproducibility** (60%): the exact kubectl version is pinned so all developers use the same binary
- **Zero friction** (40%): kubectl is available immediately on `devbox shell` with no extra steps

Explicitly excludes:

- kubeconfig management (out of scope — each developer manages their own kubeconfig)
- kubectl plugins (krew etc.) — deferred to capability-specific changes

## Considered options

### Option 1: Add kubectl to devbox.json (chosen)

Pin `kubectl@<version>` in `devbox.json`. devbox pulls the binary from nixpkgs at the pinned version. Works on all platforms; version is tracked in source control.

### Option 2: System-level install or brew

Rejected: breaks reproducibility. Each developer gets a different version; CI gets yet another version.

## Decision outcome

Add `kubectl` at a pinned version to `devbox.json`. Version to use: look up the latest stable kubectl release (≥1.32) at implementation time and pin it.

## Risks / trade-offs

- Risk: pinned version becomes outdated → Mitigation: update as needed via a follow-on change; pinning is safer than floating
- Trade-off: developers cannot trivially use a different kubectl version → acceptable; the project defines a minimum compatible version

## Migration plan

1. Add `"kubectl@<version>"` to the `packages` array in `devbox.json`
2. Run `devbox install` to verify resolution
3. Verify `kubectl version --client` works inside `devbox shell`
4. Rollback: remove the entry from `devbox.json`

## Confirmation

- `kubectl version --client` succeeds inside `devbox shell`
- `devbox.json` contains a versioned kubectl entry (not `@latest`)

## Open questions

- None — implementation is straightforward

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| kubectl / Kubernetes CLI | platform-architect-agent | `.opencode/rules/patterns/delivery/iac.md` | reviewed |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| — | — | — | none | Adding kubectl to devbox does not change any agent workflow |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | devbox package addition; no new catalog entities |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |
