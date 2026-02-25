---
td-board: kubevela-trait-definitions-autoscaler
td-issue: td-0c4788
---

# Specification: autoscaler TraitDefinition

## Overview

Defines requirements for the platform-owned `autoscaler` KubeVela `TraitDefinition` CRD, which attaches a Kubernetes `HorizontalPodAutoscaler` (HPA) to a component. Application teams attach this trait in their OAM `Application` manifest under `traits:`; the platform definition resolves this to an `HPA` resource targeting the component's workload.

## ADDED Requirements

### Requirement: autoscaler TraitDefinition CRD manifest exists in the repository

The platform SHALL provide a `TraitDefinition` CRD manifest named `autoscaler` stored at `src/ops/kubevela/trait-definitions/autoscaler.yaml`, so that it can be applied to the cluster and discovered by KubeVela.

#### Scenario: Manifest is present and valid

- **WHEN** a developer browses `src/ops/kubevela/trait-definitions/`
- **THEN** they SHALL find `autoscaler.yaml` — a valid KubeVela `TraitDefinition` YAML with `apiVersion: core.oam.dev/v1beta1` and `kind: TraitDefinition`

#### Scenario: CUE template renders a HorizontalPodAutoscaler

- **WHEN** a platform engineer reads `autoscaler.yaml`
- **THEN** the embedded CUE template SHALL render an `autoscaling/v2` `HorizontalPodAutoscaler` that targets the component's `Deployment` via `scaleTargetRef`

### Requirement: autoscaler exposes configurable min, max replicas and CPU threshold

The `autoscaler` TraitDefinition SHALL expose parameters for minimum replicas, maximum replicas, and CPU utilisation target percentage so that application teams can control scaling behaviour without forking the definition.

#### Scenario: Default scaling parameters are applied

- **WHEN** an application team attaches the `autoscaler` trait without specifying parameters
- **THEN** the generated HPA SHALL set `minReplicas: 1`, `maxReplicas: 5`, and CPU target at `80` percent utilisation

#### Scenario: Custom min and max replicas are respected

- **WHEN** an application team specifies `minReplicas: 2` and `maxReplicas: 10` in the trait parameters
- **THEN** the generated HPA SHALL reflect `minReplicas: 2` and `maxReplicas: 10`

#### Scenario: Custom CPU target is respected

- **WHEN** an application team specifies `cpuUtilization: 60` in the trait parameters
- **THEN** the generated HPA SHALL set the CPU average utilisation target to `60` percent

### Requirement: autoscaler TraitDefinition is registered before application teams reference it

The platform SHALL apply the `autoscaler` TraitDefinition to the cluster (via the Kustomize-managed path) before any OAM `Application` that attaches the `autoscaler` trait is deployed.

#### Scenario: Definition is present after cluster setup

- **WHEN** a developer runs the cluster setup procedure (including applying trait definitions)
- **THEN** `kubectl get traitdefinition autoscaler -n vela-system` SHALL return the definition without error

#### Scenario: Application using autoscaler trait deploys successfully

- **WHEN** a developer applies an OAM `Application` with the `autoscaler` trait attached to a component
- **THEN** `vela status <app-name>` SHALL report the component as running, with an `HPA` visible in the cluster targeting the component's `Deployment`
