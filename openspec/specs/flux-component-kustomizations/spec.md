---
td-board: flux-kustomization-wiring-component-kustomizations
td-issue: td-febb18
---

# Specification: Flux Component Kustomizations

## Overview

Defines the per-component per-environment `Kustomization` CRD objects that reconcile rendered
manifests from `staccato-manifests/<component>/<env>/k8s/` into the target cluster namespace.
These objects implement the GitOps wiring layer between the rendered-manifests layout and the
running cluster state.

## ADDED Requirements

### Requirement: Kustomization naming and path wiring

For each `<component>/<env>` combination tracked in `staccato-manifests`, a `Kustomization`
resource SHALL exist named `<env>-<component>` (e.g., `local-staccato-server`). The
`spec.path` SHALL be set to `./<component>/<env>/k8s` — the canonical path defined by
`rendered-manifests-layout`. All Kustomization resources SHALL be stored in
`staccato-manifests/flux-system/`.

#### Scenario: Name follows convention

- **WHEN** a Kustomization is created for component `staccato-server` targeting env `local`
- **THEN** `metadata.name` SHALL be `local-staccato-server`

#### Scenario: Path resolves to manifests directory

- **WHEN** `spec.path` is evaluated against the `staccato-manifests` repo
- **THEN** it SHALL resolve to `./staccato-server/local/k8s` (or the appropriate component/env)
  which MUST contain a `kustomization.yaml`

#### Scenario: Namespace placement

- **WHEN** a component Kustomization is authored
- **THEN** `metadata.namespace` SHALL be `flux-system`

#### Scenario: Target namespace set

- **WHEN** the Kustomization reconciles manifests into the cluster
- **THEN** `spec.targetNamespace` SHALL be set to the component's runtime namespace (e.g.,
  `staccato-server`) so resources are applied into the correct namespace

### Requirement: Prune policy enforcement

Every component `Kustomization` SHALL set `spec.prune: true`. This ensures that Kubernetes
resources removed from the manifests repo are automatically deleted from the cluster on the next
reconcile. Disabling prune SHALL NOT be permitted for application-layer Kustomizations managed by
this wiring layer.

#### Scenario: Prune enabled by default

- **WHEN** any component Kustomization is authored
- **THEN** `spec.prune` SHALL be `true`

#### Scenario: Resource deletion on manifest removal

- **WHEN** a YAML file is removed from `<component>/<env>/k8s/` in a merged PR
- **THEN** Flux SHALL delete the corresponding Kubernetes resource from the cluster within one
  reconcile interval

#### Scenario: Prune disabled prohibited

- **WHEN** a component Kustomization is submitted with `spec.prune: false`
- **THEN** a manifest linting check SHALL reject the manifest as a policy violation

### Requirement: Health checks for managed Deployments

Each component `Kustomization` SHALL declare a `spec.healthChecks` entry of kind `Deployment`
for every `Deployment` it reconciles. The health check entry MUST specify the correct `name` and
`namespace` matching the Deployment resource. `spec.timeout` SHALL be set to `5m` to bound the
health-check wait window.

#### Scenario: Deployment health check entry

- **WHEN** a Kustomization manages a Deployment named `staccato-server` in namespace
  `staccato-server`
- **THEN** `spec.healthChecks` SHALL contain `{ kind: Deployment, name: staccato-server,
  namespace: staccato-server }`

#### Scenario: Timeout bounded

- **WHEN** `spec.healthChecks` is declared
- **THEN** `spec.timeout` SHALL be set and SHALL NOT exceed `5m`

#### Scenario: Health check gates dependents

- **WHEN** a downstream Kustomization declares `spec.dependsOn` referencing this Kustomization
- **THEN** the downstream Kustomization SHALL not reconcile until this Kustomization reports
  `Ready: True`

### Requirement: Reconcile interval per component

All component `Kustomization` objects SHALL set `spec.interval` to `1m` for application-layer
components. Intervals MUST NOT be set below `30s`.

#### Scenario: Application layer interval

- **WHEN** a Kustomization is authored for a `staccato-toolkit` application component
- **THEN** `spec.interval` SHALL be `1m`

#### Scenario: Minimum interval guard

- **WHEN** any Kustomization interval is set
- **THEN** it MUST NOT be less than `30s`

### Requirement: Kustomizations stored in flux-system

All `Kustomization` objects for component wiring SHALL reside in
`staccato-manifests/flux-system/`. Each Kustomization SHALL be stored in its own YAML file
named `kustomization-<env>-<component>.yaml` (e.g.,
`flux-system/kustomization-local-staccato-server.yaml`). The `flux-system/kustomization.yaml`
(the Kustomize manifest) MUST include all Kustomization YAML files as resources.

#### Scenario: File naming convention

- **WHEN** a component Kustomization YAML is committed to `staccato-manifests`
- **THEN** its filename SHALL follow `kustomization-<env>-<component>.yaml` inside
  `flux-system/`

#### Scenario: Kustomize manifest includes wiring files

- **WHEN** the `flux-system/kustomization.yaml` is rendered
- **THEN** it SHALL list all `kustomization-*.yaml` files under `resources:`

#### Scenario: Self-reconciliation applies wiring

- **WHEN** Flux reconciles the `flux-system` Kustomization (bootstrap)
- **THEN** all component Kustomization objects SHALL be created or updated in the cluster
  automatically
