---
status: proposed
date: 2026-02-24
decision-makers: platform-architect-agent
td-board: add-k9s-to-devbox
td-issue: td-db2dc6
tech-radar:
  - name: k9s
    quadrant: Infrastructure
    ring: Trial
    description: Already added to Tech Radar in support-kubernetes; this change
      implements the adoption
    moved: 0
---

# Design: Add k9s to devbox

## Context and problem statement

`k9s` is a terminal UI for navigating and managing Kubernetes clusters. The `support-kubernetes` ADR selected k9s to improve developer ergonomics when working with local kind clusters. Developers use k9s to inspect pods, view logs, exec into containers, and manage resources — all without memorising kubectl commands. It runs in the terminal, making it compatible with headless and remote environments. Currently there is no cluster UI in the project environment.

## Decision criteria

This design achieves:

- **Developer ergonomics** (70%): makes Kubernetes accessible to developers who aren't kubectl power users
- **Reproducibility** (30%): pinned k9s version in devbox

Explicitly excludes:

- k9s configuration/theming (out of scope — developer preference)

## Considered options

### Option 1: Add k9s to devbox.json (chosen)

Pin `k9s@<version>` in `devbox.json`.

### Option 2: Lens (GUI)

Rejected: Lens is a GUI application, not available in headless/SSH/terminal environments. k9s runs anywhere a terminal does.

## Decision outcome

Add `k9s` at a pinned version to `devbox.json`. Version to use: look up the latest k9s release (≥0.32) at implementation time and pin it.

## Risks / trade-offs

- Risk: k9s is not CNCF Graduated (OSS community project) → acceptable; it is widely adopted and low-risk for a developer tool
- Trade-off: Terminal learning curve → acceptable; k9s has excellent built-in help

## Migration plan

1. Add `"k9s@<version>"` to `devbox.json`
2. `devbox install` to verify
3. `k9s version` inside `devbox shell`
4. Rollback: remove entry

## Confirmation

- `k9s version` succeeds inside `devbox shell`
- `devbox.json` contains a versioned k9s entry

## Open questions

- None

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| k9s / Kubernetes terminal UI | platform-architect-agent | `.opencode/rules/patterns/delivery/iac.md` | reviewed |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| — | — | — | none | Adding k9s to devbox does not change any agent workflow |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | devbox package addition; no new catalog entities |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |
