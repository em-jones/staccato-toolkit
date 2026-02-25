---
td-board: add-helm-to-devbox
td-issue: td-f478dd
---

# Proposal: Add helm to devbox

## Why

`helm` is the standard Kubernetes package manager and deployment tool, and the CNCF Graduated project for distributing and deploying applications on Kubernetes. As established in the `support-kubernetes` ADR, helm is required for the platform's component platform and observability stack — both depend on helm charts for installation. Developers and CI pipelines need helm in their environment to deploy and validate helm charts locally.

## What Changes

- Add `helm` to `devbox.json` packages
- Pin a specific version for reproducibility

## Capabilities

### New Capabilities

- `helm-devbox-package`: helm is available in the devbox shell via `devbox.json`, enabling developers to install and manage applications on Kubernetes clusters using helm charts

### Modified Capabilities

*(none)*

## Impact

- Affected files: `devbox.json`
- API changes: None
- Data model changes: None
- Dependencies: helm (from nixpkgs via devbox), kubectl and kind (preceding devbox changes)
