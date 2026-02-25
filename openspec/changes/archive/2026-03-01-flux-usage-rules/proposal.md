---
td-board: flux-usage-rules
td-issue: td-e0542e
---

# Proposal: Flux v2 GitOps Sync Engine Usage Rules

## Why

The staccato-toolkit platform uses Flux v2 as its GitOps sync engine to reconcile cluster state from the `staccato-manifests` repository, but there are no documented usage rules governing how Flux CRDs should be authored, configured, or operated. Without these rules, engineers lack consistent guidance on reconcile intervals, pruning policies, health checks, alerting, and source pinning — leading to drift, instability, and undetected failures.

## What Changes

- Introduce usage rules for `GitRepository` (source pointing at staccato-manifests or Gitea-hosted charts)
- Introduce usage rules for `Kustomization` (reconciling paths in the manifests repo into the cluster)
- Introduce usage rules for `HelmRepository` + `HelmRelease` (third-party charts: observability stack, Gitea)
- Document health check requirements on Kustomizations
- Document alert configuration (Slack/webhook) via `Alert` + `Provider` CRDs
- Standardize reconcile intervals, pruning policy (`prune: true`), and source ref pinning
- Document cross-namespace source references pattern
- Document how to force a manual reconcile (`flux reconcile`)
- Establish the architectural constraint: no manifests live in the application repo; Flux always reads from the manifests repo

## Capabilities

### New Capabilities

- `flux-sources`: Rules for `GitRepository` and `HelmRepository` CRDs — source naming, URL conventions, ref pinning, secret references for Gitea vs GitHub
- `flux-kustomizations`: Rules for `Kustomization` CRDs — path conventions, reconcile intervals, prune policy, health checks, dependency ordering, cross-namespace source refs
- `flux-helm`: Rules for `HelmRepository` + `HelmRelease` CRDs — OCI vs HTTP registries, value overrides, upgrade remediation, version pinning
- `flux-alerting`: Rules for `Alert` + `Provider` CRDs — Slack/webhook configuration, event severity filters, notification grouping

### Modified Capabilities

_(none — no existing Flux specs exist)_

## Impact

- Affected systems: All clusters managed by Flux (local kind cluster, production)
- API changes: No — these are usage rules, not code changes
- Data model changes: No
- Dependencies: Flux v2 (already deployed); staccato-manifests repo (already in use)
- Layer: Layer 0 (foundational) — all other infrastructure changes depend on correct Flux configuration
