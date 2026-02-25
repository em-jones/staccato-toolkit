---
td-board: flux-local-bootstrap
td-issue: td-1efcd2
---

# Proposal: Flux Local Bootstrap

## Why

The `staccato-toolkit` local development cluster runs on `kind` and has Gitea deployed (via `gitea-local-setup`) as an in-cluster Git host for the `staccato-manifests` repository. However, Flux v2 is not yet installed in the cluster and there is no bootstrap configuration pointing Flux at `staccato-manifests`. Without this bootstrap step, the GitOps reconciliation loop cannot operate locally — engineers cannot validate GitOps changes before promoting to production, and the `task dev-up` workflow is incomplete.

## What Changes

- Install Flux v2 controllers into the local `kind` cluster via `flux bootstrap gitea` (or equivalent `flux install` + manifest commit)
- Configure Flux to watch the `staccato-manifests` repository hosted on the internal Gitea instance
- Commit the bootstrap configuration (`GitRepository` + `Kustomization` pointing at `staccato-manifests`) into the `staccato-manifests` repo so Flux is self-managing
- Extend `task dev-up` to include Gitea setup and Flux bootstrap as sequential steps
- Document the `flux reconcile source git staccato-manifests` and `flux reconcile kustomization flux-system` verification commands

## Capabilities

### New Capabilities

- `flux-bootstrap-local`: Automates installation of Flux v2 controllers into the local `kind` cluster and bootstraps them from the Gitea-hosted `staccato-manifests` repository, making Flux self-managing in the local environment

### Modified Capabilities

- `local-cluster-provisioning`: Extends the existing `task dev-up` / `task dev-down` workflow to include Gitea setup and Flux bootstrap steps so the full GitOps loop is operational after a single command

## Impact

- Affected services/modules: `staccato-toolkit` local dev workflow (`Taskfile.yaml`), `src/ops/dev/` scripts
- API changes: No
- Data model changes: No
- Dependencies:
  - `gitea-local-setup` (Gitea must be deployed and the `staccato-manifests` repo created before Flux bootstrap)
  - `flux-usage-rules` (Layer 0) — Flux CRD conventions must be established
  - `gitops-tool-selection` (Layer 0) — Flux v2 adoption ADR must be accepted
  - `rendered-manifests-layout` (Layer 0) — `staccato-manifests` layout must be defined
  - `local-cluster-provisioning` spec (existing) — kind cluster must exist
  - `flux` CLI added to `devbox.json`
