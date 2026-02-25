---
td-board: adopt-go-app
td-issue: td-87b3e8
status: accepted
date: 2026-02-27
tech-radar:
  - name: go-app
    quadrant: Languages & Frameworks
    ring: Trial
    description: Go+WASM PWA framework; enables writing browser UIs in pure Go. At Trial pending broader evaluation of WASM performance and bundle size tradeoffs.
    moved: 1
---

# Design: Adopt go-app v10

## Context

`staccato-web` was implemented using go-app v10 as part of `initialize-interface-modules`. The tech radar entry (Trial) and usage rules were created during that change. This design formalises the adoption decision.

## Goals / Non-Goals

**Goals:** Record the adoption decision at Trial ring with rationale. Confirm usage rules exist.
**Non-Goals:** Implementation work (already complete in initialize-interface-modules).

## Decisions

**Trial (not Adopt)**: go-app produces large WASM binaries (~13MB), and browser WASM support has latency implications. The platform is evaluating whether the developer-experience benefit (pure Go front-end) outweighs these tradeoffs before committing to Adopt.

**`ctx.Dispatch` for state mutations**: go-app v10 removed `h.Update()`. All state changes inside event handlers must go through `ctx.Dispatch(func(ctx app.Context) { ... })` to schedule a re-render.

**Dual-build entry point**: `app.RunWhenOnBrowser()` must be called before any server-side code to ensure the WASM binary activates routing in the browser without affecting the native server binary.

## Technology Adoption & Usage Rules

| Domain | Technology | Action | Notes |
|--------|-----------|--------|-------|
| PWA/WASM framework | go-app v10 | Trial | Rules in `.opencode/rules/technologies/go.md#go-app-v10` |

## Catalog Entities

| Kind | Name | Action | Notes |
|------|------|--------|-------|
| n/a | — | — | No new catalog entities |

## Agent Skills

| Skill | Action | Notes |
|-------|--------|-------|
| go-developer | n/a | go-app section already added |
