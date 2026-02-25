---
td-board: add-kubectl-to-devbox
td-issue: td-7550fd
---

# Proposal: Add kubectl to devbox

## Why

`kubectl` is the standard CLI for interacting with Kubernetes clusters. As established in the `support-kubernetes` ADR, Kubernetes is the platform's standard runtime target. Developers need `kubectl` available in their devbox shell to interact with local (kind) and remote clusters. Without it, every developer must install it separately, breaking environment reproducibility.

## What Changes

- Add `kubectl` to `devbox.json` packages
- Pin a specific version for reproducibility

## Capabilities

### New Capabilities

- `kubectl-devbox-package`: kubectl is available in the devbox shell via `devbox.json`

### Modified Capabilities

*(none)*

## Impact

- Affected files: `devbox.json`
- API changes: None
- Data model changes: None
- Dependencies: kubectl (from nixpkgs via devbox)
