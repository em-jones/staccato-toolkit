---
td-board: k0s-cluster-bootstrap
td-issue: td-bc6452
---

# Proposal: k0s Cluster Bootstrap

## Why

The local development cluster currently uses KinD, which diverges from the production cluster
toolchain and does not support the full bootstrap cycle (k0sctl → KubeVela → Flux). Replacing
KinD with k0s (via k0sctl) ensures dev-to-prod consistency and enables the self-bootstrapping
platform pattern where the CLI provisions the cluster from embedded assets.

## What Changes

- Replace `src/ops/dev/kind-config.yaml` + `kind create cluster` with a k0sctl config embedded in
  `staccato-toolkit/core` as a Go `embed.FS` asset
- Add `k0s-config.yaml` as a templated bootstrap asset (single-node dev, HA prod variants)
- Replace `task dev-up` cluster creation step (`dev-cluster-create`) with a k0sctl-driven step
- Add `staccato bootstrap init` CLI subcommand that runs the full Phase 1 + Phase 2 bootstrap
  (k0sctl apply → kustomize build overlays/bootstrap | kubectl apply)
- Update `devbox.json` (root) to add `k0sctl` in place of `kind`
- Update bootstrap `devbox.json` at `core/assets/bootstrap/devbox.json` (already has k0sctl)
- **BREAKING**: KinD cluster (`staccato-dev`) is no longer the default local cluster; k0s
  replaces it. Engineers must run `task dev-down` (kind delete) then `task dev-up` (k0s) once.

## Capabilities

### New Capabilities

- `k0s-cluster-config`: Embedded k0sctl config asset (single-node dev, HA prod); Go CLI templates
  it with per-environment values (node IPs, sans, etc.)
- `bootstrap-cli-command`: `staccato bootstrap init [--env local|prod]` CLI command that runs
  Phase 1 (k0sctl apply) and Phase 2 (kustomize bootstrap apply) end-to-end

### Modified Capabilities

- `dev-cluster-lifecycle`: `task dev-up` / `task dev-down` updated to use k0sctl instead of kind;
  same interface, different underlying tool

## Impact

- Affected services/modules: `src/staccato-toolkit/cli`, `src/staccato-toolkit/core`,
  `src/ops/dev/`, `Taskfile.yaml`
- API changes: No
- Data model changes: No
- Dependencies: `k0sctl` added to root `devbox.json`; `kind` removed from root `devbox.json`
  (kind remains available via bootstrap devbox if needed for CI)
- Prerequisite for: `gitops-provider-component` (Phase 3 runs on the k0s cluster)
