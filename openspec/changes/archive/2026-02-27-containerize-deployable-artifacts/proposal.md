---
td-board: containerize-deployable-artifacts
td-issue: td-be9c10
---

# Proposal: Containerize Deployable Artifacts

## Why

The three deployable artifacts (Backstage dev-portal, Staccato CLI, and Staccato Server) lack standardized containerization for consistent deployment across environments. Production deployments need optimized, minimal images, while development environments require hot-reloading capabilities for rapid iteration. This change establishes container build definitions supporting both use cases.

## What Changes

- Create production Containerfile for `src/dev-portal/backstage` (minimal, optimized runtime)
- Create dev Containerfile for `src/dev-portal/backstage` with hot-reloading via `yarn serve`
- Create production Containerfile for `src/staccato-toolkit/cli` (optimized binary distribution)
- Create dev Containerfile for `src/staccato-toolkit/cli` with live rebuilding
- Create production Containerfile for `src/staccato-toolkit/server` (optimized runtime)
- Create dev Containerfile for `src/staccato-toolkit/server` with hot-reloading

## Capabilities

### New Capabilities

- `backstage-containerization`: Production and development container images for Backstage portal with hot-reload support
- `cli-containerization`: Production and development container images for Staccato CLI tool
- `server-containerization`: Production and development container images for Staccato Server with hot-reload support

## Impact

- Affected services/modules: `src/dev-portal/backstage`, `src/staccato-toolkit/cli`, `src/staccato-toolkit/server`
- New artifacts: 6 Containerfiles (3 production, 3 development)
- Build infrastructure: Integration with Docker/Podman build systems
- Development workflow: Enables containerized development with live-reload for Backstage and Server
- No API changes, data model changes, or new dependencies required at this level
