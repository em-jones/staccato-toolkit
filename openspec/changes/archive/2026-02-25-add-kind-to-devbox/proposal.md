---
td-board: add-kind-to-devbox
td-issue: td-9be770
---

# Proposal: Add kind to devbox

## Why

`kind` (Kubernetes IN Docker) is the chosen tool for running a local Kubernetes cluster, as established in the `support-kubernetes` ADR. Developers need `kind` available in their devbox shell to create and manage local clusters for development and testing. Docker is already required by dagger — kind runs natively on Docker with zero additional VM overhead.

## What Changes

- Add `kind` to `devbox.json` packages
- Pin a specific version for reproducibility

## Capabilities

### New Capabilities

- `kind-devbox-package`: kind is available in the devbox shell via `devbox.json`, enabling developers to run `kind create cluster` to spin up a local Kubernetes cluster

### Modified Capabilities

*(none)*

## Impact

- Affected files: `devbox.json`
- API changes: None
- Data model changes: None
- Dependencies: kind (from nixpkgs via devbox), Docker (pre-existing requirement)
