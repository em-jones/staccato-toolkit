---
td-board: rendered-manifests
td-issue: td-5bd989
---

# Proposal: Rendered Manifests — Dagger Module

## Why

The platform has OAM `Application` manifests and KubeVela component definitions in place, but no
automated pipeline to render those manifests into Kubernetes YAML and push them to the
`staccato-manifests` sibling repository. CI cannot close the loop between source changes and
cluster state without a `Render` Dagger task in the existing `Platform` module at
`src/ops/workloads/`.

## What Changes

- Add a `Render` function to the existing `Platform` Dagger module at `src/ops/workloads/`
- The function accepts a `source` directory and an `env` flag (`local` | `dev` | `staging` | `prod`)
- For **local**: run `vela export` per OAM `app.yaml` found in `source`, write rendered YAML to
  `staccato-manifests/<component>/<env>/k8s/*.yaml` via a mounted directory, commit locally
- For **deployed** (non-local): same render step, then open a PR against `staccato-manifests` via
  GitHub API (requires a `githubToken` secret)
- Add a `PublishModule` CI task that builds and pushes the Dagger module to Daggerverse so OAM
  components can reference it by URL

## Capabilities

### New Capabilities

- `render-task`: The `Render` Dagger function — signature, `vela export` execution, component
  discovery via `app.yaml` scan, output path construction, local commit, and CI PR flow
- `publish-module`: `PublishModule` CI task that calls `dagger publish` to push the module to
  Daggerverse and makes the module referenceable from OAM and CI pipelines

### Modified Capabilities

*(none — new capabilities only)*

## Impact

- Affected modules: `src/ops/workloads/` (new `Render` and `PublishModule` methods on `Platform`)
- API changes: No (Dagger functions, not HTTP APIs)
- Data model changes: No
- Dependencies:
  - Existing `Platform` Dagger module at `src/ops/workloads/`
  - KubeVela / `vela` CLI (rendered via container image in Dagger)
  - `staccato-manifests` sibling repository layout (`<component>/<env>/k8s/*.yaml`)
  - GitHub API (for PR opening in non-local environments)
