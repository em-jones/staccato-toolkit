---
td-board: gitops-provider-component-flux-operator-component
td-issue: td-94a5c5
---

# Specification: Flux Operator Component

## Overview

Defines the `flux-operator` custom KubeVela addon. Rather than an inline OAM `helm` component
inside a parent Application, flux-operator is a first-class addon managed via
`vela addon enable ./addons/flux-operator`. The addon wraps the flux-operator OCI Helm chart and
declares a dependency on the `harbor` addon to enforce install ordering.

## ADDED Requirements

### Requirement: flux-operator addon directory structure

The addon SHALL exist at `src/staccato-toolkit/core/assets/addons/flux-operator/` and contain
the required KubeVela addon files: `metadata.yaml`, `README.md`, `template.yaml`, and a
`resources/` directory containing the `flux-system` Namespace manifest.

#### Scenario: Addon is recognisable by vela CLI

- **WHEN** `vela addon list --discover` is run with the local addon registry path
- **THEN** the `flux-operator` addon appears in the output with its name and version from
  `metadata.yaml`

#### Scenario: Addon directory contains all required files

- **WHEN** the `assets/addons/flux-operator/` directory is listed
- **THEN** `metadata.yaml`, `README.md`, `template.yaml`, and `resources/` are all present

### Requirement: flux-operator metadata declares harbor dependency

The `metadata.yaml` SHALL declare `dependencies: [{name: harbor}]` so KubeVela ensures the
`harbor` addon is enabled before `flux-operator` is enabled.

#### Scenario: Enabling flux-operator without harbor fails with a clear message

- **WHEN** `vela addon enable ./addons/flux-operator` is run on a cluster where the harbor addon
  is not yet enabled
- **THEN** the command fails with a message indicating the `harbor` dependency is not satisfied

#### Scenario: harbor dependency listed in metadata

- **WHEN** `metadata.yaml` is parsed
- **THEN** the `dependencies` field contains an entry with `name: harbor`

### Requirement: flux-operator template installs via OCI Helm chart

The `template.yaml` SHALL define a KubeVela Application with a `helm`-typed component that
references `oci://ghcr.io/controlplaneio-fluxcd/charts/flux-operator` at a pinned version
`>= 0.10.0`.

#### Scenario: flux-operator CRDs registered after addon enable

- **WHEN** `vela addon enable ./addons/flux-operator` completes successfully
- **THEN** `kubectl get crd fluxinstances.fluxcd.controlplane.io` returns the CRD without error

#### Scenario: flux-operator controller pod is Running

- **WHEN** `vela addon enable ./addons/flux-operator` completes
- **THEN** `kubectl get pods -n flux-system -l app.kubernetes.io/name=flux-operator` shows one
  pod in `Running` state

### Requirement: flux-operator installed into flux-system namespace

The addon SHALL create the `flux-system` namespace (via `resources/` manifest) and install the
flux-operator Helm release into it.

#### Scenario: flux-system namespace exists after addon enable

- **WHEN** `vela addon enable ./addons/flux-operator` completes
- **THEN** `kubectl get namespace flux-system` returns the namespace without error

### Requirement: flux-operator addon version is pinned

The `metadata.yaml` version field and the Helm chart version in `template.yaml` SHALL both be
explicit semver strings, not ranges or `latest`.

#### Scenario: Version is explicit in metadata and template

- **WHEN** `metadata.yaml` and `template.yaml` are read
- **THEN** both contain explicit semver version strings (e.g. `0.10.0`, not `*` or `latest`)
