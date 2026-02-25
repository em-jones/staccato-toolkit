---
td-board: garden-dev-environment
td-issue: td-130d06
---

# Design: Garden Dev Environment — All 4 Services

## Context

The `initialize-interface-modules` change added Go hello-world implementations for TUI (Bubble Tea v2) and Web (go-app v10 + WASM), but did not add Garden integration. The dev environment currently runs: server, CLI (as a Job), and Backstage. TUI and Web are not yet discoverable by Garden.

Garden v2 uses file-system scanning (`project.garden.yml` → `scan.exclude`) to find all `garden.yml` files, so adding Garden support for TUI and Web requires only:
1. `Containerfile.dev` per module
2. `garden.yml` per module (Build + Run/Deploy actions)
3. Kubernetes manifests in `src/ops/dev/manifests/`

## Goals / Non-Goals

**Goals:**
- All 4 dev services (server, cli, tui, web) + Backstage start with `garden dev`
- TUI and Web follow the same container build patterns as server and CLI
- Web UI accessible at `localhost:8081` (no port conflict with server at `localhost:8080`)

**Non-Goals:**
- Production Containerfiles (those are separate)
- Hot-reload / Mutagen sync for TUI (TTY limitations in k8s) and Web (WASM rebuild is slow)
- TUI as a persistent Deploy — it is a terminal process, modelled as a Run (Job) like CLI

## Decisions

### TUI: Run (Job) not Deploy

The TUI is an interactive terminal application, not a server. Running it as a Kubernetes Deployment makes no sense. Following the CLI pattern, a health-check Job (`staccato-tui-health`) is used to validate the image. In real use, engineers run the TUI binary directly via `kubectl exec` or locally.

**Alternative considered:** Deploy with a shell loop — rejected as misleading.

### Web: Port 8081

The web HTTP server serves on port 8081 to avoid conflict with the staccato-server on 8080. The Containerfile.dev builds the WASM binary in a separate stage and embeds it into the final image.

**Alternative considered:** Port 8082 — 8081 is the more conventional "second HTTP service" port.

### Web Containerfile: Multi-stage with WASM

go-app requires a WASM binary at `web/app.wasm` served alongside the HTTP server. The multi-stage Containerfile builds:
- Stage 1 (`wasm-builder`): `GOOS=js GOARCH=wasm go build -o web/app.wasm .`
- Stage 2 (`server-builder`): `GOOS=linux go build -o staccato-web .`
- Stage 3 (runtime): copies both artifacts

### TUI Containerfile: Single-stage (no WASM)

The TUI has no WASM component. A single-stage build mirrors the CLI pattern.

## Technology Adoption & Usage Rules

| Domain | Technology | Action | Notes |
|--------|-----------|--------|-------|
| Container builds | Multi-stage Dockerfile | n/a | Existing pattern |
| Dev orchestration | Garden v2 | n/a | Already adopted |

## Catalog Entities

| Kind | Name | Action | Notes |
|------|------|--------|-------|
| n/a | — | — | No new catalog entities |

## Agent Skills

| Skill | Action | Notes |
|-------|--------|-------|
| go-developer | n/a | No skill changes needed |
| devops-automation | n/a | No dagger changes |

## Risks / Trade-offs

- WASM binary in container (~13MB) increases image size — acceptable for dev
- TUI cannot be tested end-to-end in Garden (no TTY) — health-check Job provides basic image validation only

## Migration Plan

1. Create `src/ops/dev/manifests/staccato-tui/job.yaml` (mirrors CLI job pattern)
2. Create `src/ops/dev/manifests/staccato-web/deployment.yaml` + `service.yaml`
3. Add `Containerfile.dev` for TUI and Web
4. Add `garden.yml` for TUI and Web
5. Add inline comments to `project.garden.yml` explaining `scan.exclude`
6. Run `garden status` to verify all 5 action groups are discovered

## Open Questions

*(none)*
