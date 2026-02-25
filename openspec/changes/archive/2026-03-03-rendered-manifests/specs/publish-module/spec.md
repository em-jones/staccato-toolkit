---
td-board: rendered-manifests-publish-module
td-issue: td-7ae411
---

# Specification: publish-module

## Overview

Defines the `PublishModule` function added to the `Platform` Dagger module and the associated CI
workflow step that builds and pushes the module to Daggerverse. Once published, the module can be
referenced by URL in OAM component definitions and CI pipelines.

## ADDED Requirements

### Requirement: PublishModule dagger function

The `Platform` type SHALL expose a `PublishModule` method that calls `dagger publish` to push the
current module to the Daggerverse registry. The function SHALL accept a `source *Directory` and a
`daggerToken *Secret` parameter. On success it SHALL return the published module reference string
(e.g., `github.com/<org>/openspec-td/src/ops/workloads@<sha>`).

```go
func (m *Platform) PublishModule(
    ctx context.Context,
    source *Directory,
    daggerToken *Secret,
) (string, error)
```

#### Scenario: Successful publish returns module reference

- **WHEN** `PublishModule` is called with a valid `daggerToken`
- **THEN** the function returns a non-empty string containing the published module reference

#### Scenario: Missing daggerToken returns error

- **WHEN** `PublishModule` is called with a nil `daggerToken`
- **THEN** the function returns a non-nil error before attempting any network operation

### Requirement: CI workflow step for dagger publish

A GitHub Actions workflow step SHALL invoke `dagger call publish-module` after a successful build
and render on the `main` branch. The step SHALL pass `DAGGER_TOKEN` as a Dagger secret. The step
SHALL only run on pushes to `main` (not on pull request events).

#### Scenario: publish-module step runs on main push

- **WHEN** a commit is pushed to `main` and the build and render steps succeed
- **THEN** the publish-module CI step executes and the module reference is logged

#### Scenario: publish-module step is skipped on PRs

- **WHEN** a pull request event triggers the CI workflow
- **THEN** the publish-module step is skipped

### Requirement: Module version tagging strategy

The published module reference SHALL include the git commit SHA as the version identifier. The
`PublishModule` function SHALL read the current commit SHA from the `source` directory (via
`git rev-parse HEAD` in a container) and include it in the published tag.

#### Scenario: Module reference includes commit SHA

- **WHEN** `PublishModule` succeeds on commit `abc1234`
- **THEN** the returned reference string contains `abc1234`
