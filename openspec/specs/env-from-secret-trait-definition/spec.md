---
td-board: kubevela-trait-definitions-env-from-secret
td-issue: td-8d95df
---

# Specification: env-from-secret TraitDefinition

## Overview

Defines requirements for the platform-owned `env-from-secret` KubeVela `TraitDefinition` CRD, which injects environment variables from a Kubernetes `Secret` into a component's containers. Application teams attach this trait in their OAM `Application` manifest under `traits:`; the platform definition adds `envFrom` entries to the component's container spec, referencing the named Secret(s).

## ADDED Requirements

### Requirement: env-from-secret TraitDefinition CRD manifest exists in the repository

The platform SHALL provide a `TraitDefinition` CRD manifest named `env-from-secret` stored at `src/ops/kubevela/trait-definitions/env-from-secret.yaml`, so that it can be applied to the cluster and discovered by KubeVela.

#### Scenario: Manifest is present and valid

- **WHEN** a developer browses `src/ops/kubevela/trait-definitions/`
- **THEN** they SHALL find `env-from-secret.yaml` — a valid KubeVela `TraitDefinition` YAML with `apiVersion: core.oam.dev/v1beta1` and `kind: TraitDefinition`

#### Scenario: CUE template patches envFrom on component containers

- **WHEN** a platform engineer reads `env-from-secret.yaml`
- **THEN** the embedded CUE template SHALL patch `envFrom` on the component's container spec, adding a `secretRef` entry for the specified Secret name

### Requirement: env-from-secret injects all keys from a named Secret as environment variables

The `env-from-secret` TraitDefinition SHALL accept a `secretName` parameter and inject all keys from that Secret as environment variables into the component's containers via `envFrom.secretRef`.

#### Scenario: All keys from the Secret are injected as env vars

- **WHEN** an application team attaches the `env-from-secret` trait with `secretName: my-app-secrets`
- **THEN** every key in the `my-app-secrets` Secret SHALL be available as an environment variable in the component's containers at runtime

#### Scenario: Missing Secret causes component to fail to start

- **WHEN** an application team attaches the `env-from-secret` trait referencing a Secret that does not exist
- **THEN** the component's Pod SHALL fail to start and the failure reason SHALL indicate the missing Secret

### Requirement: env-from-secret supports injecting from multiple Secrets

The `env-from-secret` TraitDefinition SHALL accept a list of Secret names so that application teams can inject environment variables from more than one Secret without attaching the trait multiple times.

#### Scenario: Multiple Secrets are all injected

- **WHEN** an application team specifies `secrets: ["db-credentials", "api-keys"]` in the trait parameters
- **THEN** all keys from both `db-credentials` and `api-keys` SHALL be available as environment variables in the component's containers

#### Scenario: Key collision from multiple Secrets uses last-wins behaviour

- **WHEN** two Secrets both define a key with the same name and are listed in `secrets`
- **THEN** the key value from the Secret listed last in the array SHALL take precedence, consistent with Kubernetes `envFrom` ordering semantics

### Requirement: env-from-secret TraitDefinition is registered before application teams reference it

The platform SHALL apply the `env-from-secret` TraitDefinition to the cluster (via the Kustomize-managed path) before any OAM `Application` that attaches the `env-from-secret` trait is deployed.

#### Scenario: Definition is present after cluster setup

- **WHEN** a developer runs the cluster setup procedure (including applying trait definitions)
- **THEN** `kubectl get traitdefinition env-from-secret -n vela-system` SHALL return the definition without error

#### Scenario: Application using env-from-secret trait receives injected variables

- **WHEN** a developer applies an OAM `Application` with the `env-from-secret` trait attached to a component, and the referenced Secret exists
- **THEN** `vela status <app-name>` SHALL report the component as running and the component's containers SHALL have access to the Secret's keys as environment variables
