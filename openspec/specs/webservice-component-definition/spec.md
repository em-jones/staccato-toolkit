---
td-board: kubevela-component-definitions-webservice
td-issue: td-59e4d3
---

# Specification: webservice ComponentDefinition

## Overview

Defines requirements for the platform-owned `webservice` KubeVela `ComponentDefinition` CRD, which abstracts a long-running HTTP server workload pattern. Application teams reference `type: webservice` in their OAM `Application` manifests; the platform definition resolves this to a `Deployment` and a `Service`.

## ADDED Requirements

### Requirement: webservice ComponentDefinition CRD manifest exists in the repository

The platform SHALL provide a `ComponentDefinition` CRD manifest named `webservice` stored at `src/ops/kubevela/component-definitions/webservice.yaml`, so that it can be applied to the cluster and discovered by KubeVela.

#### Scenario: Manifest is present and valid

- **WHEN** a developer browses `src/ops/kubevela/component-definitions/`
- **THEN** they SHALL find `webservice.yaml` — a valid KubeVela `ComponentDefinition` YAML with `apiVersion: core.oam.dev/v1beta1` and `kind: ComponentDefinition`

#### Scenario: CUE template references Deployment and Service

- **WHEN** a platform engineer reads `webservice.yaml`
- **THEN** the embedded CUE template SHALL render a `Deployment` and a `Service` for the component instance

### Requirement: webservice exposes configurable HTTP port

The `webservice` definition SHALL expose a configurable port parameter (defaulting to `8080`) so application teams can bind their server to the correct port without forking the definition.

#### Scenario: Default port is 8080

- **WHEN** an application team deploys a component with `type: webservice` without specifying a port
- **THEN** the generated `Service` SHALL target port `8080` and the `Deployment` container SHALL expose `8080`

#### Scenario: Custom port is respected

- **WHEN** an application team specifies `port: 3000` in their component parameters
- **THEN** the generated `Service` SHALL target port `3000` and the `Deployment` container SHALL expose `3000`

### Requirement: webservice ComponentDefinition is registered with KubeVela before application teams reference it

The platform SHALL apply the `webservice` ComponentDefinition to the cluster (via the Kustomize-managed path) before any OAM `Application` that references `type: webservice` is deployed.

#### Scenario: Definition is present after cluster setup

- **WHEN** a developer runs the cluster setup procedure (including applying component definitions)
- **THEN** `kubectl get componentdefinition webservice -n vela-system` SHALL return the definition without error

#### Scenario: Application using webservice type deploys successfully

- **WHEN** a developer applies an OAM `Application` with a component of `type: webservice`
- **THEN** `vela status <app-name>` SHALL report the component as running, with a `Deployment` and a `Service` visible in the cluster
