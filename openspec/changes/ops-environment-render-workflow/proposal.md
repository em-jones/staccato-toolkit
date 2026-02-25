---
td-board: ops-environment-render-workflow
td-issue: td-6d5c9d
---

# Proposal: ops-environment-render-workflow

## Why

Rendering Helm charts to OCI artifacts is currently a disconnected CI step with no
guaranteed relationship to the OAM Application lifecycle. When someone applies or
updates an `ops-environment` component, nothing in the cluster triggers a render —
the two operations are manually coordinated. This change makes manifest rendering an
automatic consequence of environment reconciliation by embedding it as a KubeVela
workflow step in the Application that `ops-environment` emits.

## What Changes

- **`ops-environment.cue`** — adds `spec.workflow` to the emitted Application: an
  `apply-component` step followed by a `render-manifests` step. No new parameters;
  all inputs derive from the existing `gitopsConfig` fields (`url`, `ref`, `pullSecret`)
  and `name`.
- **New `render-manifests` WorkflowStepDefinition** — CUE step type that creates a
  `batch/v1 Job` running an alpine+dagger-CLI container, mounts the environment
  ConfigMap as `/kustomization/kustomization.yaml`, injects `DAGGER_CLOUD_TOKEN` and
  `DOCKER_CONFIG_JSON` secrets, and runs `dagger call render` against the published
  Dagger module.
- **`render.go`** — **BREAKING**: removes the `source *Directory` parameter (which
  required a git repo checkout). Replaces it with explicit `sha string` and
  `sourceURL string` parameters so the function works both from CI and from an
  in-cluster Job with no git context.

## Capabilities

### New Capabilities

- `render-workflow-step`: KubeVela `WorkflowStepDefinition` (`render-manifests`) that
  spawns a render Job and waits for completion. Constants (`moduleRef`,
  `daggerCloudTokenSecret`) are hardcoded in the step definition; runtime values
  (`env`, `registryURL`, `sha`, `pullSecret`) are passed as step properties derived
  from the parent Application's `gitopsConfig`.

### Modified Capabilities

- `render-function-update`: The Dagger `Render` function drops its git-repo dependency.
  `source *Directory` is removed; `sha string` (for OCI tagging) and `sourceURL string`
  (for flux provenance, optional) are added as explicit parameters.

## Impact

- `src/ops/workloads/render.go` — breaking signature change; callers must update
- `src/ops/workloads/platform_test.go` — tests that reference `Render` with `source` param need updating
- `src/staccato-toolkit/core/assets/addons/st-workloads/definitions/ops-environment.cue` — adds `spec.workflow`
- `src/staccato-toolkit/core/assets/addons/st-workloads/definitions/render-manifests.cue` — new file
- Bootstrap sequence — requires `dagger-cloud-token` secret pre-created in `vela-system`
- Dependencies: Dagger Cloud account (for `DAGGER_CLOUD_TOKEN`); existing `harbor-oci-credentials` secret reused
