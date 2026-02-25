---
td-board: kubevela-trait-definitions-prometheus-scrape
td-issue: td-e812c1
---

# Specification: prometheus-scrape TraitDefinition

## Overview

Defines requirements for the platform-owned `prometheus-scrape` KubeVela `TraitDefinition` CRD, which adds a Prometheus `ServiceMonitor` for automatic metric scraping of a component. Application teams attach this trait in their OAM `Application` manifest under `traits:`; the platform definition resolves this to a `ServiceMonitor` resource that integrates with the cluster's Prometheus stack.

## ADDED Requirements

### Requirement: prometheus-scrape TraitDefinition CRD manifest exists in the repository

The platform SHALL provide a `TraitDefinition` CRD manifest named `prometheus-scrape` stored at `src/ops/kubevela/trait-definitions/prometheus-scrape.yaml`, so that it can be applied to the cluster and discovered by KubeVela.

#### Scenario: Manifest is present and valid

- **WHEN** a developer browses `src/ops/kubevela/trait-definitions/`
- **THEN** they SHALL find `prometheus-scrape.yaml` — a valid KubeVela `TraitDefinition` YAML with `apiVersion: core.oam.dev/v1beta1` and `kind: TraitDefinition`

#### Scenario: CUE template renders a ServiceMonitor

- **WHEN** a platform engineer reads `prometheus-scrape.yaml`
- **THEN** the embedded CUE template SHALL render a `monitoring.coreos.com/v1` `ServiceMonitor` resource targeting the component's Service

### Requirement: prometheus-scrape exposes configurable metrics port and path parameters

The `prometheus-scrape` TraitDefinition SHALL expose parameters for the metrics port name and scrape path so that application teams can target their component's actual metrics endpoint without forking the definition.

#### Scenario: Default scrape parameters are applied

- **WHEN** an application team attaches the `prometheus-scrape` trait without specifying parameters
- **THEN** the generated `ServiceMonitor` SHALL configure endpoint with port name `metrics` and path `/metrics`

#### Scenario: Custom metrics port name is respected

- **WHEN** an application team specifies `port: "prom"` in the trait parameters
- **THEN** the generated `ServiceMonitor` SHALL configure the endpoint with port name `prom`

#### Scenario: Custom scrape path is respected

- **WHEN** an application team specifies `path: "/actuator/prometheus"` in the trait parameters
- **THEN** the generated `ServiceMonitor` SHALL configure the endpoint with path `/actuator/prometheus`

### Requirement: prometheus-scrape generated ServiceMonitor conforms to servicemonitor-definition spec

The `ServiceMonitor` rendered by the `prometheus-scrape` trait SHALL conform to the `servicemonitor-definition` spec requirements: it SHALL include a selector matching the component's Service labels, a `namespaceSelector` scoped to the component's namespace, and explicit `interval` and `timeout` values on each endpoint.

#### Scenario: ServiceMonitor has selector and namespace scope

- **WHEN** the `prometheus-scrape` trait renders a ServiceMonitor for a component
- **THEN** the ServiceMonitor SHALL include a `selector` matching the component's Service labels and a `namespaceSelector` scoped to the component's namespace

#### Scenario: ServiceMonitor includes scrape interval and timeout

- **WHEN** the `prometheus-scrape` trait renders a ServiceMonitor
- **THEN** the endpoint configuration SHALL include explicit `interval` (default `30s`) and `timeout` (default `10s`) values

### Requirement: prometheus-scrape TraitDefinition is registered before application teams reference it

The platform SHALL apply the `prometheus-scrape` TraitDefinition to the cluster (via the Kustomize-managed path) before any OAM `Application` that attaches the `prometheus-scrape` trait is deployed.

#### Scenario: Definition is present after cluster setup

- **WHEN** a developer runs the cluster setup procedure (including applying trait definitions)
- **THEN** `kubectl get traitdefinition prometheus-scrape -n vela-system` SHALL return the definition without error

#### Scenario: Application using prometheus-scrape trait results in metrics being scraped

- **WHEN** a developer applies an OAM `Application` with the `prometheus-scrape` trait attached to a component that exposes a `/metrics` endpoint
- **THEN** Prometheus SHALL discover and scrape the component's metrics endpoint via the generated `ServiceMonitor`
