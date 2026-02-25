---
td-board: oam-application-pattern-oam-application-manifest
td-issue: td-805b2b
---

# Specification: OAM Application Manifest

## Overview

Defines the structure, location, and authoring rules for the OAM `Application` manifest that application teams write to declare their Kubernetes workloads. An `Application` manifest references a `ComponentDefinition` type (e.g., `webservice`) and attaches traits (e.g., `prometheus-scrape`, `ingress`) to configure platform-managed capabilities. KubeVela renders this manifest into Kubernetes resources.

## ADDED Requirements

### Requirement: Application manifest lives in application source repo

Each `staccato-toolkit` component that runs as a Kubernetes workload SHALL have an OAM `Application` manifest at `src/<component-name>/app.yaml` within its source repository.

#### Scenario: Application manifest exists at canonical path

- **WHEN** a developer looks for the Kubernetes workload declaration for a component named `staccato-server`
- **THEN** they SHALL find the `Application` manifest at `src/staccato-toolkit/server/app.yaml`

#### Scenario: No raw Deployment YAML in source repo after migration

- **WHEN** the OAM Application pattern is adopted for a component
- **THEN** no raw `Deployment`, `Service`, or `ServiceMonitor` YAML files SHALL remain in the component's source directory — these are exclusively outputs written to `staccato-manifests`

### Requirement: Application manifest references a ComponentDefinition type

The `spec.components[].type` field in every `Application` manifest SHALL reference a platform-registered `ComponentDefinition` (e.g., `webservice`, `worker`, `cron-task`). The `spec.components[].properties` block SHALL carry only the fields defined as inputs by that `ComponentDefinition`'s schema.

#### Scenario: webservice type is used for long-running HTTP servers

- **WHEN** a developer declares a component that runs a long-running HTTP server
- **THEN** the `Application` manifest SHALL use `type: webservice` and the `properties` block SHALL include at minimum: `image`, `port`, `env` (list), `livenessProbe`, and `readinessProbe`

#### Scenario: Unknown component type is rejected

- **WHEN** a developer uses a `type` field that is not registered as a `ComponentDefinition` on the cluster
- **THEN** `vela up` SHALL fail with a descriptive error identifying the unknown type

### Requirement: Traits are attached in the Application manifest

Platform capabilities that must be applied to a component (metrics scraping, ingress routing) SHALL be declared as trait entries under `spec.components[].traits[]` in the `Application` manifest. Each trait entry SHALL have a `type` field referencing a registered `TraitDefinition` and a `properties` block carrying trait-specific inputs.

#### Scenario: prometheus-scrape trait is required for components exposing metrics

- **WHEN** a component exposes a `/metrics` endpoint
- **THEN** the `Application` manifest SHALL include a trait entry with `type: prometheus-scrape` and `properties.port` set to the metrics port

#### Scenario: ingress trait is required for components exposing HTTP endpoints

- **WHEN** a component exposes HTTP endpoints that must be reachable from outside the cluster
- **THEN** the `Application` manifest SHALL include a trait entry with `type: ingress` and `properties.domain` set to the component's hostname

#### Scenario: Unknown trait type is rejected

- **WHEN** a developer uses a `type` in `traits[]` that is not registered as a `TraitDefinition`
- **THEN** `vela up` SHALL fail with a descriptive error identifying the unknown trait

### Requirement: Application manifest validates against OAM schema

Every `Application` manifest SHALL pass validation against the OAM Application CRD schema before being committed. The top-level required fields SHALL be: `apiVersion: core.oam.dev/v1beta1`, `kind: Application`, `metadata.name`, and `spec.components[]` (non-empty).

#### Scenario: Manifest with required fields validates successfully

- **WHEN** a developer runs `kubectl apply --dry-run=client -f src/staccato-toolkit/server/app.yaml`
- **THEN** the command SHALL exit 0 with no validation errors

#### Scenario: Manifest missing required fields is rejected

- **WHEN** a developer omits the `spec.components` field from an `Application` manifest
- **THEN** `kubectl apply --dry-run=client` SHALL exit non-zero with a schema validation error
