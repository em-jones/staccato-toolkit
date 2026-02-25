---
td-board: initialize-interface-modules
td-issue: td-092423
---

# Proposal: Initialize Interface Modules

## Why

The three user-facing interface modules (`tui`, `cli`, `web`) exist as scaffolding but have no meaningful implementation. Initializing each with a working hello-world establishes the foundation for feature development, validates toolchain and dependency choices, and ensures cross-interface consistency patterns are embedded from the start.

## What Changes

- Initialize `src/staccato-toolkit/tui` with a working TUI using a selected Go TUI library
- Initialize `src/staccato-toolkit/cli` with a working CLI using a selected Go CLI framework (delta on existing spec)
- Initialize `src/staccato-toolkit/web` with a working web/PWA UI using a selected Go WASM UI tool

## Capabilities

### New Capabilities

- `tui-hello-world`: A minimal working TUI application in `src/staccato-toolkit/tui` using a researched and selected Go TUI library
- `web-hello-world`: A minimal working web/PWA WASM UI application in `src/staccato-toolkit/web` using a researched and selected Go WASM/PWA framework

### Modified Capabilities

- `staccato-cli`: Existing spec — add hello-world CLI implementation with a selected CLI framework (cobra or equivalent); the current `main.go` is an empty stub

## Impact

- Affected modules: `src/staccato-toolkit/tui`, `src/staccato-toolkit/cli`, `src/staccato-toolkit/web`
- API changes: No
- Data model changes: No
- Dependencies: New Go libraries for TUI, CLI framework, and WASM/PWA UI (to be selected during design research)
