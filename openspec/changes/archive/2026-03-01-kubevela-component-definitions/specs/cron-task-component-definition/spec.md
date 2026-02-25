---
td-board: kubevela-component-definitions-cron-task
td-issue: td-6b5df0
---

# Specification: cron-task ComponentDefinition

## Overview

Defines requirements for the platform-owned `cron-task` KubeVela `ComponentDefinition` CRD, which abstracts a scheduled job workload pattern. Application teams reference `type: cron-task` in their OAM `Application` manifests; the platform definition resolves this to a Kubernetes `CronJob`.

## ADDED Requirements

### Requirement: cron-task ComponentDefinition CRD manifest exists in the repository

The platform SHALL provide a `ComponentDefinition` CRD manifest named `cron-task` stored at `src/ops/kubevela/component-definitions/cron-task.yaml`, so that it can be applied to the cluster and discovered by KubeVela.

#### Scenario: Manifest is present and valid

- **WHEN** a developer browses `src/ops/kubevela/component-definitions/`
- **THEN** they SHALL find `cron-task.yaml` — a valid KubeVela `ComponentDefinition` YAML with `apiVersion: core.oam.dev/v1beta1` and `kind: ComponentDefinition`

#### Scenario: CUE template references CronJob

- **WHEN** a platform engineer reads `cron-task.yaml`
- **THEN** the embedded CUE template SHALL render a Kubernetes `CronJob` resource for the component instance

### Requirement: cron-task requires a schedule parameter

The `cron-task` definition SHALL require a `schedule` parameter (cron expression string) so application teams explicitly define when the job runs; the definition SHALL NOT provide a default schedule.

#### Scenario: Schedule parameter is mandatory

- **WHEN** an application team attempts to deploy a `cron-task` component without specifying `schedule`
- **THEN** the KubeVela render SHALL fail with a validation error indicating the `schedule` parameter is required

#### Scenario: Provided schedule is propagated to CronJob

- **WHEN** an application team specifies `schedule: "0 * * * *"` in their component parameters
- **THEN** the generated `CronJob` SHALL have `spec.schedule: "0 * * * *"`

### Requirement: cron-task ComponentDefinition is registered with KubeVela before application teams reference it

The platform SHALL apply the `cron-task` ComponentDefinition to the cluster (via the Kustomize-managed path) before any OAM `Application` that references `type: cron-task` is deployed.

#### Scenario: Definition is present after cluster setup

- **WHEN** a developer runs the cluster setup procedure (including applying component definitions)
- **THEN** `kubectl get componentdefinition cron-task -n vela-system` SHALL return the definition without error

#### Scenario: Application using cron-task type deploys successfully

- **WHEN** a developer applies an OAM `Application` with a component of `type: cron-task` and a valid `schedule`
- **THEN** `vela status <app-name>` SHALL report the component as running, with a `CronJob` visible in the cluster
