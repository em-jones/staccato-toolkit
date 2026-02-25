---
td-board: dagger-render-task
td-issue: td-db69eb
---

# Proposal: Dagger Render Task

## Why

CI pipelines for `staccato-toolkit` components currently have no automated step to render Kubernetes
manifests and publish them to `staccato-manifests`. The `oam-application-pattern` change (Layer 2)
established how application teams write OAM `Application` manifests and run `vela export`, but
nothing drives that rendering from within the CI pipeline. The `dagger-module-and-tasks` spec
defines the existing `Platform` module at `src/ops/workloads/`; this change adds a `Render` task to
that module so the full app-repo → manifests-repo promotion loop is automated and locally runnable.

## What Changes

- Add a `Render` function to the existing `Platform` dagger module at `src/ops/workloads/main.go`
- The `Render` task runs `kustomize build overlays/<env>` for each registered component and
  environment, then runs `vela export` to capture KubeVela OAM Application outputs
- Rendered YAML is written to the correct path in `staccato-manifests` sibling repo:
  `<component>/<env>/k8s/*.yaml` (as specified in `rendered-manifests-layout`)
- For non-local environments: opens a pull request against `staccato-manifests` via GitHub API
- For the `local` environment: commits rendered manifests directly (no PR required)
- The task is invoked by CI after a successful build (`dagger call render`)
- The task is also locally runnable: `dagger call render --env local`

## Capabilities

### New Capabilities

- `render-task`: The `Render` Dagger function — its signature, inputs, kustomize execution,
  vela export execution, environment enumeration, and output path construction
- `render-pr-flow`: How `Render` opens a PR against `staccato-manifests` for staging/production
  environments, including branch naming, commit message format, and GitHub API interaction
- `render-local-flow`: How `Render` commits directly to `staccato-manifests` for the `local`
  environment without opening a PR

### Modified Capabilities

- `dagger-module-and-tasks`: Add the `Render` function as a new requirement — the module now
  exposes lint, test, build, format, and render tasks

## Impact

- Affected services/modules: `src/ops/workloads/` (Dagger module — new `Render` method added)
- API changes: No (Dagger function, not an HTTP API)
- Data model changes: No
- Dependencies:
  - `kustomize-usage-rules` (Layer 0) — overlay structure and `kustomize build` invocation pattern
  - `flux-usage-rules` (Layer 0) — GitOps promotion model that `staccato-manifests` PRs feed into
  - `rendered-manifests-layout` (Layer 0) — path schema for writing rendered YAML
  - `oam-application-pattern` (Layer 2) — defines `vela export` as the KubeVela render step
  - `kubevela-component-definitions` (Layer 2) — component types that OAM Applications reference
  - Existing `dagger-module-and-tasks` spec — the `Platform` type this task extends
