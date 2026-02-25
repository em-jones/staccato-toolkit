---
td-board: garden-dev-environment
td-issue: td-130d06
---

# Proposal: Garden Dev Environment — All 4 Services

## Why

The local Garden dev environment currently only has Build/Deploy actions for the server, CLI, and Backstage. The TUI and Web interface modules introduced in `initialize-interface-modules` have no `garden.yml` or `Containerfile.dev`, so `garden dev` does not start or hot-reload them. This means the dev environment is incomplete and the team cannot develop all four services together.

## What Changes

- Add `Containerfile.dev` for `staccato-tui` (terminal UI, Bubble Tea v2)
- Add `Containerfile.dev` for `staccato-web` (PWA, go-app v10 + WASM)
- Add `garden.yml` for `staccato-tui` (Build + Run action — TUI is a terminal process, not a long-running server)
- Add `garden.yml` for `staccato-web` (Build + Deploy action — web server with port-forward on :8081)
- Confirm the project scans and discovers all 4 dev services correctly

## Capabilities

### New Capabilities

- `garden-project-config`: Validate and document that `project.garden.yml` correctly discovers all service action files
- `garden-service-actions`: Add missing Garden build/deploy/run actions for TUI and Web modules

### Modified Capabilities

*(none)*

## Impact

- Affected modules: `src/staccato-toolkit/tui/`, `src/staccato-toolkit/web/`
- API changes: No
- Data model changes: No
- Dependencies: Garden v2 (existing), go-app WASM build requires multi-stage container build
