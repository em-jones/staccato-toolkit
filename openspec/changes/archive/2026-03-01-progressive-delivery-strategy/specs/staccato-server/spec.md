---
td-board: progressive-delivery-strategy-staccato-server
td-issue: td-ba7c66
---

# Specification: Staccato Server (Delta)

## Overview

Delta spec for `staccato-server` — adds rollout trait examples to the server's deployment specification. App teams use `staccato-server` as the reference implementation for both canary and blue-green deployment patterns.

## ADDED Requirements

### Requirement: Canary rollout example OAM Application

The `staccato-server` deployment specification in `staccato-manifests` SHALL include a reference OAM `Application` that demonstrates the `canary-rollout` trait configuration, providing a concrete example for app teams to copy and adapt.

#### Scenario: Reference canary Application manifest exists

- **WHEN** the `staccato-manifests` repository is browsed
- **THEN** a file SHALL exist at `apps/staccato-server/canary-example.yaml` containing a valid OAM `Application` with the `canary-rollout` trait referencing the staccato-server image

#### Scenario: Canary example uses realistic configuration

- **WHEN** the canary example manifest is inspected
- **THEN** it SHALL declare an initial `weight: 10`, a `stepWeight: 20`, an `observationWindow` of at least 60 seconds, and a `failureThreshold` of at least 2 consecutive failures before rollback

### Requirement: Blue-green rollout example OAM Application

The `staccato-server` deployment specification in `staccato-manifests` SHALL include a reference OAM `Application` that demonstrates the `blue-green-rollout` trait configuration, with both blue and green slots annotated and the initial `activeSlot` set to `blue`.

#### Scenario: Reference blue-green Application manifest exists

- **WHEN** the `staccato-manifests` repository is browsed
- **THEN** a file SHALL exist at `apps/staccato-server/blue-green-example.yaml` containing a valid OAM `Application` with the `blue-green-rollout` trait

#### Scenario: Blue-green example shows both slots with distinct image tags

- **WHEN** the blue-green example manifest is inspected
- **THEN** the blue slot SHALL reference the current stable staccato-server image and the green slot SHALL reference a next-version image tag, with `activeSlot: blue`
