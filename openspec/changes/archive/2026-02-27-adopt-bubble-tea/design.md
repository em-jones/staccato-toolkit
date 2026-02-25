---
td-board: adopt-bubble-tea
td-issue: td-4971b0
status: accepted
date: 2026-02-27
tech-radar:
  - name: Bubble Tea
    quadrant: Languages & Frameworks
    ring: Adopt
    description: Elm-architecture TUI framework for Go; chosen for staccato-tui after evaluating tview and termui; v2 API is stable and idiomatic.
    moved: 1
---

# Design: Adopt Bubble Tea v2

## Context

`staccato-tui` was implemented using Bubble Tea v2 as part of `initialize-interface-modules`. The tech radar entry and usage rules were created during that change. This design formalises the adoption decision.

## Goals / Non-Goals

**Goals:** Record the adoption decision with rationale. Confirm usage rules exist.
**Non-Goals:** Implementation work (already complete in initialize-interface-modules).

## Decisions

**Bubble Tea v2 over v1**: v2 introduces `tea.View` return type for `View()` and a revised `Init()` signature; it is the maintained branch. v1 is no longer receiving updates.

**Elm Architecture**: Model/Init/Update/View enforces unidirectional data flow, making TUI logic straightforward to test without a real terminal.

## Technology Adoption & Usage Rules

| Domain | Technology | Action | Notes |
|--------|-----------|--------|-------|
| TUI framework | Bubble Tea v2 | Adopt | Rules in `.opencode/rules/technologies/go.md#bubble-tea-v2` |

## Catalog Entities

| Kind | Name | Action | Notes |
|------|------|--------|-------|
| n/a | — | — | No new catalog entities |

## Agent Skills

| Skill | Action | Notes |
|-------|--------|-------|
| go-developer | n/a | Bubble Tea section already added |
