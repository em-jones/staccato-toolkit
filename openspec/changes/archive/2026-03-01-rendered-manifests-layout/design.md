---
status: "accepted"
date: 2026-02-27
decision-makers: [platform-architect-agent]
consulted: []
informed: [platform-team]

# component: omitted — staccato-manifests is a sibling repository, not a path in this repo

tech-radar:
  - name: Flux
    quadrant: Infrastructure
    ring: Adopt
    description: GitOps sync engine reading from staccato-manifests to reconcile cluster state. Chosen over ArgoCD for its pull-based Kubernetes-native operator model and lightweight footprint.
    moved: 1
  - name: Kustomize
    quadrant: Infrastructure
    ring: Adopt
    description: Manifest rendering tool for staccato-toolkit CI pipelines. Chosen for native kubectl integration, no Helm chart overhead, and first-class support for overlay-based environment promotion.
    moved: 1

td-board: rendered-manifests-layout
td-issue: td-dd5bdc
---

# Design: Rendered Manifests Repository Layout

## Context and problem statement

The `staccato-toolkit` project delivers application components (staccato-server, staccato-cli,
etc.) to Kubernetes clusters across four environments: `local`, `dev`, `staging`, and `prod`. There
is currently no defined location for rendered Kubernetes manifests, no GitOps sync configuration,
and no canonical promotion path between environments. CI pipelines have no stable write target;
Flux has no stable read source. This design establishes the `staccato-manifests` sibling repository
and its layout convention as the foundational Layer 0 contract that all subsequent GitOps work
depends on.

## Decision criteria

This design achieves:

- **Stable GitOps contract** [40%]: Flux and CI pipelines agree on a single path schema
- **Auditable deployments** [30%]: every deployment traceable in git history
- **Promotion safety** [20%]: no environment can receive manifests without a PR review
- **Minimal blast radius** [10%]: manifests repo is isolated from source code changes

Explicitly excludes:

- AWS resource provisioning (`<component>/<env>/aws/` subtree — reserved, not implemented)
- Manifest rendering toolchain implementation (covered by kustomize-usage-rules change)
- Flux installation and bootstrap (covered by flux-usage-rules change)
- GitHub repository provisioning automation (out of scope — manual setup is acceptable at Layer 0)

## Considered options

### Option 1: Manifests co-located in application repo

Store rendered manifests in a `k8s/<env>/` subdirectory within each application repository. Flux
reads from each application repo directly.

**Rejected because**: Flux would require write-back access to application repos for status
updates; access control cannot be scoped independently; a broken application CI build could
accidentally overwrite production manifests; git history mixes source and deployment concerns.

### Option 2: Single monorepo with all manifests

One central `staccato-manifests` directory in this OpenSpec repository alongside all other
platform artefacts.

**Rejected because**: OpenSpec is not a deployment target; mixing spec artefacts with live
manifests creates confusing ownership; Flux would have read access to all platform specifications.

### Option 3: Dedicated sibling repository (selected)

`staccato-manifests` is a separate GitHub repository. Layout is
`<component-name>/<env>/k8s/*.yaml`. CI writes via PRs; Flux reads via a `GitRepository` source.

**Selected because**: clean ownership boundary; independent access control for Flux (read-only)
and CI (write via PRs only); git history in `staccato-manifests` is a pure deployment audit log;
scales to any number of components without coupling.

## Decision outcome

`staccato-manifests` is a dedicated sibling repository with the layout:

```
<component-name>/
  <env>/
    k8s/
      *.yaml      # rendered Kubernetes manifests
    aws/          # reserved for future AWS resources — not synced by Flux yet
```

Valid environment values: `local` | `dev` | `staging` | `prod`.

Flux is configured with a `GitRepository` source pointing to `staccato-manifests` and one
`Kustomization` per component per environment, targeting the corresponding `k8s/` path.

CI pipelines in each application repo render manifests (via Kustomize) and open pull requests
against `staccato-manifests`. PRs must pass status checks before merge. Flux reconciles on merge.

## Risks / trade-offs

- **Risk**: Stale manifests if CI fails to open a PR after a build → Mitigation: CI job is a
  required check; build artifact upload step fails the pipeline if PR creation fails.
- **Risk**: Environment drift if promotion PRs are opened from a stale `dev` branch → Mitigation:
  promotion tooling always reads the HEAD of the source environment path at PR creation time.
- **Trade-off**: Two-repo workflow adds friction for developers unfamiliar with GitOps. Accepted —
  the promotion-as-PR model is the core auditability mechanism.
- **Risk**: `staccato-manifests` repository not yet provisioned → Mitigation: manual setup with a
  branch protection rule and a `CODEOWNERS` file; automation deferred to a later change.

## Migration plan

1. Create `staccato-manifests` GitHub repository (manual, admin action)
2. Enable branch protection on `main`: require PR + at least one passing status check; block
   direct pushes
3. Create a `CODEOWNERS` file scoped to `*` → `platform-team`
4. Create a Flux `GitRepository` source pointing to `staccato-manifests` (credentials: read-only
   deploy key)
5. For each component × environment pair, create a Flux `Kustomization` pointing to
   `<component>/<env>/k8s/`
6. Update each application repo's CI to render manifests and open PRs against `staccato-manifests`
   using a dedicated write token (scoped to `staccato-manifests` only)
7. Populate initial manifests via a bootstrapping PR in `staccato-manifests` for the `local` and
   `dev` environments

Rollback: remove Flux `GitRepository` and `Kustomization` resources; revert CI changes. No data
migration required (manifests are regenerated from source on next CI run).

## Confirmation

- Flux reconciles within normal interval after a PR merges into `staccato-manifests`
- A direct-push attempt by a developer to `main` is blocked by branch protection
- A CI job using the manifests credential cannot write to an application repository
- `kubectl get kustomization -A` shows `READY=True` for all component × environment pairs after
  bootstrapping

## Open questions

- Which service account / GitHub App identity should Flux use for the `GitRepository` source?
  (Temporary: use a deploy key; permanent: GitHub App with fine-grained permissions)
- Should promotion between `dev` → `staging` → `prod` be automated (approved PR auto-merges) or
  always manual? (Deferred to manifests-promotion-workflow implementation)

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| Flux (GitOps sync engine) | platform-architect-agent | openspec/changes/flux-usage-rules | pending |
| Kustomize (manifest rendering) | platform-architect-agent | openspec/changes/kustomize-usage-rules | pending |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| GitOps promotion workflow | development-orchestrator | — | none | Workflow is expressed in specs and design; no new agent skill required beyond existing td-task-management |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | staccato-manifests is a sibling repository; no catalog entity in this repo is introduced by this change |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| flux-usage-rules | Flux adoption requires usage rules before Flux resources are authored in CI/CD | spawned |
| kustomize-usage-rules | Kustomize adoption requires usage rules before rendering pipelines are written | spawned |
