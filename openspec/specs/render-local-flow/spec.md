---
td-board: dagger-render-task-render-local-flow
td-issue: td-5c641b
---

# Specification: render-local-flow

## Overview

Defines how the `Render` Dagger task behaves when invoked with `--env local`. The local flow
commits rendered manifests directly to a local clone of `staccato-manifests` without opening a
pull request. This enables developers to test manifest rendering end-to-end on their workstation
before pushing changes.

## ADDED Requirements

### Requirement: Local env commits rendered manifests directly without a PR

When the `Render` task is invoked with `env = "local"`, it SHALL write the rendered YAML files
to the provided `staccato-manifests` directory and commit them directly to the local working
copy. The task SHALL NOT make any network calls to the GitHub API or attempt to open a pull
request.

#### Scenario: Local render commits without GitHub interaction

- **WHEN** `dagger call render --source . --env local` is run on a developer workstation
- **THEN** the rendered YAML files SHALL be written to `staccato-manifests/<component>/local/k8s/`
  and committed to the local git repo with message `render(<component>/local): <short-sha>`
- **THEN** no GitHub API calls SHALL be made

#### Scenario: Local render is idempotent

- **WHEN** `dagger call render --source . --env local` is run a second time without source changes
- **THEN** the rendered output SHALL be identical, the commit SHALL be a no-op (empty diff), and
  the task SHALL exit zero

### Requirement: Local env render writes to local staccato-manifests path only

The `Render` task with `env = "local"` SHALL write to the `local` environment path under
`staccato-manifests/<component>/local/k8s/`. It SHALL NOT write to any other environment path
(e.g., `dev`, `staging`, `production`). This prevents accidental overwrite of
CI-managed environment outputs.

#### Scenario: Local render writes to local path only

- **WHEN** `dagger call render --source . --env local` is run
- **THEN** only files under `staccato-manifests/<component>/local/k8s/` SHALL be created or
  modified
- **THEN** files under `staccato-manifests/<component>/dev/k8s/` SHALL remain unchanged

#### Scenario: Render with non-local env does not commit directly

- **WHEN** `dagger call render --source . --env dev` is run
- **THEN** the task SHALL NOT commit to any local git repo; it SHALL use the PR flow defined in
  `render-pr-flow`
