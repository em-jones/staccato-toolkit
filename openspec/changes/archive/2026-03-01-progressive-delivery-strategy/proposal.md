---
td-board: progressive-delivery-strategy
td-issue: td-ab848e
---

# Proposal: Progressive Delivery Strategy

## Why

Staccato services currently have no standardized way to roll out new versions incrementally — deployments are atomic and any bad rollout affects all traffic immediately. We need canary and blue-green deployment patterns so app teams can safely ship changes with progressive traffic shifting and automatic rollback on failure.

## What Changes

- Introduce a `rollout` TraitDefinition in KubeVela that expresses weight-based traffic splitting in OAM `Application` manifests.
- Define the **canary** pattern: traffic weight splits between stable and canary component versions; weight increments automatically on successful health checks managed by Flux.
- Define the **blue-green** pattern: two identical component versions deployed simultaneously; traffic switched atomically via Kubernetes Service selector updates.
- Express both patterns as OAM traits — platform team provides the `TraitDefinition`; app teams declare the strategy as a trait on their component.
- Flux reconciles the OAM `Application` from `staccato-manifests`; KubeVela renders the manifest into Kubernetes resources.
- Provide a concrete example using `staccato-server` as the reference service.

## Capabilities

### New Capabilities

- `canary-rollout-trait`: OAM TraitDefinition and Application manifest pattern for canary deployments with weight-based traffic splitting and health-gated weight promotion.
- `blue-green-rollout-trait`: OAM TraitDefinition and Application manifest pattern for blue-green deployments with atomic Service selector switching.
- `progressive-delivery-flux-integration`: Flux Kustomization wiring that triggers rollout lifecycle (health checks, weight promotion, rollback) from `staccato-manifests`.

### Modified Capabilities

- `staccato-server`: Add rollout trait examples to the deployment spec (canary and blue-green examples alongside existing deployment spec).

## Impact

- Affected services/modules: `staccato-server` (reference implementation), Flux `staccato-manifests`, KubeVela control plane
- API changes: No — traits are OAM manifest additions, no HTTP API changes
- Data model changes: No
- Dependencies:
  - `dagger-render-task` (Layer 3) — renders updated OAM Applications in CI
  - `flux-kustomization-wiring` (Layer 3) — Flux reconciliation of staccato-manifests
  - `oam-application-pattern` (Layer 2) — base OAM Application structure
  - `kubevela-trait-definitions` (Layer 2) — TraitDefinition CRD and tooling
