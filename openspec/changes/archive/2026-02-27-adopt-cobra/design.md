---
td-board: adopt-cobra
td-issue: td-7db1a2
status: accepted
date: 2026-02-27
tech-radar:
  - name: cobra
    quadrant: Languages & Frameworks
    ring: Adopt
    description: De-facto standard CLI framework for Go; chosen for staccato-cli for its subcommand model, auto-generated help, and shell-completion support.
    moved: 1
---

# Design: Adopt cobra

## Context

`staccato-cli` was implemented using cobra as part of `initialize-interface-modules`. The tech radar entry and usage rules were created during that change. This design formalises the adoption decision.

## Goals / Non-Goals

**Goals:** Record the adoption decision with rationale. Confirm usage rules exist.
**Non-Goals:** Implementation work (already complete in initialize-interface-modules).

## Decisions

**cobra over flag/pflag alone**: cobra provides subcommand routing, auto-generated `--help`, shell completion, and a consistent ergonomic CLI structure. The standard `flag` package requires manual subcommand dispatch.

**`cmd.Println` over `fmt.Println`**: cobra commands should use `cmd.Println` so output can be captured in tests via `cmd.SetOut(buf)`.

## Technology Adoption & Usage Rules

| Domain | Technology | Action | Notes |
|--------|-----------|--------|-------|
| CLI framework | cobra | Adopt | Rules in `.opencode/rules/technologies/go.md#cobra` |

## Catalog Entities

| Kind | Name | Action | Notes |
|------|------|--------|-------|
| n/a | — | — | No new catalog entities |

## Agent Skills

| Skill | Action | Notes |
|-------|--------|-------|
| go-developer | n/a | cobra section already added |
