---
td-board: progressive-delivery-strategy-blue-green-rollout-trait
td-issue: td-2ea93a
---

# Specification: Blue-Green Rollout Trait

## Overview

Defines the OAM `TraitDefinition` and `Application` manifest pattern for blue-green deployments in the staccato platform. Two identical component versions (blue and green) are kept running simultaneously; traffic is switched atomically via a Kubernetes Service selector update. The platform team provides the `TraitDefinition`; app teams declare the `blue-green-rollout` trait on their component.

## ADDED Requirements

### Requirement: Blue-green TraitDefinition CRD

The platform SHALL provide a KubeVela `TraitDefinition` named `blue-green-rollout` that manages two concurrent Deployment versions (blue and green) and controls which version the associated Kubernetes Service routes traffic to.

#### Scenario: TraitDefinition is installed

- **WHEN** the `blue-green-rollout` TraitDefinition manifest is applied to the cluster
- **THEN** `kubectl get traitdefinition blue-green-rollout` SHALL return the resource without error

#### Scenario: Application with blue-green trait is accepted

- **WHEN** an OAM `Application` manifest references the `blue-green-rollout` trait on a component
- **THEN** KubeVela SHALL accept the application and render two Deployments (blue slot and green slot) plus one Service without validation errors

### Requirement: Dual-version deployment

An OAM component with the `blue-green-rollout` trait SHALL result in two Deployments being maintained simultaneously: one for the active slot (receiving live traffic) and one for the standby slot (running the new version, receiving no traffic).

#### Scenario: Both slots are created and ready

- **WHEN** a component with the `blue-green-rollout` trait is reconciled by KubeVela
- **THEN** two Deployments SHALL exist in the target namespace, each with its own version label (e.g., `slot: blue` and `slot: green`), and both SHALL reach the configured replica count

#### Scenario: Standby slot uses new image version

- **WHEN** a new image tag is set on the standby slot in the OAM Application spec
- **THEN** the standby Deployment SHALL be updated to use the new image while the active slot Deployment remains unchanged

### Requirement: Atomic Service selector switch

Switching traffic from the active slot to the standby slot SHALL be performed atomically by updating the Kubernetes Service selector to point to the new slot's label, with no period during which the Service has no matching pods.

#### Scenario: Traffic switches to new slot atomically

- **WHEN** the `blue-green-rollout` trait `activeSlot` field is changed from `blue` to `green`
- **THEN** the Service selector SHALL be updated in a single patch operation so that traffic immediately routes to the green slot pods with no downtime

#### Scenario: Previous active slot remains scaled up after switch

- **WHEN** the traffic switch to the new slot completes
- **THEN** the previous active slot's Deployment SHALL remain at full replica count to enable instant rollback

### Requirement: Blue-green rollback

The `blue-green-rollout` trait SHALL support rollback by switching the Service selector back to the previous active slot, restoring the prior version without redeployment.

#### Scenario: Rollback restores prior slot

- **WHEN** the `activeSlot` field is reverted to the previous value
- **THEN** the Service selector SHALL be updated to route traffic back to the prior slot's pods immediately

#### Scenario: Rollback completes without pod restart

- **WHEN** a blue-green rollback is performed
- **THEN** no pods in the prior active slot SHALL be restarted, and the rollback SHALL complete within one reconciliation cycle
