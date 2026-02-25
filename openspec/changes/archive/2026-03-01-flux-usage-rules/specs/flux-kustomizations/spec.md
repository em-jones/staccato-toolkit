---
td-board: flux-usage-rules-kustomizations
td-issue: td-1f3ec0
---

# Specification: Flux Kustomizations

## Overview

Defines rules for authoring and operating Flux v2 `Kustomization` CRDs. Kustomizations drive the reconciliation loop that applies rendered manifests from `staccato-manifests` paths into the cluster. These rules govern naming, intervals, pruning, health checks, dependencies, and operational procedures.

## ADDED Requirements

### Requirement: Kustomization path and naming conventions

`Kustomization` resources SHALL be named using the pattern `<environment>-<component>` (e.g., `local-observability`, `prod-staccato-server`). The `spec.path` MUST reference a directory in the `staccato-manifests` repository that contains a valid `kustomization.yaml`. Paths SHALL use the format `./clusters/<env>/<component>` or `./apps/<component>`.

#### Scenario: Kustomization naming

- **WHEN** a new `Kustomization` is created
- **THEN** its `metadata.name` SHALL follow the pattern `<environment>-<component>` in kebab-case

#### Scenario: Valid path reference

- **WHEN** `spec.path` is set
- **THEN** the referenced directory MUST contain a `kustomization.yaml` file in the `staccato-manifests` repo

#### Scenario: Namespace placement

- **WHEN** a `Kustomization` manages cluster-wide or cross-namespace resources
- **THEN** the `Kustomization` resource itself SHALL be placed in the `flux-system` namespace

### Requirement: Kustomization reconcile interval

All `Kustomization` resources SHALL set `spec.interval`. The interval SHALL be `2m` for infrastructure-layer components (cert-manager, ingress, storage) and `1m` for application-layer components. Intervals MUST NOT be set below `30s` in any environment.

#### Scenario: Infrastructure interval

- **WHEN** a `Kustomization` manages infrastructure components
- **THEN** `spec.interval` SHALL be set to `2m`

#### Scenario: Application interval

- **WHEN** a `Kustomization` manages application workloads
- **THEN** `spec.interval` SHALL be set to `1m`

#### Scenario: Minimum interval guard

- **WHEN** any `Kustomization` is authored
- **THEN** `spec.interval` MUST NOT be less than `30s`

### Requirement: Pruning policy enforcement

All `Kustomization` resources SHALL set `spec.prune: true`. This ensures that resources removed from the manifests repo are deleted from the cluster. Disabling prune (`spec.prune: false`) is permitted only for stateful workloads with explicit data retention requirements, and MUST include a comment explaining the exception.

#### Scenario: Default prune enabled

- **WHEN** a `Kustomization` is created for a stateless workload
- **THEN** `spec.prune` SHALL be `true`

#### Scenario: Prune disabled with justification

- **WHEN** `spec.prune: false` is set
- **THEN** the manifest MUST include a YAML comment directly above the field explaining the data retention reason

#### Scenario: Orphan cleanup

- **WHEN** a resource is removed from the `staccato-manifests` path
- **THEN** Flux SHALL delete the corresponding resource from the cluster within one reconcile interval

### Requirement: Health checks on Kustomizations

`Kustomization` resources SHALL declare `spec.healthChecks` for all managed Deployments, StatefulSets, and DaemonSets. Health checks enable Flux to report readiness and block dependent Kustomizations until their dependencies are healthy.

#### Scenario: Deployment health check

- **WHEN** a `Kustomization` manages a `Deployment`
- **THEN** a `spec.healthChecks` entry of kind `Deployment` MUST be declared with the correct name and namespace

#### Scenario: Health check blocking

- **WHEN** a `Kustomization` B depends on `Kustomization` A via `spec.dependsOn`
- **THEN** B SHALL NOT begin reconciliation until A reports `Ready: True`

#### Scenario: Health check timeout

- **WHEN** `spec.healthChecks` is declared
- **THEN** `spec.timeout` SHALL be set to at most `5m` to prevent indefinite blocking

### Requirement: Dependency ordering between Kustomizations

`Kustomization` resources that depend on shared infrastructure (e.g., CRDs, namespaces, secrets) SHALL declare `spec.dependsOn` referencing the upstream `Kustomization` by name. Circular dependencies are prohibited.

#### Scenario: CRD dependency

- **WHEN** a `Kustomization` applies custom resources whose CRD is managed by another `Kustomization`
- **THEN** `spec.dependsOn` MUST reference the CRD-installing `Kustomization`

#### Scenario: Namespace dependency

- **WHEN** a `Kustomization` creates resources in a namespace managed by a separate `Kustomization`
- **THEN** `spec.dependsOn` MUST reference the namespace-creating `Kustomization`

#### Scenario: No circular dependencies

- **WHEN** dependency chains are declared
- **THEN** no cycle SHALL exist in the `dependsOn` graph

### Requirement: Cross-namespace source references

`Kustomization` resources in namespaces other than `flux-system` MAY reference sources in `flux-system` by setting `spec.sourceRef.namespace: flux-system`. This pattern is the standard for sharing the `staccato-manifests` `GitRepository` across multiple Kustomizations.

#### Scenario: Cross-namespace sourceRef

- **WHEN** a `Kustomization` is placed outside `flux-system`
- **THEN** `spec.sourceRef.namespace` SHALL be set to `flux-system` to reference the shared source

#### Scenario: Source not duplicated

- **WHEN** multiple Kustomizations need the same `GitRepository`
- **THEN** the `GitRepository` SHALL be declared once in `flux-system` and referenced cross-namespace

### Requirement: Force reconcile procedure

Engineers SHALL use `flux reconcile kustomization <name> -n <namespace>` to trigger an immediate out-of-band reconciliation. The `--with-source` flag SHALL be added when the source itself needs to be refreshed (e.g., after a direct git push). Force reconcile MUST NOT be used as a substitute for fixing manifests.

#### Scenario: Immediate reconcile trigger

- **WHEN** an engineer needs to apply a change without waiting for the reconcile interval
- **THEN** they SHALL run `flux reconcile kustomization <name> -n flux-system`

#### Scenario: Force source refresh

- **WHEN** a new git commit is not yet reflected in Flux's source cache
- **THEN** `flux reconcile kustomization <name> --with-source -n flux-system` SHALL be used

#### Scenario: Reconcile not a workaround

- **WHEN** a force reconcile is required repeatedly for the same issue
- **THEN** the root cause SHALL be investigated (incorrect interval, broken health check, or source auth failure)
