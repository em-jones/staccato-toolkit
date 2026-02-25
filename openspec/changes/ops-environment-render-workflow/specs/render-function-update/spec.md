---
td-board: ops-environment-render-workflow-render-function-update
td-issue: td-ee24b1
---

# Specification: render-function-update

## Overview

Updates the Dagger `Render` function in `src/ops/workloads/render.go` to remove its
dependency on a git repository checkout. The `source *Directory` parameter is removed
and replaced with explicit `sha string` and `sourceURL string` parameters, enabling the
function to be called from in-cluster Jobs that have no git context.

## MODIFIED Requirements

### Requirement: Render function accepts explicit SHA and source URL

The `Render` Dagger function SHALL accept `sha string` as a required parameter and
`sourceURL string` as an optional parameter (defaulting to `"unknown"`) in place of the
former `source *Directory` parameter. The `sha` value SHALL be used verbatim as the
version component in OCI artifact tags (`<chart>:<env>-<sha>`). The `sourceURL` value
SHALL be passed to `flux push artifact --source` for provenance metadata.

#### Scenario: Render tags OCI artifacts with provided SHA

- **WHEN** `Render` is called with `sha = "abc1234"`
- **THEN** each pushed OCI artifact URL SHALL end with `:<env>-abc1234`

#### Scenario: sourceURL defaults to unknown

- **WHEN** `Render` is called without a `sourceURL` argument
- **THEN** `flux push artifact --source` SHALL receive the value `"unknown"`

#### Scenario: Empty SHA is rejected

- **WHEN** `Render` is called with an empty `sha` string
- **THEN** the function SHALL return an error before any kustomize or push operation

### Requirement: Render function requires no git checkout

The `Render` function SHALL NOT invoke any `git` commands or reference a `*Directory`
representing a repository checkout. All git-derived values (SHA, remote URL) SHALL be
received as input parameters.

#### Scenario: In-cluster invocation with no git repo

- **WHEN** `dagger call render` is executed in a Pod with no git repository mounted
- **THEN** the function SHALL complete successfully given valid `sha` and `registryURL`

### Requirement: Existing Render behaviour preserved

All other `Render` behaviours SHALL remain unchanged: two-phase atomicity (render-all
before push-any), `validEnvs` enforcement, per-chart OCI URL construction, and optional
`registryCredentials` injection into the flux-cli container.

#### Scenario: Atomicity guarantee retained

- **WHEN** any chart's kustomize build fails
- **THEN** no OCI artifacts SHALL be pushed for that invocation

#### Scenario: Invalid env still rejected

- **WHEN** `Render` is called with `env = "production"`
- **THEN** the function SHALL return an error without running any container

### Requirement: Tests updated for new signature

All unit tests in `platform_test.go` that reference the `Render` function or the `source`
parameter SHALL be updated to match the new signature. The `TestRender_NoAppYaml` test
(stale sentinel referencing the old vela-export model) SHALL be removed.

#### Scenario: go test passes after signature change

- **WHEN** `go test .` is run in `src/ops/workloads/`
- **THEN** all tests SHALL pass with no compilation errors
