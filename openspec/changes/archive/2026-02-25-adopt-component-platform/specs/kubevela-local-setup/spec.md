---
td-board: adopt-component-platform-kubevela-local-setup
td-issue: td-ceaf9c
---

# Specification: KubeVela local setup

## Overview

Defines the requirements for setting up KubeVela in the local kind cluster so developers can use it to define and deploy application components in their development environment.

## ADDED Requirements

### Requirement: KubeVela controller is installed in the local kind cluster

The platform SHALL provide a repeatable procedure for installing the KubeVela controller into the local kind cluster using helm, so that `vela` commands work against the local cluster.

#### Scenario: KubeVela controller is running after setup

- **WHEN** a developer follows the setup procedure (cluster created with kind, KubeVela installed via helm)
- **THEN** `vela status` SHALL report the controller as running
- **AND** `kubectl get pods -n vela-system` SHALL show the kubevela controller pod in Running state

#### Scenario: Setup procedure is documented

- **WHEN** a developer reads the design document
- **THEN** they SHALL find a step-by-step setup procedure for creating a kind cluster and installing KubeVela into it via helm

### Requirement: KubeVela installation is declarative

The KubeVela controller installation SHALL be expressed as a helm values file (or equivalent rendered manifest) committed to the repository, so that the installation is reproducible and auditable.

#### Scenario: Installation is not ad-hoc

- **WHEN** a developer runs the setup procedure
- **THEN** they SHALL execute `helm install` with a values file from the repository, not with inline `--set` flags
- **AND** the rendered manifests pattern SHALL be followed (helm template reviewed before apply)

### Requirement: A sample OAM Application is defined and deployable

The platform SHALL include a minimal example OAM Application manifest that can be deployed to the local KubeVela setup to verify the installation end-to-end.

#### Scenario: Sample application deploys successfully

- **WHEN** a developer applies the sample OAM Application manifest to the KubeVela-enabled kind cluster
- **THEN** `vela status <app-name>` SHALL report the application as running
