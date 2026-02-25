---
td-board: gitea-local-setup
td-issue: td-8d6b8d
---

# Proposal: Gitea Local Setup — Self-Hosted Git for Local GitOps Loop

## Why

The `staccato-toolkit` platform needs a fully self-contained local GitOps loop for development. Currently, Flux bootstraps from GitHub, which requires external network access and prevents fully offline or air-gapped local development. Gitea provides a self-hosted Git service that runs inside the local kind cluster, enabling Flux to reconcile from a local source and eliminating the GitHub dependency for day-to-day development.

## What Changes

- Deploy Gitea into the `gitea` namespace of the local kind cluster via Helm (`gitea-charts/gitea`)
- Provide a declarative `src/ops/dev/gitea/values.yaml` controlling the Gitea installation
- Initialize the `staccato-manifests` repository inside Gitea after install
- Mirror the `staccato-toolkit` application repo into Gitea for local development
- Expose Gitea UI via kubectl port-forward or NodePort on the kind cluster
- Wire Flux to bootstrap from the Gitea-hosted `staccato-manifests` repo instead of GitHub

## Capabilities

### New Capabilities

- `gitea-deployment`: Helm-based deployment of Gitea into the kind cluster — namespace, values file, Helm release lifecycle, and readiness verification
- `gitea-repo-initialization`: Post-install initialization of the `staccato-manifests` repository in Gitea, including admin account setup and repo creation
- `gitea-flux-integration`: Flux GitRepository source configuration pointing at the Gitea-hosted `staccato-manifests` repo, enabling the local GitOps loop

### Modified Capabilities

_(none — this is a net-new Layer 1 capability; no existing spec requirements are changing)_

## Impact

- Affected services/modules: Local kind cluster (`staccato-dev`), Flux controllers, `staccato-manifests` repo workflow
- API changes: No
- Data model changes: No
- Dependencies:
  - `gitea-charts` Helm repository (new)
  - `local-cluster-provisioning` spec (existing — `task dev-up` extended to include Gitea)
  - `gitops-tool-selection` (Layer 0 — Flux v2 already selected)
  - `flux-usage-rules` (Layer 0 — Flux CRD patterns already established)
  - `rendered-manifests-layout` (Layer 0 — `staccato-manifests` layout already defined)
