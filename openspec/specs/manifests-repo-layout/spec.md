---
td-board: rendered-manifests-layout-manifests-repo-layout
td-issue: td-127ee9
---

# Specification: Manifests Repository Layout

## Overview

Defines the canonical directory structure of the `staccato-manifests` sibling repository. This
layout is the stable contract between CI pipelines (writers) and Flux (reader). All paths are
deterministic given a component name and environment name.

## ADDED Requirements

### Requirement: Canonical directory structure

The `staccato-manifests` repository SHALL organise rendered artifacts under a
`<component-name>/<env>/k8s/` path prefix, where `<component-name>` is the kebab-case identifier
of the application component and `<env>` is one of `local`, `dev`, `staging`, or `prod`.

#### Scenario: Layout for a known component and environment

- **WHEN** a CI pipeline renders manifests for component `staccato-server` targeting `dev`
- **THEN** all rendered Kubernetes YAML files MUST be written to `staccato-server/dev/k8s/*.yaml`
  in the `staccato-manifests` repository

#### Scenario: Unknown environment rejected

- **WHEN** a CI pipeline attempts to write to a path whose `<env>` segment is not one of `local`, `dev`, `staging`, `prod`
- **THEN** the CI pipeline MUST fail and MUST NOT open a PR against `staccato-manifests`

### Requirement: Path schema for environment segments

The four canonical environment values SHALL be: `local`, `dev`, `staging`, `prod`. No other values
are permitted at the `<env>` path segment.

#### Scenario: Valid environment path accepted

- **WHEN** a manifest path matches `<component>/<env>/k8s/*.yaml` and `<env>` is one of the four canonical values
- **THEN** Flux configuration MAY reference that path as a valid sync source

#### Scenario: aws subtree reserved for future use

- **WHEN** the path `<component>/<env>/aws/` is present in the repository
- **THEN** Flux MUST NOT sync from that path during the current implementation phase; the subtree is reserved for future cloud-provider resource definitions

### Requirement: No-source-code invariant enforcement

The `staccato-manifests` repository SHALL contain only rendered artifact files. Source code,
application logic, build scripts, or CI pipeline definitions SHALL NOT be committed to
`staccato-manifests`.

#### Scenario: PR containing non-YAML/non-manifest files rejected

- **WHEN** a pull request to `staccato-manifests` contains any file outside `<component>/<env>/k8s/` or `<component>/<env>/aws/`
- **THEN** a repository guard check MUST block the PR merge

#### Scenario: git history as audit trail

- **WHEN** any manifest file in `staccato-manifests` is modified
- **THEN** the change MUST be traceable to a specific CI build and commit in the originating application repository via the PR description or commit message
