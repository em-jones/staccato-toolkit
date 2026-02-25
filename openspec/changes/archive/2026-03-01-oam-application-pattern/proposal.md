---
td-board: oam-application-pattern
td-issue: td-4a3c41
---

# Proposal: OAM Application Pattern

## Why

Services in `staccato-toolkit` currently define their Kubernetes workloads as raw Deployment, Service, and ServiceMonitor YAML files under `src/ops/dev/manifests/`. This approach couples every application team to Kubernetes API details and makes it impossible to enforce platform defaults (liveness probes, scrape configs, resource limits) consistently. The `kubevela-component-definitions` change (Layer 0) introduced reusable `ComponentDefinition` abstractions — this change defines the pattern for how application teams write OAM `Application` manifests that consume those abstractions, and how KubeVela's rendered outputs flow into `staccato-manifests` via `vela export`.

## What Changes

- Define the canonical location for an OAM `Application` manifest in an application source repo: `src/<component>/app.yaml`
- Specify the required top-level structure: `apiVersion`, `kind: Application`, `metadata.name`, `spec.components[]` with `type`, `properties`, and `traits`
- Mandate use of the `webservice` `ComponentDefinition` type (from `kubevela-component-definitions`) for long-running HTTP servers
- Mandate the `prometheus-scrape` trait for applications that expose `/metrics`
- Mandate the `ingress` trait for applications that expose HTTP endpoints
- Specify that `vela export` is run by CI to render the Application into Kubernetes YAML and write output to `staccato-manifests/<component>/<env>/k8s/` (from `rendered-manifests-layout`)
- Provide a working reference implementation using `staccato-server` as the example application
- Define migration scope: `service-deployment` spec raw manifests are the source of truth until this pattern is adopted; this change defines the migration target

## Capabilities

### New Capabilities

- `oam-application-manifest`: Structure and authoring rules for the `Application` manifest that application teams write — location, required fields, component type references, and trait attachment
- `oam-render-pipeline`: How CI runs `vela export` to render the `Application` into Kubernetes manifests and writes them into `staccato-manifests/<component>/<env>/k8s/`
- `staccato-server-oam-example`: Working reference implementation of the full OAM Application manifest for `staccato-server`, including `webservice` type, `prometheus-scrape` trait, and `ingress` trait

### Modified Capabilities

- `service-deployment`: Add a requirement that raw manifests under `src/ops/dev/manifests/` are the transitional source of truth; document migration target to OAM Application manifests once this pattern is in place

## Impact

- Affected services/modules: `staccato-server` (reference implementation at `src/staccato-toolkit/server/app.yaml`), `staccato-manifests` repo (rendered output destination), CI pipeline
- API changes: No — OAM Application manifests are Kubernetes CRs, not service APIs
- Data model changes: No
- Dependencies:
  - `kubevela-component-definitions` (Layer 0) — `webservice`, `worker`, `cron-task` ComponentDefinitions must be registered on the cluster
  - `kubevela-trait-definitions` (Layer 0) — `prometheus-scrape` and `ingress` TraitDefinitions must be registered
  - `rendered-manifests-layout` (Layer 0) — defines `staccato-manifests/<component>/<env>/k8s/` path schema that this pattern writes into
