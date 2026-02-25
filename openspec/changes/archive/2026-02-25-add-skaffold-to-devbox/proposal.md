---
td-board: add-skaffold-to-devbox
td-issue: td-34d363
---

# Proposal: Add skaffold to devbox

## Why

`skaffold` automates the iterative local development loop for Kubernetes: build image → load into kind → deploy via helm/kubectl → watch for file changes → repeat. As established in the `support-kubernetes` ADR, skaffold is the chosen tool for developer-inner-loop Kubernetes workflows. Without it, developers must manually coordinate image builds, kind loads, and helm upgrades — a slow and error-prone process.

## What Changes

- Add `skaffold` to `devbox.json` packages
- Pin a specific version for reproducibility

## Capabilities

### New Capabilities

- `skaffold-devbox-package`: skaffold is available in the devbox shell via `devbox.json`, enabling `skaffold dev` for iterative local Kubernetes development workflows

### Modified Capabilities

*(none)*

## Impact

- Affected files: `devbox.json`
- API changes: None
- Data model changes: None
- Dependencies: skaffold (from nixpkgs via devbox), kind, kubectl, helm (preceding devbox changes); Docker (pre-existing)
