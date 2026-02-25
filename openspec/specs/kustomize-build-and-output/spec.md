---
td-board: kustomize-usage-rules-build-and-output
td-issue: td-e6f893
---

# Specification: Kustomize Build and Output Conventions

## Overview

Defines how Kustomize is invoked and where rendered manifests are committed. Establishes the scope boundary between Kustomize (first-party manifests) and Helm (upstream third-party charts only).

## ADDED Requirements

### Requirement: kustomize build invocation pattern - td-74ed9a

Manifests SHALL be rendered by running `kustomize build overlays/<env>` from the component's manifest root. This command SHALL be the canonical invocation; alternate flags or wrapper scripts that alter output format require explicit documentation.

#### Scenario: CI renders manifests via kustomize build

- **WHEN** a CI pipeline renders manifests for a component
- **THEN** it SHALL invoke `kustomize build overlays/<env>` where `<env>` matches the target deployment environment

#### Scenario: Direct kubectl apply with kustomize flag is not used in production pipelines

- **WHEN** a production CD pipeline applies manifests to a cluster
- **THEN** it SHALL apply the pre-rendered committed output (not invoke `kubectl apply -k`) so that rendered output is reviewable before apply

### Requirement: Committed output path convention - td-e2fae0

The rendered output of `kustomize build overlays/<env>` SHALL be committed to `staccato-manifests/<component>/<env>/k8s/` in the manifests repository. The output SHALL be a set of plain YAML files (one per resource kind or a single concatenated file), not the Kustomize source tree.

#### Scenario: Rendered manifests committed at expected path

- **WHEN** `kustomize build overlays/<env>` is run and its output is written to disk
- **THEN** the output files SHALL reside at `staccato-manifests/<component>/<env>/k8s/`

#### Scenario: Output path is consistent across environments

- **WHEN** manifests are rendered for multiple environments of the same component
- **THEN** each environment's rendered output SHALL be placed at `staccato-manifests/<component>/<env>/k8s/` with `<env>` as the only differentiator in the path

### Requirement: Helm scope boundary - td-43be82

Helm SHALL only be used to install and manage upstream third-party charts (e.g., Prometheus, Cert-Manager). All first-party service manifests in staccato-toolkit SHALL be managed exclusively by Kustomize. Mixing Helm templating into Kustomize bases or overlays is prohibited.

#### Scenario: First-party service uses Kustomize only

- **WHEN** a staccato-toolkit service's Kubernetes manifests are reviewed
- **THEN** they SHALL be structured as a Kustomize base/overlays tree with no Helm chart files (`Chart.yaml`, `templates/`) present

#### Scenario: Third-party chart installed via Helm

- **WHEN** an upstream chart (e.g., Prometheus) is deployed into the cluster
- **THEN** it SHALL be managed via Helm (values files, helm upgrade) and NOT re-templated or wrapped in a Kustomize base
