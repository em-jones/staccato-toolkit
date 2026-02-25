---
td-board: kubevela-component-definitions
td-issue: td-a8cb01
---

# Proposal: KubeVela Component Definitions

## Why

Application teams need reusable, platform-managed abstractions for common Kubernetes workload patterns (HTTP servers, background workers, scheduled jobs) so they can describe intent in OAM `Application` manifests without authoring raw Kubernetes YAML. KubeVela is already installed in the local cluster (`kubevela-local-setup`), but no `ComponentDefinition` CRDs are registered, leaving application teams with nothing to reference in their `type:` field.

## What Changes

- Add `webservice` `ComponentDefinition` CRD: abstracts a long-running HTTP server backed by a `Deployment` + `Service`
- Add `worker` `ComponentDefinition` CRD: abstracts a long-running background process backed by a `Deployment` (no `Service`)
- Add `cron-task` `ComponentDefinition` CRD: abstracts a scheduled job backed by a `CronJob`
- Store all three CRD manifests under `src/ops/kubevela/component-definitions/` as YAML files managed by the platform team
- Provide a Kustomize overlay (or equivalent) to apply definitions to the cluster before applications reference them

## Capabilities

### New Capabilities

- `webservice-component-definition`: Platform-owned `ComponentDefinition` CRD for long-running HTTP servers (Deployment + Service)
- `worker-component-definition`: Platform-owned `ComponentDefinition` CRD for background processes (Deployment only)
- `cron-task-component-definition`: Platform-owned `ComponentDefinition` CRD for scheduled jobs (CronJob)

### Modified Capabilities

_(none — this change introduces new capabilities only)_

## Impact

- Affected services/modules: `src/ops/kubevela/component-definitions/` (new directory + YAML manifests)
- API changes: No — these are Kubernetes CRD manifests, not service APIs
- Data model changes: No
- Dependencies:
  - `kubevela-local-setup` (existing spec) — KubeVela controller must be running before definitions are applied
  - `kustomize-usage-rules` (Layer 0) — definitions applied via Kustomize following existing patterns
