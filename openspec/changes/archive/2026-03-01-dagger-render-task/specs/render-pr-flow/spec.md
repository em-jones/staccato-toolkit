---
td-board: dagger-render-task-render-pr-flow
td-issue: td-311385
---

# Specification: render-pr-flow

## Overview

Defines how the `Render` Dagger task opens a pull request against `staccato-manifests` for
non-local environments (`dev`, `staging`, `production`). Governs branch naming conventions,
commit message format, PR body requirements, and GitHub API interaction.

## ADDED Requirements

### Requirement: Render PR uses dedicated branch per component and env

For non-local environments, the `Render` task SHALL create a branch in `staccato-manifests`
with the naming format `render/<component>/<env>/<short-commit-sha>` before writing rendered YAML
and opening a pull request. If a branch with that name already exists, the task SHALL reset it to
the current `main` HEAD before writing.

#### Scenario: Branch is created with correct naming pattern

- **WHEN** `Render` is invoked for component `staccato-server`, env `dev`, with source commit
  `abc1234`
- **THEN** a branch named `render/staccato-server/dev/abc1234` SHALL be created in
  `staccato-manifests` from the current `main` HEAD before any files are written

#### Scenario: Existing render branch is reset before re-use

- **WHEN** a branch `render/staccato-server/dev/abc1234` already exists in `staccato-manifests`
- **THEN** the `Render` task SHALL reset that branch to `main` HEAD before writing new content,
  ensuring no stale diff artifacts remain

### Requirement: Render PR includes originating commit SHA and CI run URL

The pull request body opened against `staccato-manifests` SHALL include:
- The originating application repository commit SHA (full 40-character SHA)
- A link to the CI run URL that triggered the render
- The target component name and environment

#### Scenario: PR body contains required traceability fields

- **WHEN** the `Render` task opens a PR against `staccato-manifests`
- **THEN** the PR body SHALL contain the originating commit SHA, the CI run URL, the component
  name, and the target environment

#### Scenario: PR body is machine-parseable

- **WHEN** a reviewer reads the PR description
- **THEN** the commit SHA and CI URL SHALL be formatted as labelled lines (e.g.,
  `Commit: <sha>`, `CI Run: <url>`) so that automated tooling can parse them

### Requirement: Render PR does not push directly to staccato-manifests default branch

The `Render` task SHALL open a pull request and SHALL NOT push rendered YAML directly to the
`main` (or default) branch of `staccato-manifests` for any non-local environment. This enforces
the promotion-via-PR contract from `manifests-promotion-workflow`.

#### Scenario: Render exits after opening PR, not after merging

- **WHEN** the `Render` task opens a pull request against `staccato-manifests`
- **THEN** the task SHALL exit zero after the PR is opened and SHALL NOT attempt to merge,
  approve, or auto-close the PR

#### Scenario: Render fails if GitHub API call fails

- **WHEN** the GitHub API call to open the PR returns a non-2xx status
- **THEN** the `Render` task SHALL return an error and exit non-zero
