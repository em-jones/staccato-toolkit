---
td-board: adopt-component-platform
td-issue: td-bddcc9
---

# Proposal: Adopt Component Platform (KubeVela)

## Why

As the platform toolkit grows to manage multiple services and infrastructure components, teams need a standardised way to define what a "component" is — its dependencies, configuration, and operational requirements — independently from the specific infrastructure it runs on. Without a component specification tool, each service must hand-roll its Kubernetes manifests and infrastructure configuration, creating inconsistency and coupling teams to specific deployment targets.

The platform already runs on Kubernetes (established in `support-kubernetes`). Now we need a layer above raw Kubernetes that lets teams declare application components and their requirements, with operators controlling how those requirements are fulfilled in each environment.

## What Changes

- Adopt **KubeVela** as the component specification and application delivery tool for the platform
- Set up KubeVela in the local dev environment (kind cluster) so developers can use it immediately
- Add KubeVela CLI (`vela`) to `devbox.json`
- Document why KubeVela was chosen over alternatives (Radius, raw Helm, Crossplane)

## Capabilities

### New Capabilities

- `kubevela-adoption-rationale`: Design document making the case for KubeVela as the component specification tool and documenting the setup approach
- `vela-devbox-package`: `vela` CLI is available in the devbox shell
- `kubevela-local-setup`: KubeVela is installed in the local kind cluster and verified working

### Modified Capabilities

*(none)*

## Impact

- Affected files: `devbox.json`, new KubeVela configuration files
- API changes: None — this is an infrastructure adoption change
- Data model changes: None
- Dependencies: KubeVela (vela CLI + controller installed in kind cluster), kind and helm (already adopted)
