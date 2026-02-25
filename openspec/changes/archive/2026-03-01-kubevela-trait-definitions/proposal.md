---
td-board: kubevela-trait-definitions
td-issue: td-f8fd0b
---

# Proposal: KubeVela Trait Definitions

## Why

With `ComponentDefinition` CRDs in place (`kubevela-component-definitions`), application teams can declare workload intent, but they lack a composable set of platform-managed behaviours (ingress, autoscaling, Prometheus scraping, secret injection) that attach to any component type. Without `TraitDefinition` CRDs, teams must embed these concerns directly in raw Kubernetes manifests, bypassing the OAM abstraction layer and fragmenting platform standards.

## What Changes

- Add `ingress` `TraitDefinition` CRD: exposes a component via a Kubernetes `Ingress` + `Service`
- Add `autoscaler` `TraitDefinition` CRD: attaches an `HorizontalPodAutoscaler` to a component
- Add `prometheus-scrape` `TraitDefinition` CRD: adds a `ServiceMonitor` for Prometheus scraping
- Add `env-from-secret` `TraitDefinition` CRD: injects environment variables from a Kubernetes `Secret` into a component's containers
- Store all four CRD manifests under `src/ops/kubevela/trait-definitions/` as YAML files managed by the platform team
- Apply definitions alongside `ComponentDefinition` CRDs using the existing Kustomize pattern

## Capabilities

### New Capabilities

- `ingress-trait-definition`: Platform-owned `TraitDefinition` CRD that exposes a component via `Ingress` + `Service`
- `autoscaler-trait-definition`: Platform-owned `TraitDefinition` CRD that attaches an `HPA` to a component
- `prometheus-scrape-trait-definition`: Platform-owned `TraitDefinition` CRD that adds a `ServiceMonitor` for Prometheus scraping
- `env-from-secret-trait-definition`: Platform-owned `TraitDefinition` CRD that injects env vars from a Kubernetes `Secret`

### Modified Capabilities

_(none — this change introduces new capabilities only)_

## Impact

- Affected services/modules: `src/ops/kubevela/trait-definitions/` (new directory + YAML manifests)
- API changes: No — these are Kubernetes CRD manifests, not service APIs
- Data model changes: No
- Dependencies:
  - `kubevela-local-setup` (existing spec) — KubeVela controller must be running before trait definitions are applied
  - `kubevela-component-definitions` (Layer 2 sibling) — component types must exist before traits are composed onto them
  - `kustomize-usage-rules` (Layer 0) — definitions applied via Kustomize following existing patterns
  - `servicemonitor-definition` (existing spec) — `prometheus-scrape` trait generates a `ServiceMonitor`; scrape config rules apply
