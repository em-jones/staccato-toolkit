---
td-board: rendered-manifests-render-task
td-issue: td-bf28d7
---

# Specification: render-task

## Overview

Defines the `Render` function on the `Platform` Dagger module and the complementary change to
`environment-spec.cue`. The environment-spec OAM component emits a ConfigMap whose
`data["kustomization.yaml"]` key contains a valid kustomize config listing the environment's
upstream Helm charts. The `Render` Dagger function reads this kustomization, runs
`kustomize build --enable-helm` per chart, and pushes each chart's rendered manifests as an OCI
artifact to Harbor.

## ADDED Requirements

### Requirement: environment-spec emits kustomization.yaml in ConfigMap data

The `environment-spec` CUE component definition SHALL accept a `charts` parameter (list of Helm
chart specs). The emitted ConfigMap's `data["kustomization.yaml"]` SHALL contain a valid
kustomize config with a `helmCharts` block derived from the `charts` parameter. Each chart entry
SHALL carry: `name`, `repo`, `version`, `namespace`, `releaseName`, `includeCRDs`.

The emitted value is a JSON-encoded kustomization (JSON is valid YAML; `kustomize build`
accepts it).

Example `charts` parameter entry:
```yaml
- name: flux-operator
  repo: "oci://ghcr.io/controlplaneio-fluxcd/charts"
  version: "0.43.0"
  namespace: flux-system
  releaseName: flux-operator
  includeCRDs: true
```

#### Scenario: ConfigMap data contains kustomization.yaml key

- **WHEN** an `environment-spec` component is rendered with one or more `charts` entries
- **THEN** the emitted ConfigMap's `data["kustomization.yaml"]` contains a JSON/YAML document
  with `apiVersion: kustomize.config.k8s.io/v1beta1`, `kind: Kustomization`, and `helmCharts`
  listing each chart

#### Scenario: Empty charts list produces valid empty kustomization

- **WHEN** `charts` is empty (default `[]`)
- **THEN** `data["kustomization.yaml"]` contains a valid kustomization with an empty
  `helmCharts` list (not absent)

### Requirement: Render function signature and inputs

The `Platform` type SHALL expose a `Render` method:

```go
func (m *Platform) Render(
    ctx context.Context,
    source *Directory,            // source repo for git SHA resolution
    kustomizationDir *Directory,  // contains kustomization.yaml with helmCharts
    env string,                   // local | dev | staging | prod
    registryURL string,           // oci://harbor-host/project/manifests
    // +optional
    registryCredentials *Secret,  // Docker config JSON for registry auth
) (string, error)
```

`env` SHALL accept exactly `local`, `dev`, `staging`, or `prod`. Any other value SHALL return an
error immediately.

`kustomizationDir` SHALL contain a `kustomization.yaml` file at its root. The file SHALL be a
valid kustomize config with a `helmCharts` list.

#### Scenario: Invalid env returns error immediately

- **WHEN** `Render` is called with `env` not in {`local`, `dev`, `staging`, `prod`}
- **THEN** the function returns an error and no `kustomize build` is attempted

#### Scenario: Empty registryURL returns error

- **WHEN** `registryURL` is empty
- **THEN** the function returns an error immediately

### Requirement: Parse helmCharts from kustomization.yaml via yq

`Render` SHALL extract the `helmCharts` list from `kustomizationDir/kustomization.yaml` using
`yq` in a container. Each entry is parsed as a JSON object. If no `helmCharts` key exists or the
list is empty, `Render` SHALL return an error.

```bash
yq '.helmCharts' kustomization.yaml -o json
```

#### Scenario: helmCharts list is extracted correctly

- **WHEN** `kustomization.yaml` contains three helmChart entries
- **THEN** three chart objects are returned, each with name, repo, version, namespace,
  releaseName, includeCRDs fields

#### Scenario: Missing helmCharts key returns error

- **WHEN** `kustomization.yaml` exists but has no `helmCharts` key (or empty list)
- **THEN** `Render` returns a non-nil error and no OCI push is attempted

### Requirement: kustomize build --enable-helm per chart entry

For each parsed helmChart entry, `Render` SHALL:
1. Write a single-entry kustomization.yaml to a temp directory in the container
2. Run `kustomize build --enable-helm .` in that temp directory
3. Capture stdout as the rendered YAML for that chart

The container image SHALL be `registry.k8s.io/kustomize/kustomize:v5.3.0` (matching the
installed kustomize version in devbox, v5.x).

#### Scenario: Successful kustomize build produces YAML for each chart

- **WHEN** `kustomize build --enable-helm` exits zero for a chart entry
- **THEN** the stdout YAML string is captured for that chart

#### Scenario: kustomize build failure aborts the render

- **WHEN** `kustomize build` exits non-zero for any chart
- **THEN** `Render` returns an error naming the failed chart, and no OCI artifacts are pushed

### Requirement: OCI artifact URL per chart

For each chart, the OCI artifact URL SHALL follow the pattern:

```
<registryURL>/<chart.name>:<env>-<short-sha>
```

Where `<short-sha>` is resolved from `git rev-parse --short HEAD` in the `source` directory.

#### Scenario: OCI URL includes chart name and env-sha tag

- **WHEN** `registryURL=oci://harbor-host/staccato/manifests`, chart name=`flux-operator`,
  env=`dev`, sha=`abc1234`
- **THEN** artifact URL = `oci://harbor-host/staccato/manifests/flux-operator:dev-abc1234`

### Requirement: OCI artifact push via flux push artifact

For each chart's rendered YAML, `Render` SHALL write the output to a temp directory inside the
container and call `flux push artifact <oci-url> --path=<dir> --source=<remote> --revision=<sha>`.

Atomic guarantee: all charts are rendered before any push begins. A render failure prevents
any push.

#### Scenario: Render-all-then-push-all atomicity

- **WHEN** chart A renders successfully but chart B fails
- **THEN** no OCI artifacts are pushed (chart A's output is discarded)

#### Scenario: All renders succeed before pushing

- **WHEN** all charts render successfully
- **THEN** `Render` begins pushing artifacts only after all outputs are collected

### Requirement: RegistryService for local Harbor-compatible testing

Unchanged from previous specification. `RegistryService()` starts `registry:2` as a Dagger
service on port 5000, aliased as `harbor`.

### Requirement: TestRender unit and integration tests

`platform_test.go` SHALL include:
- `TestRender_InvalidEnv`: invalid env returns error
- `TestRender_ValidEnvs`: all four valid envs pass
- `TestRender_MissingRegistryURL`: empty registryURL returns error
- `TestRenderOCIURL`: OCI URL construction formula
- `TestRegistryService_Sentinel`: registry:2 on port 5000 aliased as harbor
- `TestRender_WithLocalRegistry`: documents local integration test pattern
- `TestKustomizationYAMLShape`: documents expected kustomization.yaml structure

#### Scenario: Unit tests cover error and success paths

- **WHEN** `go test .` is run in `src/ops/workloads/`
- **THEN** all `TestRender_*` and `TestKustomizationYAMLShape` tests pass
