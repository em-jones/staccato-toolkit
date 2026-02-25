---
td-board: garden-dev-environment-garden-dev-workflow
td-issue: td-4a0770
---

# Specification: Garden Dev Workflow

## Overview

Defines the developer-facing workflow for the Garden-based dev environment, including the quick-start commands, lifecycle split between `task dev-up` (cluster provisioning) and `garden deploy --sync` (application hot-reload), and the tech radar entries required to formally adopt Garden and retire Skaffold.

## ADDED Requirements

### Requirement: CONTRIBUTING.md documents garden deploy --sync workflow

`CONTRIBUTING.md` SHALL exist at the repository root and SHALL document: the prerequisites (devbox, Docker), the quick-start sequence (`task dev-up` then `garden deploy --sync`), the hot-reload behavior for Go services and Backstage, the port-forward map for all services, common `garden` CLI commands (`deploy`, `test`, `get status`, `sync status`, `sync restart`, `cleanup`), and a troubleshooting section covering the most common failure modes (Mutagen sync not starting, stale cache after cluster recreate, Backstage `node_modules` overwrite, `imagePullPolicy` error).

#### Scenario: New contributor follows quick-start

- **WHEN** a new contributor follows the `CONTRIBUTING.md` quick-start steps on a machine with Docker and devbox installed
- **THEN** they reach a running `garden deploy --sync` session with all three services healthy without requiring additional steps or external documentation

#### Scenario: Troubleshooting section covers Mutagen sync failure

- **WHEN** a developer encounters a Mutagen sync session that fails to start
- **THEN** the CONTRIBUTING.md troubleshooting section provides the correct diagnostic commands (`garden sync status`, `garden sync restart`) and the root cause (readOnlyRootFilesystem not patched)

### Requirement: Taskfile dev-up/dev-down lifecycle preserved alongside Garden

The `task dev-up` and `task dev-down` Taskfile tasks SHALL remain the authoritative commands for cluster and observability stack lifecycle. `garden deploy` SHALL NOT replace `task dev-up` — it is layered on top of an already-provisioned cluster. The CONTRIBUTING.md SHALL make this split explicit so contributors understand which tool owns which layer.

#### Scenario: Cluster teardown uses task not garden

- **WHEN** a developer wants to fully destroy the dev environment
- **THEN** the documented sequence is `garden cleanup` (remove Garden-managed resources) followed by `task dev-down` (delete the kind cluster), not any Garden command for cluster deletion

#### Scenario: Garden deploy fails if cluster not provisioned

- **WHEN** `garden deploy` is run without first running `task dev-up`
- **THEN** Garden produces an error indicating the `kind-staccato-dev` context is not reachable, and the CONTRIBUTING.md makes clear that `task dev-up` must be run first

### Requirement: Tech radar updated with Garden, Skaffold, Tilt, watchexec, Telepresence entries

`docs/tech-radar.json` SHALL be updated to add or modify the following entries:
- **Garden**: added at ring `Trial`, quadrant `Infrastructure`, with description noting content-hash caching, CI portability, and Mutagen sync for multi-service Kubernetes dev environments
- **Skaffold**: moved from `Trial` to `Hold`, with description noting distroless incompatibility and Dagger superseding its CI/CD parity advantage
- **Tilt**: added at ring `Assess`, quadrant `Infrastructure`, with description noting its value for single-developer/small-scale workflows and lack of cross-session caching
- **watchexec**: added at ring `Adopt`, quadrant `Patterns/Processes`, with description noting current use in dev container images
- **Telepresence**: added at ring `Assess`, quadrant `Infrastructure`, with description noting CNCF Incubating status and surgical integration-debug use case

#### Scenario: Garden appears in Backstage Tech Radar

- **WHEN** the Backstage Tech Radar plugin reads `docs/tech-radar.json`
- **THEN** Garden appears in the Infrastructure quadrant at the Trial ring

#### Scenario: Skaffold moved to Hold

- **WHEN** the Backstage Tech Radar plugin reads `docs/tech-radar.json`
- **THEN** Skaffold appears in the Infrastructure quadrant at the Hold ring (moved from Trial)
