---
td-board: containerize-deployable-artifacts
td-issue: td-be9c10
status: accepted
date: 2026-02-26
component:
  - src/dev-portal/backstage
  - src/staccato-toolkit/cli
  - src/staccato-toolkit/server
---

# Design: Containerize Deployable Artifacts

## Context and problem statement

Three deployable artifacts (Backstage dev-portal, Staccato CLI, and Staccato Server) lack standardized containerization. Production deployments require optimized, minimal container images for efficient distribution and security. Development workflows need hot-reloading capabilities (e.g., `yarn serve` for Backstage, file-watch rebuild for Go services) to enable rapid iteration without rebuilding containers.

This design establishes container build definitions supporting both use cases: production images optimized for size and security, and development images configured for interactive development with live reload.

## Decision criteria

This design achieves:

- **Multi-environment support (60%)**: Single codebase produces both prod and dev container configurations suitable for each use case
- **Minimal production images (20%)**: Multi-stage builds, distroless bases, and optimization flags reduce size and attack surface
- **Developer experience (15%)**: Development images with volume mounts and hot-reload enable rapid iteration
- **Consistency (5%)**: Standard patterns across three different artifact types (Node.js, Go CLI, Go Server)

Explicitly excludes:

- Kubernetes manifests or orchestration (container images only)
- Registry authentication or image signing (deployment concern)
- CI/CD pipeline integration (separate concern; images are portable)
- Development environment tooling (assumes local Docker/Podman)

## Considered options

### Option 1: Single Containerfile with build-time flags

Use a single Containerfile that accepts build arguments to produce either production or development images.

**Rejected**: Mixing prod and dev logic in one file reduces clarity. Development-specific entrypoints (e.g., `yarn serve` instead of production startup) are difficult to manage as conditional logic. Separate files are more maintainable and explicit.

### Option 2: Separate Containerfiles per artifact type

Create distinct production and development Containerfiles for each artifact (e.g., `Containerfile.prod`, `Containerfile.dev`).

**Selected**: This option provides maximum clarity. Each file explicitly documents the intended use case and build process. Development-specific features (volume mounts, hot-reload entrypoints) are obvious. Production optimizations (multi-stage, distroless, stripping) are explicit.

### Option 3: Docker Compose for dev, Containerfile for prod

Use Docker Compose for development (with volume mounts and service dependencies) and standalone Containerfiles for production.

**Rejected**: Docker Compose adds a separate tool dependency for development. The Containerfile can express volumes through documentation and CLI flags, keeping tooling minimal. Consistency across prod and dev Containerfiles aids understandability.

## Decision outcome

**Use separate production and development Containerfiles for each artifact** (`Containerfile.prod` and `Containerfile.dev`). This pattern provides:

1. **Clarity**: Each file explicitly documents its use case and is self-contained
2. **Maintainability**: No conditional logic mixing prod and dev concerns
3. **Flexibility**: Development images can be tailored to developer workflows without compromising production image optimization
4. **Consistency**: Same pattern across Backstage (Node.js), CLI (Go), and Server (Go) artifacts

### Containerfile naming and structure

- `Containerfile.prod`: Production multi-stage builds with distroless bases, optimization flags, and minimal layers
- `Containerfile.dev`: Development containers with broader base images, volume mount support, and hot-reload entrypoints
- Optional: `Dockerfile` (symlink or alias to `Containerfile.prod` for backwards compatibility)

### Base image selection

**Backstage (Node.js)**:
- Production: Official Node.js minimal image (Alpine-based or official nodejs:22-slim)
- Development: Official Node.js full image with build tools (nodejs:22) for fast development rebuild

**CLI & Server (Go)**:
- Production: `golang:1.23-alpine` multi-stage builder → `gcr.io/distroless/static:nonroot` runtime (existing pattern, continue)
- Development: `golang:1.23-alpine` (single stage, developer mounts source for live rebuild)

### Hot-reload patterns

**Backstage Development**:
- Entrypoint: `yarn serve` (built-in development server with HMR)
- Mounts: `-v $(pwd):/workspace` for source code changes
- Port exposure: Backend (7007) and frontend dev server

**CLI Development**:
- Interactive shell with source mounted
- Entrypoint: `/bin/sh` for manual `go build` and testing
- Optional: Watch tool (e.g., `watchexec`) for automated rebuild on save

**Server Development**:
- Watch tool (e.g., `watchexec`) or simple file-watcher pattern
- Entrypoint: Rebuild on file change and restart server
- Port exposure: 8080 for API testing

### Multi-stage build optimization (Production)

