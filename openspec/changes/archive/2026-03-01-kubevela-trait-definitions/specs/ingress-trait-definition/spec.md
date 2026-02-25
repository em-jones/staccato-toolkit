---
td-board: kubevela-trait-definitions-ingress
td-issue: td-033429
---

# Specification: ingress TraitDefinition

## Overview

Defines requirements for the platform-owned `ingress` KubeVela `TraitDefinition` CRD, which exposes a component to external traffic via a Kubernetes `Ingress` and `Service`. Application teams attach this trait in their OAM `Application` manifest under `traits:`; the platform definition resolves this to the required `Ingress` and `Service` resources.

## ADDED Requirements

### Requirement: ingress TraitDefinition CRD manifest exists in the repository

The platform SHALL provide a `TraitDefinition` CRD manifest named `ingress` stored at `src/ops/kubevela/trait-definitions/ingress.yaml`, so that it can be applied to the cluster and discovered by KubeVela.

#### Scenario: Manifest is present and valid

- **WHEN** a developer browses `src/ops/kubevela/trait-definitions/`
- **THEN** they SHALL find `ingress.yaml` — a valid KubeVela `TraitDefinition` YAML with `apiVersion: core.oam.dev/v1beta1` and `kind: TraitDefinition`

#### Scenario: CUE template renders Ingress and Service

- **WHEN** a platform engineer reads `ingress.yaml`
- **THEN** the embedded CUE template SHALL render both a `Service` (ClusterIP) and an `Ingress` resource targeting that Service for the component instance

### Requirement: ingress exposes configurable host and port parameters

The `ingress` TraitDefinition SHALL expose parameters for the ingress hostname and the target service port so that application teams can customise routing without forking the definition.

#### Scenario: Required host parameter is provided

- **WHEN** an application team attaches the `ingress` trait with a `host` parameter (e.g., `host: myapp.example.com`)
- **THEN** the generated `Ingress` SHALL set the rule host to `myapp.example.com`

#### Scenario: Default service port is used when not specified

- **WHEN** an application team attaches the `ingress` trait without specifying a `servicePort`
- **THEN** the generated `Service` SHALL target port `80` by default

#### Scenario: Custom service port is respected

- **WHEN** an application team specifies `servicePort: 3000` in the trait parameters
- **THEN** the generated `Service` SHALL target port `3000`

### Requirement: ingress TraitDefinition is registered before application teams reference it

The platform SHALL apply the `ingress` TraitDefinition to the cluster (via the Kustomize-managed path) before any OAM `Application` that attaches the `ingress` trait is deployed.

#### Scenario: Definition is present after cluster setup

- **WHEN** a developer runs the cluster setup procedure (including applying trait definitions)
- **THEN** `kubectl get traitdefinition ingress -n vela-system` SHALL return the definition without error

#### Scenario: Application using ingress trait deploys successfully

- **WHEN** a developer applies an OAM `Application` with the `ingress` trait attached to a component
- **THEN** `vela status <app-name>` SHALL report the component as running, with an `Ingress` and `Service` visible in the cluster
