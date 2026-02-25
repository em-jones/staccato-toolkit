---
td-board: flux-kustomization-wiring
td-issue: td-1b0064
---

# Proposal: Flux Kustomization Wiring

## Why

The `staccato-manifests` repository has a defined layout (`<component>/<env>/k8s/`) and Flux is
bootstrapped into the local cluster, but no `Kustomization` CRD objects yet exist to reconcile
those paths into the cluster. Without these wiring objects, Flux has no instruction to watch or
apply any component manifests — the GitOps loop is incomplete end-to-end even though the
infrastructure for it exists.

## What Changes

- Define a `GitRepository` source CRD in `staccato-manifests/flux-system/` pointing at the
  `staccato-manifests` repo (Gitea URL in local, GitHub URL in production)
- Define a `Kustomization` CRD for each `<component>/<env>` combination, reconciling the rendered
  manifests from `<component>/<env>/k8s/` into the target cluster namespace
- Each `Kustomization` sets `prune: true`, a `1m` reconcile interval, and `healthChecks` entries
  for all managed `Deployment` resources
- All `Kustomization` objects live in `staccato-manifests/flux-system/` and are self-reconciled
  via the bootstrap config
- Establish the naming convention: `<env>-<component>` (e.g., `local-staccato-server`)

## Capabilities

### New Capabilities

- `flux-gitrepository-source`: The single `GitRepository` CRD that acts as the shared source for
  all `Kustomization` objects — covers URL, ref, interval, and secret-ref rules for Gitea vs
  GitHub
- `flux-component-kustomizations`: Per-component-per-env `Kustomization` objects — naming,
  `spec.path` pointing at `<component>/<env>/k8s/`, `prune: true`, `healthChecks`, reconcile
  interval, and `sourceRef` cross-namespace reference to the shared `GitRepository`

### Modified Capabilities

_(none — no existing Kustomization wiring specs exist; flux-usage-rules defines the rules,
this change defines the concrete wiring objects)_

## Impact

- Affected services/modules: `staccato-manifests` repo (`flux-system/` directory)
- API changes: No
- Data model changes: No
- Dependencies:
  - `flux-local-bootstrap` (Layer 1) — Flux controllers must be installed and bootstrapped
  - `flux-usage-rules` (Layer 0) — Kustomization and GitRepository authoring rules
  - `rendered-manifests-layout` (Layer 0) — `<component>/<env>/k8s/` path contract
  - `dagger-render-task` (Layer 3 sibling) — renders the manifests that these Kustomizations reconcile
