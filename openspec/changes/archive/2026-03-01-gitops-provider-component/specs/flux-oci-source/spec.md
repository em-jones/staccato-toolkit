---
td-board: gitops-provider-component-flux-oci-source
td-issue: td-b42507
---

# Specification: Flux OCI Source

## Overview

Defines the updated `FluxInstance` configuration (existing asset `flux-instance.yaml`) and the
`flux-instance` OAM component. The FluxInstance references an `OCIRepository` source pointing at
Harbor, replacing the prior `GitRepository`/Gitea source. Also defines the OCI seed workflow step
that pushes the initial bootstrap artifact to Harbor before Flux begins reconciliation.

## MODIFIED Requirements

### Requirement: flux-instance-config

The existing `FluxInstance` asset at `assets/bootstrap/flux-instance.yaml` SHALL be updated to
declare an `OCIRepository` source (via the FluxInstance `sync` spec) pointing at the Harbor
registry deployed in the same bootstrap cycle, instead of a `GitRepository` source.

The FluxInstance SHALL retain its current component list: `source-controller`,
`kustomize-controller`, `helm-controller`, `notification-controller`. The `source-watcher`
component is removed (it is flux-operator-specific and not a Flux controller component).

#### Scenario: FluxInstance accepted with OCIRepository source

- **WHEN** the updated `flux-instance.yaml` is applied to a cluster with flux-operator running
- **THEN** the FluxInstance is accepted and flux-operator begins provisioning Flux controllers

#### Scenario: Flux controllers reconcile from Harbor OCI artifact

- **WHEN** the OCI bootstrap artifact exists in Harbor and Flux controllers are Running
- **THEN** `flux get sources oci -n flux-system` shows the source in `Ready=True` state

## ADDED Requirements

### Requirement: flux-instance OAM component in gitops-provider Application

The `flux-instance` component in the `gitops-provider` Application SHALL use a KubeVela
`k8s-objects` component type to apply the `FluxInstance` manifest.

#### Scenario: flux-instance component applies FluxInstance CRD

- **WHEN** the `deploy-flux-instance` workflow step runs
- **THEN** a `FluxInstance` resource named `flux` exists in the `flux-system` namespace

#### Scenario: Flux controllers are Running after flux-instance step

- **WHEN** the `deploy-flux-instance` workflow step completes
- **THEN** `kubectl get pods -n flux-system` shows source-controller, kustomize-controller,
  helm-controller, and notification-controller all in `Running` state

### Requirement: OCI seed workflow step pushes initial artifact

The `seed-oci-artifact` workflow step SHALL run a Kubernetes Job that pushes a minimal OCI
artifact (containing the platform bootstrap manifests) to Harbor using the Flux CLI
(`flux push artifact`), making the artifact available before `flux-instance` is applied.

#### Scenario: Seed Job pushes artifact to Harbor

- **WHEN** the `seed-oci-artifact` workflow step runs
- **THEN** the Job completes with exit code 0 and the artifact is present in Harbor at
  `harbor-core.harbor.svc.cluster.local/staccato/manifests:bootstrap`

#### Scenario: OCIRepository source URL matches Harbor artifact path

- **WHEN** the FluxInstance `sync.url` field is read
- **THEN** it matches the artifact path used by the seed Job
  (e.g. `oci://harbor-core.harbor.svc.cluster.local/staccato/manifests`)

### Requirement: Harbor credentials available to Flux

The Flux controllers SHALL be able to authenticate to Harbor to pull OCI artifacts. A
`kubernetes.io/dockerconfigjson` Secret SHALL be created in `flux-system` before the
`flux-instance` component is applied, and the FluxInstance `sync.secretRef` SHALL reference it.

#### Scenario: Flux successfully pulls artifact with credentials

- **WHEN** `flux reconcile source oci staccato-manifests -n flux-system` is run
- **THEN** the reconciliation completes without authentication errors

#### Scenario: Missing credentials Secret causes clear failure

- **WHEN** the Harbor credentials Secret is absent from `flux-system`
- **THEN** the OCIRepository shows `Ready=False` with a message referencing the missing Secret
