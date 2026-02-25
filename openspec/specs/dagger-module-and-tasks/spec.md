---
td-board: dagger-render-task-dagger-module-and-tasks
td-issue: td-908554
---

# Specification: dagger-module-and-tasks (delta)

## Overview

Delta spec for the `dagger-module-and-tasks` spec. Adds the `Render` function as a required
exported function of the `Platform` dagger module.

## MODIFIED Requirements

### Requirement: Dagger tasks do not replace existing agent-facing CLIs

The dagger module SHALL NOT wrap or replace `td`, `openspec`, or other agent-facing CLIs.
Integration is limited to standard developer scripts and CI-relevant operations only. The module
scope is limited to: lint, test, build, format, and render (manifest rendering).

#### Scenario: td and openspec are not in dagger module

- **WHEN** the dagger module code is reviewed
- **THEN** there are no references to `td` or `openspec` commands
- **THEN** the module scope is limited to lint, test, build, format, render, and
  repository-specific scripts listed in `package.json` or `devbox.json`

## ADDED Requirements

### Requirement: Dagger module exposes a render task

The module SHALL expose a `Render` function that renders Kubernetes manifests for all registered
components by running `kustomize build` and optionally `vela export`, then writes the output to
`staccato-manifests` or opens a PR, depending on the target environment.

#### Scenario: Render task is listed in dagger call --help

- **WHEN** a developer runs `dagger call --help` from the repository root or the dagger module
  directory
- **THEN** `render` SHALL be listed as an available function alongside `lint`, `test`, and `build`

#### Scenario: Render task is callable with env flag

- **WHEN** a developer runs `dagger call render --source . --env local`
- **THEN** the `Render` function SHALL execute without errors for the `local` environment
