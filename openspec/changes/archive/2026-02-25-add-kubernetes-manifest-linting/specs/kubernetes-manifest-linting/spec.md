---
td-board: add-kubernetes-manifest-linting-kubernetes-manifest-linting
td-issue: td-8a38ae
---

# Specification: Kubernetes Manifest Linting

## Overview

All Kubernetes YAML manifests in `src/ops/` SHALL be validated by `kube-linter` as part of the Dagger `Lint` pipeline and enforced in CI on every push and pull request.

## ADDED Requirements

### Requirement: kube-linter Dagger function

The Dagger platform module (`src/ops/workloads/main.go`) SHALL expose a `LintManifests(ctx context.Context, source *Directory) (string, error)` function that runs `kube-linter lint` against all YAML files found under `src/ops/` in the provided source directory. The function MUST return a non-zero exit code (error) if any kube-linter check fails. It MUST use the `stackrox/kube-linter:latest` container image. If no YAML files are found, it MUST return `"no Kubernetes manifests found"` without error.

#### Scenario: Manifests pass all enabled checks

- **WHEN** `dagger call lint-manifests --source ../..` is run against a source tree where all YAML files pass the configured kube-linter checks
- **THEN** the function returns a success string listing files checked and exits 0

#### Scenario: Manifest fails a check

- **WHEN** a YAML file under `src/ops/` violates a kube-linter rule (e.g., missing resource limits)
- **THEN** `LintManifests` returns an error describing the violation and exits non-zero

#### Scenario: No YAML files present

- **WHEN** the source directory contains no YAML files under `src/ops/`
- **THEN** `LintManifests` returns `"no Kubernetes manifests found"` and exits 0

### Requirement: kube-linter config file

A `.kube-linter.yaml` configuration file SHALL exist at the repository root. It MUST enable the `default` check set as a baseline. Checks that are intentionally suppressed MUST include a `# reason:` comment in the config explaining the justification. The config MUST be committed to version control.

#### Scenario: Config is present and valid

- **WHEN** `kube-linter lint --config .kube-linter.yaml <manifest>` is run
- **THEN** kube-linter reads the config without error and applies the configured checks

#### Scenario: Suppressed check includes justification

- **WHEN** a check is listed under `ignoredChecks` in `.kube-linter.yaml`
- **THEN** a `# reason:` comment appears directly above or inline with the suppression entry

### Requirement: CI manifest-lint job

`.github/workflows/ci.yml` SHALL include a `manifest-lint` job that runs `dagger call lint-manifests --source ../..` from `./src/ops/workloads`. The job MUST run on every push to `main` and on every pull request. It MUST run in parallel with (not after) the existing `lint` job — it is a peer commit-stage check, not a downstream step.

#### Scenario: CI runs manifest lint on PR

- **WHEN** a pull request is opened or updated
- **THEN** the `manifest-lint` CI job executes and its result is visible as a required status check

#### Scenario: Failing manifest lint blocks merge

- **WHEN** the `manifest-lint` job exits non-zero
- **THEN** the CI pipeline reports failure on the PR, blocking merge until fixed

### Requirement: Existing manifests pass kube-linter

All existing Kubernetes YAML files in `src/ops/dev/manifests/` SHALL pass the configured kube-linter checks after this change is implemented. Where a check cannot be satisfied (e.g., Helm-rendered templates at lint time), the suppression MUST be documented in `.kube-linter.yaml` with a `# reason:` comment.

#### Scenario: staccato-server manifests pass

- **WHEN** kube-linter runs against `src/ops/dev/manifests/staccato-server/`
- **THEN** all checks pass (or are explicitly suppressed with documented justification)

#### Scenario: staccato-cli manifests pass

- **WHEN** kube-linter runs against `src/ops/dev/manifests/staccato-cli/`
- **THEN** all checks pass (or are explicitly suppressed with documented justification)
