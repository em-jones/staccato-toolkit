---
td-board: kustomize-usage-rules-configmap-secret-generation
td-issue: td-cb570e
---

# Specification: Kustomize ConfigMap and Secret Generation

## Overview

Defines how ConfigMaps and Secrets are generated in Kustomize overlays. Generated resources use `configMapGenerator` and `secretGenerator` fields in `kustomization.yaml`; raw ConfigMap/Secret manifests are prohibited in bases to prevent hash-suffix drift and sync issues.

## ADDED Requirements

### Requirement: ConfigMap generation from literals - td-695625

ConfigMaps whose values are known at authoring time SHALL be generated using the `configMapGenerator` field with a `literals:` list in the overlay `kustomization.yaml`. Each literal SHALL use the `key=value` format.

#### Scenario: ConfigMap generated from literals in overlay

- **WHEN** an overlay `kustomization.yaml` contains a `configMapGenerator` entry with `literals:`
- **THEN** `kustomize build` SHALL emit a ConfigMap with the specified keys and values, with a content-hash suffix appended to the name

#### Scenario: Dependent workload references generated ConfigMap name

- **WHEN** a Deployment in the same kustomization references the ConfigMap by its generator name
- **THEN** `kustomize build` SHALL rewrite the reference to include the content-hash suffix automatically

### Requirement: ConfigMap generation from files - td-cb76fe

ConfigMaps whose values are stored in external files SHALL be generated using the `configMapGenerator` field with a `files:` list. File paths SHALL be relative to the `kustomization.yaml` file.

#### Scenario: ConfigMap generated from file

- **WHEN** an overlay `kustomization.yaml` specifies `configMapGenerator[].files` referencing a local file
- **THEN** `kustomize build` SHALL emit a ConfigMap with the file content as the key's value

#### Scenario: Missing file causes build failure

- **WHEN** a `files:` entry references a path that does not exist
- **THEN** `kustomize build` SHALL fail with a descriptive error before producing any output

### Requirement: Secret generation from literals - td-ede147

Secrets whose values are available as literals (e.g., injected at build time by CI) SHALL be generated using the `secretGenerator` field with a `literals:` list. Values are base64-encoded automatically by Kustomize.

#### Scenario: Secret generated from literals

- **WHEN** an overlay `kustomization.yaml` contains a `secretGenerator` entry with `literals:`
- **THEN** `kustomize build` SHALL emit a Secret with base64-encoded values and a content-hash suffix

#### Scenario: Secret values not checked in as plaintext in base

- **WHEN** any file under `base/` is inspected
- **THEN** no Secret manifest with plaintext `stringData` or base64 values SHALL exist; secrets MUST come from generators in overlays

### Requirement: Secret generation from files - td-5ef0b7

Secrets whose values are stored in files (e.g., TLS certificates, token files) SHALL be generated using the `secretGenerator` field with a `files:` list. File paths SHALL be relative to the `kustomization.yaml` file and SHALL NOT be committed to the repository.

#### Scenario: Secret generated from file reference

- **WHEN** an overlay `kustomization.yaml` specifies `secretGenerator[].files` referencing a local file
- **THEN** `kustomize build` SHALL emit a Secret with the file content encoded appropriately

#### Scenario: Secret source files excluded from version control

- **WHEN** a secret source file is referenced in a `secretGenerator`
- **THEN** that file's path SHALL appear in `.gitignore` or be supplied at build time by CI, not committed to the repository

### Requirement: No raw ConfigMap/Secret manifests in base - td-7b59d0

The `base/` directory SHALL NOT contain raw ConfigMap or Secret YAML manifests. All ConfigMaps and Secrets MUST be produced via `configMapGenerator` or `secretGenerator` entries in a `kustomization.yaml` to ensure consistent hash-suffix management and prevent stale references.

#### Scenario: Base directory contains no raw ConfigMap

- **WHEN** all YAML files under `base/` are inspected for `kind: ConfigMap`
- **THEN** no such file SHALL exist; ConfigMaps MUST be declared via `configMapGenerator`

#### Scenario: Base directory contains no raw Secret

- **WHEN** all YAML files under `base/` are inspected for `kind: Secret`
- **THEN** no such file SHALL exist; Secrets MUST be declared via `secretGenerator`
