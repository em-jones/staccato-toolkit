---
td-board: ops-environment-render-workflow-render-workflow-step
td-issue: td-173aaf
---

# Specification: render-workflow-step

## Overview

Defines the `render-manifests` KubeVela `WorkflowStepDefinition` and the corresponding
wiring in `ops-environment.cue` that triggers in-cluster manifest rendering as part of
OAM Application reconciliation. The step runs `dagger call render` in a minimal
alpine+dagger-CLI Job, with kustomize, helm, and flux-cli executing inside Dagger-managed
containers via Dagger Cloud.

## ADDED Requirements

### Requirement: render-manifests WorkflowStepDefinition

The system SHALL provide a KubeVela `WorkflowStepDefinition` named `render-manifests`
in `st-workloads/definitions/render-manifests.cue` that accepts the following step
properties: `configMapName`, `env`, `registryURL`, `sha`, `pullSecret`. The constants
`moduleRef` (`github.com/em-jones/staccato-toolkit/src/ops/workloads`) and
`daggerCloudTokenSecret` (`dagger-cloud-token`) SHALL be hardcoded in the definition.

#### Scenario: Step definition is registered

- **WHEN** the `st-workloads` addon is enabled
- **THEN** a `WorkflowStepDefinition` named `render-manifests` SHALL exist in the cluster

#### Scenario: Step properties are validated

- **WHEN** a workflow step of type `render-manifests` is missing a required property
- **THEN** KubeVela SHALL surface a validation error before the step runs

### Requirement: render-manifests spawns a Job and waits

The `render-manifests` step SHALL create a `batch/v1 Job` in the `vela-system` namespace
and SHALL NOT report step completion until `job.status.succeeded >= 1`. The step SHALL
fail the workflow if `job.status.failed >= 1`.

#### Scenario: Successful render Job

- **WHEN** the Job completes with `status.succeeded = 1`
- **THEN** the workflow step SHALL advance to the next step

#### Scenario: Failed render Job

- **WHEN** the Job completes with `status.failed >= 1`
- **THEN** the workflow SHALL halt and surface the Job failure

#### Scenario: Job retry behaviour

- **WHEN** the Job's container exits non-zero
- **THEN** the Job SHALL retry up to `backoffLimit: 2` times before marking as failed

### Requirement: render Job image and command

The render Job container SHALL use an alpine image with only the Dagger CLI installed.
Kustomize, helm, and flux-cli SHALL NOT be present in the Job image. The container SHALL
run `dagger call --mod <moduleRef> render` with the following flags:
`--kustomization-dir /kustomization`, `--env`, `--registry-url`, `--sha`,
`--registry-credentials env:DOCKER_CONFIG_JSON`.

#### Scenario: Container image is minimal

- **WHEN** the render Job Pod is scheduled
- **THEN** the container image SHALL contain only the alpine base and the dagger CLI binary

#### Scenario: Dagger call renders charts

- **WHEN** the `dagger call render` command executes
- **THEN** kustomize, helm, and flux-cli SHALL run inside Dagger-managed containers
  provisioned by Dagger Cloud, not in the Job Pod itself

### Requirement: Secret injection into render Job

The render Job SHALL inject `DAGGER_CLOUD_TOKEN` from the `dagger-cloud-token` Kubernetes
Secret (key: `token`) and `DOCKER_CONFIG_JSON` from the secret named by the `pullSecret`
step property (key: `.dockerconfigjson`), both as environment variables in the container.

#### Scenario: DAGGER_CLOUD_TOKEN injected

- **WHEN** the Job Pod starts
- **THEN** `DAGGER_CLOUD_TOKEN` SHALL be present as an environment variable sourced from
  the `dagger-cloud-token` secret

#### Scenario: DOCKER_CONFIG_JSON injected

- **WHEN** the Job Pod starts
- **THEN** `DOCKER_CONFIG_JSON` SHALL be present as an environment variable sourced from
  the secret named by `pullSecret` (default: `harbor-oci-credentials`)

### Requirement: ConfigMap volume mount

The render Job SHALL mount the `kustomization.yaml` key from the ConfigMap named by the
`configMapName` step property at the path `/kustomization/kustomization.yaml` inside the
container.

#### Scenario: kustomization.yaml accessible at mount path

- **WHEN** the Job Pod starts
- **THEN** the file `/kustomization/kustomization.yaml` SHALL contain the kustomization
  YAML emitted by the `staccato-environment` component for this environment

### Requirement: ops-environment emits Application with workflow

The `ops-environment.cue` component template SHALL emit an OAM Application with a
`spec.workflow` block containing two steps in order: first `apply-component` (applying
the `staccato-environment` component), then `render-manifests`. All step property values
SHALL be derived from existing `parameter.environment` fields with no new parameters.

#### Scenario: Workflow step ordering

- **WHEN** the child Application is reconciled by KubeVela
- **THEN** the `staccato-environment` component (and its ConfigMap) SHALL be applied before
  the `render-manifests` step executes

#### Scenario: render step properties derived from gitopsConfig

- **WHEN** `ops-environment` is applied with a `gitopsConfig` containing `url`, `ref`,
  and `pullSecret`
- **THEN** the `render-manifests` step SHALL receive `registryURL` = `gitopsConfig.url`,
  `sha` = `gitopsConfig.ref`, `pullSecret` = `gitopsConfig.pullSecret` with no additional
  user-facing parameters required
