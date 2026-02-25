---
td-board: add-k9s-to-devbox
td-issue: td-db2dc6
---

# Proposal: Add k9s to devbox

## Why

`k9s` is a terminal-based UI for navigating and managing Kubernetes clusters. As established in the `support-kubernetes` ADR, k9s significantly improves developer ergonomics when working with local kind clusters — developers can browse pods, view logs, exec into containers, and manage resources without memorising kubectl commands. It runs entirely in the terminal, making it compatible with headless and remote development environments.

## What Changes

- Add `k9s` to `devbox.json` packages
- Pin a specific version for reproducibility

## Capabilities

### New Capabilities

- `k9s-devbox-package`: k9s is available in the devbox shell via `devbox.json`, providing a terminal UI for Kubernetes cluster management

### Modified Capabilities

*(none)*

## Impact

- Affected files: `devbox.json`
- API changes: None
- Data model changes: None
- Dependencies: k9s (from nixpkgs via devbox), kubectl (prerequisite — needed by k9s to talk to the cluster)
