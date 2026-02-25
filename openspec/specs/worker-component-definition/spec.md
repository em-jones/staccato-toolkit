---
td-board: kubevela-component-definitions-worker
td-issue: td-25869e
---

# Specification: worker ComponentDefinition

## Overview

Defines requirements for the platform-owned `worker` KubeVela `ComponentDefinition` CRD, which abstracts a long-running background process workload pattern. Application teams reference `type: worker` in their OAM `Application` manifests; the platform definition resolves this to a `Deployment` with no associated `Service` (no inbound network exposure).

## ADDED Requirements

### Requirement: worker ComponentDefinition CRD manifest exists in the repository

The platform SHALL provide a `ComponentDefinition` CRD manifest named `worker` stored at `src/ops/kubevela/component-definitions/worker.yaml`, so that it can be applied to the cluster and discovered by KubeVela.

#### Scenario: Manifest is present and valid

- **WHEN** a developer browses `src/ops/kubevela/component-definitions/`
- **THEN** they SHALL find `worker.yaml` — a valid KubeVela `ComponentDefinition` YAML with `apiVersion: core.oam.dev/v1beta1` and `kind: ComponentDefinition`

#### Scenario: CUE template references Deployment only

- **WHEN** a platform engineer reads `worker.yaml`
- **THEN** the embedded CUE template SHALL render a `Deployment` and SHALL NOT render a `Service` or any inbound network resource

### Requirement: worker Deployment has no Service or network exposure

The `worker` definition SHALL explicitly omit any `Service`, `Ingress`, or other network-exposure resource from its CUE template so that background processes are not accidentally exposed.

#### Scenario: No Service created for worker component

- **WHEN** an application team deploys a component with `type: worker`
- **THEN** `kubectl get svc -n <namespace>` SHALL return no service associated with the component
- **AND** only a `Deployment` (and its managed `Pod`) SHALL exist for the component

### Requirement: worker ComponentDefinition is registered with KubeVela before application teams reference it

The platform SHALL apply the `worker` ComponentDefinition to the cluster (via the Kustomize-managed path) before any OAM `Application` that references `type: worker` is deployed.

#### Scenario: Definition is present after cluster setup

- **WHEN** a developer runs the cluster setup procedure (including applying component definitions)
- **THEN** `kubectl get componentdefinition worker -n vela-system` SHALL return the definition without error

#### Scenario: Application using worker type deploys successfully

- **WHEN** a developer applies an OAM `Application` with a component of `type: worker`
- **THEN** `vela status <app-name>` SHALL report the component as running, with a `Deployment` visible and no `Service` created
