---
status: proposed
date: 2026-02-24
decision-makers: platform-architect-agent
td-board: add-kind-to-devbox
td-issue: td-9be770
tech-radar:
  - name: kind
    quadrant: Infrastructure
    ring: Adopt
    description: Already added to Tech Radar in support-kubernetes; this change
      implements the adoption
    moved: 0
---

# Design: Add kind to devbox

## Context and problem statement

`kind` (Kubernetes IN Docker) is the chosen local cluster tool established in the `support-kubernetes` ADR. Developers need a local Kubernetes cluster to develop and test workloads. kind creates clusters inside Docker containers — Docker is already required by Dagger, so there is no new system dependency. Currently there is no local cluster tool in the project environment.

## Decision criteria

This design achieves:

- **Reproducibility** (60%): pinned kind version; reproducible cluster creation
- **Zero friction** (40%): `kind create cluster` works immediately on `devbox shell`

Explicitly excludes:

- Cluster configuration (kind-config.yaml) — deferred to a follow-on change
- CI cluster lifecycle — deferred to CI integration changes

## Considered options

### Option 1: Add kind to devbox.json (chosen)

Pin `kind@<version>` in `devbox.json`. Runs on Docker with no VM overhead.

### Option 2: minikube

Rejected: requires a VM driver on some hosts (not Docker-native by default); heavier footprint; slower startup.

### Option 3: k3d

Rejected: excellent alternative but kind has wider CNCF CI adoption. Can be reconsidered in future.

## Decision outcome

Add `kind` at a pinned version to `devbox.json`. Version to use: look up the latest kind release (≥0.27) at implementation time and pin it.

## Risks / trade-offs

- Risk: Docker socket required → Mitigation: Docker is a pre-existing requirement (Dagger)
- Trade-off: kind clusters are ephemeral by default → by design; local dev clusters are created and destroyed freely

## Migration plan

1. Add `"kind@<version>"` to `devbox.json`
2. `devbox install` to verify
3. `kind version` inside `devbox shell`
4. Rollback: remove entry

## Confirmation

- `kind version` succeeds inside `devbox shell`
- `devbox.json` contains a versioned kind entry

## Open questions

- None

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| kind / local Kubernetes cluster | platform-architect-agent | `.opencode/rules/patterns/delivery/iac.md` | reviewed |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| — | — | — | none | Adding kind to devbox does not change any agent workflow |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | devbox package addition; no new catalog entities |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |
