---
status: proposed
date: 2026-02-24
decision-makers: platform-architect-agent
td-board: add-helm-to-devbox
td-issue: td-f478dd
tech-radar:
  - name: helm
    quadrant: Infrastructure
    ring: Adopt
    description: Already added to Tech Radar in support-kubernetes; this change
      implements the adoption
    moved: 0
---

# Design: Add helm to devbox

## Context and problem statement

`helm` is the CNCF Graduated Kubernetes package manager. The `support-kubernetes` ADR selected helm as the platform's deployment and package management tool. The forthcoming component platform and observability stack both install via helm charts. Developers and CI pipelines need helm to deploy applications to local kind clusters and validate charts. Currently there is no helm in the project environment.

## Decision criteria

This design achieves:

- **Reproducibility** (60%): pinned helm version; all environments use the same helm binary
- **Ecosystem access** (40%): helm enables consuming the CNCF chart ecosystem (observability, components)

Explicitly excludes:

- Helm chart authoring conventions — separate capability-specific changes
- Helm repository configuration — deferred to per-tool installation changes

## Considered options

### Option 1: Add helm to devbox.json (chosen)

Pin `helm@<version>` in `devbox.json`.

### Option 2: kustomize only

Rejected: kustomize lacks the package registry ecosystem needed to adopt third-party tools like Prometheus, Grafana, etc. Both tools may coexist; helm is the primary deployment mechanism.

## Decision outcome

Add `helm` at a pinned version to `devbox.json`. Version to use: look up the latest helm v3 release (≥3.17) at implementation time and pin it.

## Risks / trade-offs

- Risk: helm chart compatibility with newer Kubernetes versions → Mitigation: pin both helm and kubernetes versions; test locally with kind
- Trade-off: helm templates are complex → acceptable; helm is the industry standard for this complexity

## Migration plan

1. Add `"helm@<version>"` to `devbox.json`
2. `devbox install` to verify
3. `helm version` inside `devbox shell`
4. Rollback: remove entry

## Confirmation

- `helm version` succeeds inside `devbox shell`
- `devbox.json` contains a versioned helm entry

## Open questions

- None

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| helm / Kubernetes package management | platform-architect-agent | `.opencode/rules/patterns/delivery/iac.md` | reviewed |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| — | — | — | none | Adding helm to devbox does not change any agent workflow |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | devbox package addition; no new catalog entities |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |
