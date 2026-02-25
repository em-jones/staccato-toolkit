---
td-board: gitops-tool-selection
td-issue: td-2adaad
---

# Proposal: GitOps Tool Selection — Flux v2 as Sync Engine

## Why

The `staccato-toolkit` platform needs a GitOps sync engine to drive declarative, pull-based reconciliation of Kubernetes workloads. Without a formally adopted engine, teams lack a consistent, opinionated path for continuous delivery to clusters.

## What Changes

- Adopt **Flux v2** as the standard GitOps sync engine for the platform
- Document the architectural decision (ADR) rejecting ArgoCD in favor of Flux v2
- Establish usage rules for Flux CRDs (`GitRepository`, `Kustomization`, `HelmRelease`)
- Define the canonical repository structure expected by Flux controllers

## Capabilities

### New Capabilities

- `gitops-sync-engine`: ADR and usage rules for Flux v2 as the GitOps reconciliation engine, covering CRD usage, repository layout, Kustomize and Helm integration, and operational constraints

### Modified Capabilities

_(none — this is a net-new foundational capability)_

## Impact

- Affected services/modules: All platform workloads deployed to Kubernetes clusters via staccato-toolkit
- API changes: No — Flux operates via Kubernetes CRDs, not service APIs
- Data model changes: No
- Dependencies: Flux v2 (`source-controller`, `kustomize-controller`, `helm-controller`) added as a cluster-level dependency; no code library changes required
