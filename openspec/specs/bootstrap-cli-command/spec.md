---
td-board: k0s-cluster-bootstrap-bootstrap-cli-command
td-issue: td-3c915d
---

# Specification: Bootstrap CLI Command

## Overview

Defines the `staccato bootstrap` subcommand group in `staccato-toolkit/cli`. Provides `init` to
run the full Phase 1 (k0sctl cluster provisioning) and Phase 2 (KubeVela bootstrap apply)
sequence end-to-end from a single invocation.

## ADDED Requirements

### Requirement: bootstrap subcommand group

The CLI SHALL expose a `bootstrap` subcommand group (Cobra command) at `staccato bootstrap`
with at least the `init` subcommand.

#### Scenario: Help text is accessible

- **WHEN** `staccato bootstrap --help` is run
- **THEN** the output lists the `init` subcommand with a one-line description

### Requirement: bootstrap init runs Phase 1 and Phase 2

`staccato bootstrap init` SHALL sequentially: (1) render the embedded k0s config, (2) invoke
`k0sctl apply` to provision the cluster, (3) wait for the cluster API to be ready, (4) apply the
KubeVela kustomize bootstrap overlay via `kubectl apply`.

#### Scenario: Full bootstrap completes successfully on a clean host

- **WHEN** `staccato bootstrap init --env local` is run on a host with no existing k0s cluster
- **THEN** a k0s cluster is provisioned, KubeVela CRDs are installed, and the command exits 0

#### Scenario: Phase 1 failure halts execution

- **WHEN** `k0sctl apply` returns a non-zero exit code
- **THEN** Phase 2 is not attempted and the CLI exits with the error message from k0sctl

#### Scenario: Phase 2 failure is reported clearly

- **WHEN** `kubectl apply` of the kustomize bootstrap fails
- **THEN** the CLI exits non-zero and prints the kubectl error output with a human-readable prefix

### Requirement: --env flag selects cluster profile

`staccato bootstrap init` SHALL accept `--env <local|prod>` to select the appropriate k0s config
template. Default SHALL be `local`.

#### Scenario: Default is local

- **WHEN** `staccato bootstrap init` is run without `--env`
- **THEN** the single-node local k0s config is used

#### Scenario: prod profile requires controller IPs

- **WHEN** `staccato bootstrap init --env prod` is run without `--controller-ips`
- **THEN** the CLI exits with a descriptive error before invoking k0sctl

### Requirement: Idempotent re-run

`staccato bootstrap init` SHALL be safe to run on a cluster that is already provisioned and has
KubeVela installed — it SHALL skip already-complete phases rather than error.

#### Scenario: Re-run on existing cluster is a no-op

- **WHEN** `staccato bootstrap init` is run a second time on an already-bootstrapped cluster
- **THEN** the command exits 0 with a message indicating each phase was already complete

#### Scenario: Partial completion is resumed

- **WHEN** Phase 1 completed but Phase 2 did not (e.g. prior interrupted run)
- **THEN** `staccato bootstrap init` detects the cluster is ready and applies Phase 2 only
