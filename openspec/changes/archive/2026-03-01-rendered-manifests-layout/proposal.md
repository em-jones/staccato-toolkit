---
td-board: rendered-manifests-layout
td-issue: td-dd5bdc
---

# Proposal: Rendered Manifests Repository Layout

## Why

The `staccato-toolkit` project needs a dedicated `staccato-manifests` sibling repository to store
rendered Kubernetes manifests for all components across all environments. Without a canonical layout
convention, Flux (the GitOps sync engine) and CI pipelines have no stable contract for where to
write or read manifests, making automated promotion and auditability impossible.

## What Changes

- Define the `staccato-manifests` sibling repository as the exclusive home for rendered Kubernetes manifests
- Establish the canonical directory layout: `<component-name>/<env>/k8s/*.yaml`
- Reserve `<component-name>/<env>/aws/` path for future cloud-provider resources (out of scope now)
- Document the promotion model: environment promotion is a PR in `staccato-manifests`, never in the app repo
- Define RBAC boundaries: Flux scoped read access to `staccato-manifests`; app CI has write access only
- Establish the no-source-code invariant: `staccato-manifests` contains only rendered artifacts

## Capabilities

### New Capabilities

- `manifests-repo-layout`: Directory structure convention and path schema for `staccato-manifests`
- `manifests-promotion-workflow`: How CI renders manifests and opens PRs against `staccato-manifests` for promotion between environments
- `manifests-repo-access-control`: RBAC and access model — Flux read scope, CI write scope, no developer push

### Modified Capabilities

_(none — this is a foundational Layer 0 change with no existing specs to modify)_

## Impact

- Affected services/modules: All `staccato-toolkit` components (consumers of the layout convention)
- API changes: No
- Data model changes: No
- Dependencies: Flux (GitOps sync engine); CI pipeline in each application repo; `staccato-manifests` repository (to be provisioned)
