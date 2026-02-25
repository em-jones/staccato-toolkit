---
td-board: adopt-golang-monorepo
td-issue: td-77c2c4
---

# Proposal: Adopt Golang Monorepo

## Why

The project needs a structured Golang monorepo to house the staccato toolkit (CLI, server, domain) and operational workloads under a single workspace, enabling consistent tooling, shared dependency management, and clear module boundaries from the start.

## What Changes

- Add `go.work` workspace file at the repo root linking all Go modules
- Add `src/staccato-toolkit/cli` module — user-facing CLI for the staccato toolkit
- Add `src/staccato-toolkit/server` module — API server orchestrating CLI/system interactions
- Add `src/staccato-toolkit/domain` module — core business logic, models, and interfaces
- Existing `src/ops/workloads` (dagger) module included in the workspace

## Capabilities

### New Capabilities

- `golang-workspace`: Go workspace (`go.work`) at repo root linking all modules for unified builds and tooling
- `staccato-cli`: Command-line interface module for user-facing staccato toolkit commands
- `staccato-server`: Server module handling API requests and orchestrating toolkit interactions
- `staccato-domain`: Domain module containing core business logic, data models, and shared interfaces

### Modified Capabilities

_(none — all capabilities are new)_

## Impact

- Affected services/modules: `src/staccato-toolkit/cli`, `src/staccato-toolkit/server`, `src/staccato-toolkit/domain`, `src/ops/workloads`
- API changes: No
- Data model changes: No
- Dependencies: Go 1.25.4 (already in devbox); no new external dependencies at this stage
