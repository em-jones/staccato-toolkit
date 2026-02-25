---
td-board: helm-release-management
td-issue: td-602675
---

# Proposal: Helm Release Management via Flux HelmRelease CRDs

## Why

Third-party Helm charts (observability stack, Gitea) are currently installed by ad-hoc `helm install` / `helm upgrade` shell scripts. These scripts require manual re-execution after cluster recreations, are not version-controlled as cluster state, and cannot be reconciled by Flux. Migrating to `HelmRelease` CRDs committed to `staccato-manifests` makes chart installations fully GitOps-managed — Flux automatically installs, upgrades, and remediates charts without any manual script invocations.

## What Changes

- Declare `HelmRepository` sources (one per chart registry) in `staccato-manifests/platform/local/k8s/` and commit them to the manifests repo
- Author `HelmRelease` CRDs for each chart (kube-prometheus-stack, Loki, Tempo, Grafana Alloy, Gitea) with pinned versions, inline `spec.values`, and upgrade remediation configured per `flux-usage-rules`
- Remove the manual `helm install` calls from `src/ops/observability/` and `src/ops/dev/` deployment scripts; those scripts are replaced by GitOps reconciliation
- Extend `task dev-up` to validate Flux is reconciling HelmReleases rather than invoking Helm directly

## Capabilities

### New Capabilities

- `helmrepository-sources`: Define and commit `HelmRepository` source CRDs for all required Helm registries (grafana, prometheus-community, gitea-charts) into `staccato-manifests`
- `observability-helm-releases`: Author `HelmRelease` CRDs for the full observability stack (kube-prometheus-stack, Loki, Tempo, Grafana Alloy) managed by Flux
- `gitea-helm-release`: Author `HelmRelease` CRD for Gitea managed by Flux, replacing the ad-hoc Helm install in the dev setup scripts

### Modified Capabilities

- `local-cluster-provisioning`: Remove direct `helm install` invocations from `task dev-up`; add a Flux HelmRelease readiness wait step instead

## Impact

- Affected services/modules: `src/ops/observability/` (helm scripts removed), `src/ops/dev/` (gitea helm install removed), `staccato-manifests/platform/local/k8s/` (new files), `Taskfile.yaml` (dev-up workflow updated)
- API changes: No
- Data model changes: No
- Dependencies:
  - `flux-local-bootstrap` (Layer 1) — Flux controllers must be running in the cluster
  - `flux-usage-rules` (Layer 0) — HelmRelease and HelmRepository conventions
  - `rendered-manifests-layout` (Layer 0) — `staccato-manifests` directory structure
  - `gitea-local-setup` (Layer 1) — Gitea is one of the charts being migrated
  - Existing `observability-stack-deployment` spec — defines the charts and values already in use
