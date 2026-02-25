---
td-board: add-kubernetes-manifest-linting
td-issue: td-b1240e
---

# Proposal: Add Kubernetes Manifest Linting

## Why

Kubernetes manifests in `src/ops/dev/manifests/` and Helm values in `src/ops/observability/` have no automated quality checking. Misconfigured manifests (missing resource limits, running as root, missing health checks) can silently pass CI and cause runtime failures or security issues in the dev cluster. This change adds kube-linter to the Dagger `Lint` function so manifest quality is enforced at the commit stage.

## What Changes

- Add a `LintManifests` function to the Dagger platform module (`src/ops/workloads/`) that runs `kube-linter` against all Kubernetes YAML files in a source directory
- Extend the existing `Lint` function to call `LintManifests` on the `src/ops/` subtree
- Add a `manifest-lint` CI job to `.github/workflows/ci.yml` (or extend the existing `lint` job) that runs `dagger call lint-manifests --source ../..`
- Add a `kube-linter` config (`.kube-linter.yaml`) at the repository root to configure which checks are enabled and which are suppressed with justification

## Capabilities

### New Capabilities

- `kubernetes-manifest-linting`: kube-linter integrated into Dagger pipeline; enforced in CI on every push and PR; YAML files in `src/ops/` are validated against a curated set of checks

### Modified Capabilities

_(none)_

## Impact

- Affected files: `src/ops/workloads/main.go`, `.github/workflows/ci.yml`, `.kube-linter.yaml` (new)
- API changes: new Dagger function `LintManifests(ctx, source)` — additive, no breaking change
- Data model changes: none
- Dependencies: `stackrox/kube-linter` Docker image (used at runtime in Dagger container; no Go import)
