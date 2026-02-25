---
td-board: progressive-delivery-strategy-canary-rollout-trait
td-issue: td-c8178d
---

# Specification: Canary Rollout Trait

## Overview

Defines the OAM `TraitDefinition` and `Application` manifest pattern for canary deployments in the staccato platform. The platform team provides the `TraitDefinition`; app teams declare a `rollout` trait on their OAM component to opt into canary delivery.

## ADDED Requirements

### Requirement: Canary TraitDefinition CRD

The platform SHALL provide a KubeVela `TraitDefinition` named `canary-rollout` that expresses weight-based traffic splitting between a stable component version and a canary component version within an OAM `Application`.

#### Scenario: TraitDefinition is installed

- **WHEN** the `canary-rollout` TraitDefinition manifest is applied to the cluster
- **THEN** `kubectl get traitdefinition canary-rollout` SHALL return the resource without error

#### Scenario: Application with canary trait is accepted

- **WHEN** an OAM `Application` manifest references the `canary-rollout` trait on a component
- **THEN** KubeVela SHALL accept the application and render it into Kubernetes resources without validation errors

### Requirement: Weight-based traffic splitting

An OAM `Application` component with the `canary-rollout` trait SHALL route a configurable percentage of inbound traffic to the canary version while routing the remainder to the stable version.

#### Scenario: Initial canary weight applied

- **WHEN** a component declares the `canary-rollout` trait with `weight: 10`
- **THEN** KubeVela SHALL configure the traffic backend so that 10% of requests reach the canary pod(s) and 90% reach the stable pod(s)

#### Scenario: Weight boundary — zero canary traffic

- **WHEN** the canary trait weight is set to `0`
- **THEN** all traffic SHALL be routed to the stable version and the canary deployment SHALL remain scaled up but receive no traffic

#### Scenario: Weight boundary — full canary traffic

- **WHEN** the canary trait weight is set to `100`
- **THEN** all traffic SHALL be routed to the canary version, effectively completing the rollout

### Requirement: Health-gated weight promotion

The `canary-rollout` trait SHALL support automatic weight promotion: after a configurable observation window passes with all health checks green, the trait controller SHALL increment the canary weight by a configured step.

#### Scenario: Promotion step applied on healthy canary

- **WHEN** the canary pod(s) pass all liveness and readiness probes for the configured `observationWindow` duration
- **THEN** the trait controller SHALL increase the canary weight by `stepWeight` (e.g., from 10 to 30)

#### Scenario: Promotion halted on unhealthy canary

- **WHEN** any health probe for the canary pod(s) fails during the observation window
- **THEN** the trait controller SHALL NOT increment the weight and SHALL emit a `CanaryHealthCheckFailed` event on the `Application` resource

### Requirement: Canary rollback on failed health check

The `canary-rollout` trait SHALL support automatic rollback: if the canary fails health checks beyond a configurable failure threshold, the controller SHALL reset canary weight to `0` and scale down canary pods.

#### Scenario: Rollback triggered by repeated failures

- **WHEN** canary health checks fail continuously for more than `failureThreshold` consecutive intervals
- **THEN** the trait controller SHALL set canary weight to `0`, scale canary replicas to `0`, and emit a `CanaryRolledBack` event on the `Application` resource

#### Scenario: Stable traffic unaffected during rollback

- **WHEN** a canary rollback is in progress
- **THEN** 100% of traffic SHALL be routed to the stable version with no service interruption
