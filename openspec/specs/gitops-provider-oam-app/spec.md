---
td-board: gitops-provider-component-gitops-provider-oam-app
td-issue: td-db641e
---

# Specification: GitOps Provider OAM Application

## Overview

Defines the thin OAM `Application` manifest (`gitops-provider-app.yaml`) embedded in
`staccato-toolkit/core`. With Harbor and flux-operator now managed as KubeVela addons, this
Application is reduced to a single `flux-instance` component that applies the FluxInstance CRD.
It is applied after both addons are enabled and the initial OCI artifact has been seeded to Harbor.

## ADDED Requirements

### Requirement: gitops-provider OAM Application asset

The core Go package SHALL provide `assets/bootstrap/gitops-provider-app.yaml` as an embedded
asset — a KubeVela `Application` of `apiVersion: core.oam.dev/v1beta1` containing exactly one
component: `flux-instance`.

#### Scenario: Asset is accessible at runtime

- **WHEN** the CLI calls `core.BootstrapAssets.Open("bootstrap/gitops-provider-app.yaml")`
- **THEN** the YAML is returned and parses as a valid KubeVela `Application` manifest

#### Scenario: Application contains only the flux-instance component

- **WHEN** the Application manifest is parsed
- **THEN** `spec.components` has exactly one entry with `name: flux-instance` and
  `type: k8s-objects`

### Requirement: flux-instance component applies FluxInstance CRD

The `flux-instance` component SHALL use the KubeVela `k8s-objects` component type to apply
the `FluxInstance` manifest (sourced from `assets/bootstrap/flux-instance.yaml`).

#### Scenario: FluxInstance resource exists after Application apply

- **WHEN** `kubectl apply -f gitops-provider-app.yaml` is run on a cluster with flux-operator
  installed
- **THEN** `kubectl get fluxinstance flux -n flux-system` returns the resource without error

#### Scenario: Flux controllers are Running after Application reconciles

- **WHEN** the `gitops-provider` Application reaches `phase: running`
- **THEN** `kubectl get pods -n flux-system` shows source-controller, kustomize-controller,
  helm-controller, and notification-controller all in `Running` state

### Requirement: Application is applied by the CLI bootstrap command

`staccato bootstrap init` Phase 3d SHALL apply `gitops-provider-app.yaml` via `kubectl apply`
after both addons are enabled (`Phase 3a`, `Phase 3b`) and the OCI artifact is seeded
(`Phase 3c`).

#### Scenario: Application applied after addons and seed

- **WHEN** `staccato bootstrap init` runs and both addons are enabled and oci-seed is complete
- **THEN** `gitops-provider-app.yaml` is applied to the cluster

#### Scenario: Application apply is idempotent

- **WHEN** `staccato bootstrap init` is run on a cluster where `gitops-provider` Application
  already exists
- **THEN** `kubectl apply` is a no-op or patches only changed fields; no error is returned

### Requirement: Bootstrap CLI exposes oci-seed subcommand

`staccato bootstrap oci-seed` SHALL push a minimal OCI artifact (containing the platform
bootstrap manifests) to Harbor using the local `flux` CLI, making the artifact available before
the FluxInstance is applied.

#### Scenario: oci-seed pushes artifact to Harbor

- **WHEN** `staccato bootstrap oci-seed` is run with Harbor reachable
- **THEN** the command exits 0 and the artifact is present in Harbor at
  `harbor-core.harbor.svc.cluster.local/staccato/manifests:bootstrap`

#### Scenario: oci-seed is idempotent

- **WHEN** `staccato bootstrap oci-seed` is run and the artifact already exists in Harbor
- **THEN** the push succeeds (overwrite is acceptable) and the command exits 0
