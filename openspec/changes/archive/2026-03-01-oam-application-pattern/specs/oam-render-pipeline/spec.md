---
td-board: oam-application-pattern-oam-render-pipeline
td-issue: td-b30b5a
---

# Specification: OAM Render Pipeline

## Overview

Defines how CI runs `vela export` to render an OAM `Application` manifest into concrete Kubernetes resource YAML files and writes those outputs into the `staccato-manifests/<component>/<env>/k8s/` directory tree defined by the `rendered-manifests-layout` spec. This spec defines the contract between the KubeVela rendering step and the GitOps manifest repository.

## ADDED Requirements

### Requirement: vela export renders Application to Kubernetes manifests

For each component that declares an OAM `Application` manifest, CI SHALL execute `vela export -f src/<component-name>/app.yaml --env <env>` to produce a set of rendered Kubernetes resource YAML files (Deployment, Service, ServiceMonitor, Ingress, etc.). The render step SHALL run against a KubeVela instance with all required `ComponentDefinition` and `TraitDefinition` CRDs registered.

#### Scenario: vela export produces Deployment for webservice type

- **WHEN** CI runs `vela export` on an Application manifest that uses `type: webservice`
- **THEN** the output SHALL include a `Deployment` resource with the image, env vars, and probe configuration derived from the `properties` block

#### Scenario: vela export produces ServiceMonitor for prometheus-scrape trait

- **WHEN** CI runs `vela export` on an Application manifest that includes the `prometheus-scrape` trait
- **THEN** the output SHALL include a `ServiceMonitor` resource with `endpoints[].port` matching the value from `traits[].properties.port`

#### Scenario: vela export produces Ingress for ingress trait

- **WHEN** CI runs `vela export` on an Application manifest that includes the `ingress` trait
- **THEN** the output SHALL include an `Ingress` resource with `spec.rules[].host` set to `traits[].properties.domain`

### Requirement: Rendered manifests are written to staccato-manifests repo

The output of `vela export` SHALL be written to `staccato-manifests/<component-name>/<env>/k8s/` following the layout defined in `rendered-manifests-layout`. Each rendered resource SHALL be written to a separate YAML file named by kind (e.g., `deployment.yaml`, `service.yaml`, `service-monitor.yaml`). No source code or `Application` manifest files SHALL be written to `staccato-manifests`.

#### Scenario: Rendered files appear at canonical paths

- **WHEN** CI renders `staccato-server` for the `dev` environment
- **THEN** `staccato-manifests/staccato-server/dev/k8s/deployment.yaml`, `staccato-manifests/staccato-server/dev/k8s/service.yaml`, and `staccato-manifests/staccato-server/dev/k8s/service-monitor.yaml` SHALL exist and be valid Kubernetes YAML

#### Scenario: staccato-manifests contains only rendered artifacts

- **WHEN** a reviewer inspects `staccato-manifests/staccato-server/dev/k8s/`
- **THEN** they SHALL find only rendered Kubernetes YAML files — no `app.yaml`, no CUE templates, no source code

### Requirement: CI pipeline triggers render on Application manifest change

A CI pipeline job SHALL detect changes to any `src/<component-name>/app.yaml` file and automatically execute the render pipeline for the affected component and target environments. The render job SHALL commit and push the updated rendered manifests to `staccato-manifests` via a pull request.

#### Scenario: Render is triggered when app.yaml changes

- **WHEN** a pull request is merged that modifies `src/staccato-toolkit/server/app.yaml`
- **THEN** the CI pipeline SHALL trigger a render job that updates `staccato-manifests/staccato-server/<env>/k8s/` for each configured environment

#### Scenario: Render PR is opened against staccato-manifests

- **WHEN** the render job completes successfully
- **THEN** a pull request SHALL be opened against the `staccato-manifests` repository containing only the diff of changed rendered Kubernetes YAML files