- **Stage 1 (builder)**: Install build dependencies, download modules, compile binary
- **Stage 2 (runtime)**: Copy only compiled artifact to minimal base image, set entrypoint
- **Benefits**: Significantly reduces final image size; build tools and source code do not ship in production

## Risks / trade-offs

- **Risk**: Developers may forget to switch between `Containerfile.prod` and `Containerfile.dev` → **Mitigation**: Clear documentation in README for each artifact; possibly add build scripts that default to dev
- **Trade-off**: Separate files require maintaining both when dependencies change → **Mitigation**: Keep both files closely aligned; extract shared patterns to documentation
- **Risk**: Development images may be larger due to full base images and build tools → **Mitigation**: Acceptable; development images are local-only; production image size is the priority
- **Risk**: Hot-reload tooling (e.g., watchexec) may add dependencies to development images → **Mitigation**: Documented trade-off for developer experience; consider optional tooling

## Migration plan

1. **Create Containerfiles** for all three artifacts (`Containerfile.prod` and `Containerfile.dev` in each source directory)
2. **Test locally**: Build both images, verify prod image size and startup, verify dev image hot-reload
3. **Document build commands** in each artifact's README (e.g., `docker build -f Containerfile.prod .`, `docker build -f Containerfile.dev -t backstage-dev .`)
4. **CI/CD integration** (separate change): Update CI/CD pipeline to use `Containerfile.prod` for release builds
5. **Rollback**: Remove Containerfiles; revert to pre-containerization deployment process

## Confirmation

How to verify this design is met:

- **Test cases**: 
  - Production images build and run successfully without errors
  - Production images are minimal (analyzed with `docker inspect` and `docker history`)
  - Development images with mounted volumes allow code changes to be reflected without rebuild
  - Server startup is verified; API ports are accessible
  
- **Metrics**:
  - Production image sizes (target: <500MB for Node.js services, <100MB for CLI/Server Go binaries)
  - Build time for both image types
  - Developer iteration time (time from code change to live reload)

- **Acceptance criteria**:
  - All three artifacts have both `Containerfile.prod` and `Containerfile.dev`
  - Production images pass security scanning (distroless, non-root user)
  - Development images support volume mounts and hot-reload per artifact type
  - Documentation exists for build and run commands

## Open questions

- Should `Dockerfile` be maintained as an alias/symlink to `Containerfile.prod` for backwards compatibility? (Deferred to implementation)
- Should development images include additional tooling like `curl` or `jq` for testing? (Deferred to implementation)
- How should environment-specific configuration be passed to containers? (Separate concern; addressed at deployment)

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| Container image building (multi-stage, distroless) | Platform Eng | `.opencode/rules/patterns/delivery/container-images.md` | pending |
| Hot-reload patterns (Backstage yarn serve, Go file-watch) | Developer Experience | `.opencode/rules/patterns/development/hot-reload.md` | pending |
| Base image selection (Node.js, Go, distroless) | Platform Eng | `.opencode/rules/patterns/infrastructure/base-images.md` | pending |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Container image authoring (multi-stage Containerfiles) | worker agents | `.opencode/skills/containerization/SKILL.md` | create | Agents implementing Containerfiles need explicit guidance on patterns: multi-stage builds, base image selection, optimization flags, volume mount configuration. |
| Hot-reload development patterns | worker agents | `.opencode/skills/hot-reload-development/SKILL.md` | create | Agents need explicit patterns for configuring hot-reload in containers: entrypoints, volume mount points, watch mechanisms per artifact type. |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| Component | backstage | existing | Platform Eng | `.entities/component-backstage.yaml` | declared | Backstage component already exists; Containerfiles are an implementation detail of this component. |
| Component | staccato-cli | existing | Platform Eng | `.entities/component-staccato-cli.yaml` | declared | CLI component already exists; Containerfiles are an implementation detail. |
| Component | staccato-server | existing | Platform Eng | `.entities/component-staccato-server.yaml` | declared | Server component already exists; Containerfiles are an implementation detail. |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|---|---|
| backstage | `src/dev-portal/backstage/mkdocs.yml` | `src/dev-portal/backstage/docs/adrs/` | Container build guide, hot-reload setup | pending | pending |
| staccato-cli | `src/staccato-toolkit/cli/mkdocs.yml` | `src/staccato-toolkit/cli/docs/adrs/` | Container build guide | pending | pending |
| staccato-server | `src/staccato-toolkit/server/mkdocs.yml` | `src/staccato-toolkit/server/docs/adrs/` | Container build guide, hot-reload setup | pending | pending |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| n/a | All dependencies (Go 1.23, Node.js 22/24, Docker/Podman) are already adopted or available | n/a |

