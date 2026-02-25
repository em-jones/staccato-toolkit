---
td-board: gitops-provider-component-harbor-registry-component
td-issue: td-c04811
---

# Specification: Harbor Registry Component

## Overview

Defines the `harbor` custom KubeVela addon. Harbor is managed via
`vela addon enable ./addons/harbor` rather than as an inline OAM `helm` component. The addon
wraps the `harbor/harbor` Helm chart, creates supplementary resources (namespace, credential
Secret template), and exposes resource-sizing parameters via `parameter.cue`.

## ADDED Requirements

### Requirement: harbor addon directory structure

The addon SHALL exist at `src/staccato-toolkit/core/assets/addons/harbor/` and contain:
`metadata.yaml`, `README.md`, `template.yaml`, `resources/` (Namespace manifest), and
`parameter.cue` (optional resource-sizing overrides).

#### Scenario: Addon is recognisable by vela CLI

- **WHEN** `vela addon list --discover` is run with the local addon registry path
- **THEN** the `harbor` addon appears in the output with its name and version

#### Scenario: Addon directory contains all required files

- **WHEN** `assets/addons/harbor/` is listed
- **THEN** `metadata.yaml`, `README.md`, `template.yaml`, `resources/`, and `parameter.cue`
  are all present

### Requirement: harbor template installs via Helm chart

The `template.yaml` SHALL define a KubeVela Application with a `helm`-typed component
referencing the `harbor/harbor` chart at a pinned version `>= 1.16.0`, installed into the
`harbor` namespace.

#### Scenario: Harbor pods reach Running state after addon enable

- **WHEN** `vela addon enable ./addons/harbor` completes
- **THEN** `kubectl get pods -n harbor` shows all Harbor pods (core, registry, portal,
  jobservice, database, redis) in `Running` state

#### Scenario: Harbor registry API is reachable from within the cluster

- **WHEN** a Pod sends an HTTP request to `http://harbor-core.harbor.svc.cluster.local/api/v2.0/ping`
- **THEN** the response status is 200

### Requirement: Harbor chart version is pinned

The `metadata.yaml` version and the Helm chart version in `template.yaml` SHALL both be
explicit semver strings.

#### Scenario: Pinned version is explicit in metadata and template

- **WHEN** `metadata.yaml` and `template.yaml` are read
- **THEN** both contain explicit semver version strings

### Requirement: Harbor admin credentials injected before addon enable

The Harbor admin password SHALL NOT be present in any addon file. The bootstrap CLI SHALL
create a `harbor-admin-credentials` Secret in the `harbor` namespace before running
`vela addon enable ./addons/harbor`. The addon `template.yaml` SHALL reference this Secret
via `valuesFrom` in the helm component properties.

#### Scenario: Credentials sourced from Secret, not addon YAML

- **WHEN** all addon files are inspected
- **THEN** no plaintext password is present; credential references point to a named Secret

#### Scenario: Missing credentials Secret causes descriptive failure

- **WHEN** `vela addon enable ./addons/harbor` is run without the credentials Secret
- **THEN** Harbor fails to start with a message referencing the missing Secret

### Requirement: Harbor resource sizing via parameter.cue

The addon SHALL expose optional parameters for PVC storage size and container resource limits
so that local dev (small) and production (large) profiles can differ without modifying the
addon YAML directly.

#### Scenario: Default parameters produce a working local dev deployment

- **WHEN** `vela addon enable ./addons/harbor` is run with no parameter overrides
- **THEN** Harbor deploys with small defaults suitable for local dev (e.g. 5Gi PVCs)

#### Scenario: Parameters override produces a production-sized deployment

- **WHEN** `vela addon enable ./addons/harbor --set storageSize=50Gi`
- **THEN** Harbor PVCs are created with 50Gi capacity

### Requirement: Harbor data persistence for local dev

Harbor data SHALL use Kubernetes PersistentVolumeClaims backed by the default StorageClass.
Data MAY be ephemeral (lost on cluster delete) in local dev.

#### Scenario: Harbor PVCs are created and bound

- **WHEN** Harbor is deployed on the local k0s cluster
- **THEN** `kubectl get pvc -n harbor` shows all Harbor PVCs in `Bound` state
