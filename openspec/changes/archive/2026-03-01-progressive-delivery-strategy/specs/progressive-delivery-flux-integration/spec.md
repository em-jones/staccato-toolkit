---
td-board: progressive-delivery-strategy-flux-integration
td-issue: td-81a24b
---

# Specification: Progressive Delivery Flux Integration

## Overview

Defines how Flux reconciles OAM `Application` manifests containing rollout traits from the `staccato-manifests` repository. Flux drives the reconciliation loop; KubeVela reacts to the reconciled manifests and manages the rollout lifecycle. Health checks in Flux's `Kustomization` gate weight promotion and surface rollout status back to GitOps operators.

## ADDED Requirements

### Requirement: Flux Kustomization health check integration

The Flux `Kustomization` for `staccato-manifests` SHALL declare health checks that gate readiness on the rollout trait status, ensuring Flux considers a revision healthy only when the active slot or canary weight target is fully achieved.

#### Scenario: Flux waits for rollout completion before marking healthy

- **WHEN** a new OAM `Application` revision is pushed to `staccato-manifests` with an updated canary weight or active slot
- **THEN** the Flux `Kustomization` SHALL remain in a `Progressing` state until the KubeVela rollout trait reports its target state reached, at which point it SHALL transition to `Ready`

#### Scenario: Flux marks Kustomization failed on rollback

- **WHEN** the KubeVela rollout trait emits a `CanaryRolledBack` or rollback-equivalent event
- **THEN** the Flux `Kustomization` SHALL transition to a `Failed` state with a human-readable message describing the rollback reason

### Requirement: Rollout lifecycle event propagation

The rollout trait controller SHALL propagate significant lifecycle events (weight promoted, rollback triggered, rollout complete) as Kubernetes Events on the parent OAM `Application` resource so that Flux, alerting pipelines, and operators can observe progress.

#### Scenario: Weight promotion event is emitted

- **WHEN** the canary weight is incremented by the trait controller
- **THEN** a `Normal` Kubernetes Event with reason `WeightPromoted` SHALL be recorded on the `Application` resource, including old and new weight values

#### Scenario: Rollout complete event is emitted

- **WHEN** canary weight reaches `100` or the blue-green switch completes
- **THEN** a `Normal` Kubernetes Event with reason `RolloutComplete` SHALL be recorded on the `Application` resource

### Requirement: Rollout manifest reconciliation from staccato-manifests

OAM `Application` manifests containing rollout traits SHALL be stored in the `staccato-manifests` repository under a path that is reconciled by a dedicated Flux `Kustomization`, ensuring rollout configuration is version-controlled and GitOps-managed.

#### Scenario: Manifest committed to staccato-manifests is applied to cluster

- **WHEN** an OAM `Application` manifest with a rollout trait is committed to the designated path in `staccato-manifests`
- **THEN** Flux SHALL detect the change and apply it to the cluster within the configured reconciliation interval (default: 5 minutes)

#### Scenario: Rollout manifest deletion triggers resource cleanup

- **WHEN** a rollout-trait-annotated OAM `Application` manifest is removed from `staccato-manifests`
- **THEN** Flux SHALL prune the corresponding KubeVela resources from the cluster, including both Deployment slots and the associated Service
