---
td-board: kustomize-usage-rules-namespace-injection
td-issue: td-0820c0
---

# Specification: Kustomize Namespace Injection

## Overview

Defines how Kubernetes namespaces are assigned to rendered manifests. Namespace values are environment-specific and SHALL be injected via the `namespace:` field in each overlay's `kustomization.yaml`. Base manifests SHALL NOT hard-code namespace names.

## ADDED Requirements

### Requirement: Namespace field in overlay kustomization - td-12cf33

Each overlay `kustomization.yaml` SHALL declare the `namespace:` field set to the target namespace for that environment. Kustomize SHALL propagate this value to all namespaced resources in the rendered output.

#### Scenario: Overlay sets namespace for all resources

- **WHEN** an overlay `kustomization.yaml` specifies `namespace: <env-namespace>`
- **THEN** `kustomize build` SHALL emit all namespaced resources with `metadata.namespace` set to that value

#### Scenario: Missing namespace field causes resources to use base default

- **WHEN** an overlay `kustomization.yaml` omits the `namespace:` field
- **THEN** rendered resources SHALL inherit whatever namespace (or none) is declared in the base, which is treated as a configuration error to be caught in CI review

### Requirement: No hard-coded namespace in base resources - td-57ddef

Base resource manifests SHALL NOT include `metadata.namespace`. Namespace assignment is exclusively the responsibility of overlays via the `namespace:` field. Hard-coded namespaces in base manifests would silently override overlay injection for cluster-scoped tooling.

#### Scenario: Base manifests omit namespace field

- **WHEN** any file under `base/` is parsed and its `metadata` block is inspected
- **THEN** no `namespace:` key SHALL be present in any namespaced resource manifest

#### Scenario: Linter detects hard-coded namespace in base

- **WHEN** a manifest linter checks files under `base/`
- **THEN** the presence of `metadata.namespace` SHALL be flagged as a policy violation

### Requirement: Namespace per environment overlay - td-6bd6e4

Each environment's overlay SHALL declare a distinct namespace value appropriate to that environment (e.g., `staccato-dev`, `staccato-staging`, `staccato-prod`). Sharing namespaces across environments is prohibited.

#### Scenario: Dev overlay uses dev namespace

- **WHEN** `overlays/dev/kustomization.yaml` is read
- **THEN** its `namespace:` field SHALL reference a namespace scoped to the dev environment

#### Scenario: Prod overlay uses prod namespace

- **WHEN** `overlays/prod/kustomization.yaml` is read
- **THEN** its `namespace:` field SHALL reference a namespace scoped to the prod environment, distinct from the dev namespace
