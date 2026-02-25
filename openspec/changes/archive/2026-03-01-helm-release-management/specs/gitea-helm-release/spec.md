---
td-board: helm-release-management-gitea-helm-release
td-issue: td-812cee
---

# Specification: Gitea Helm Release

## Overview

Defines the `HelmRelease` CRD for Gitea committed to `staccato-manifests/platform/local/k8s/gitea/`, replacing the ad-hoc `helm install gitea-charts/gitea` call in the dev setup scripts. Flux reconciles this release so Gitea is installed declaratively as part of the GitOps loop.

## ADDED Requirements

### Requirement: Gitea HelmRelease CRD

A `HelmRelease` named `gitea` SHALL be committed to `staccato-manifests/platform/local/k8s/gitea/` referencing the `gitea-charts/gitea` chart. The release SHALL: pin an exact chart version, set `spec.targetNamespace: gitea`, configure `spec.upgrade.remediation.remediateLastFailure: true` and `spec.upgrade.remediation.retries: 3`, and embed values equivalent to `src/ops/dev/gitea/values.yaml` in `spec.values`.

#### Scenario: Gitea installed by Flux

- **WHEN** Flux reconciles the `gitea` HelmRelease in namespace `gitea`
- **THEN** `flux get helmreleases -n gitea gitea` SHALL report `Ready=True`
- **AND** `kubectl get pods -n gitea` SHALL show a Gitea pod in Running state

#### Scenario: Gitea upgrade remediation configured

- **WHEN** the gitea HelmRelease is authored
- **THEN** `spec.upgrade.remediation.remediateLastFailure` SHALL be `true` and `spec.upgrade.remediation.retries` SHALL be `3`

### Requirement: Gitea namespace pre-creation

A Kubernetes `Namespace` manifest for `gitea` SHALL be committed to `staccato-manifests/platform/local/k8s/` and reconciled by a Flux `Kustomization` that runs before the `gitea` HelmRelease. The `HelmRelease` SHALL declare `spec.dependsOn` referencing the namespace Kustomization.

#### Scenario: Namespace exists before HelmRelease reconciles

- **WHEN** Flux processes the cluster state
- **THEN** the `gitea` namespace MUST exist before the `gitea` HelmRelease begins installation
- **AND** `spec.dependsOn` in the HelmRelease SHALL reference the namespace-creating Kustomization

### Requirement: Remove gitea helm install from dev scripts

The `helm install` command for Gitea in `src/ops/dev/` scripts SHALL be removed. The dev setup script SHALL instead wait for Flux to reconcile the `gitea` HelmRelease to `Ready=True` before proceeding.

#### Scenario: No direct helm install for Gitea

- **WHEN** `src/ops/dev/` is inspected after migration
- **THEN** no file SHALL contain `helm install gitea-charts/gitea` or `helm upgrade.*gitea`

#### Scenario: Dev setup waits for Flux readiness

- **WHEN** `task dev-up` runs the Gitea setup step
- **THEN** the script SHALL poll `flux get helmreleases -n gitea gitea` until `Ready=True` before continuing
