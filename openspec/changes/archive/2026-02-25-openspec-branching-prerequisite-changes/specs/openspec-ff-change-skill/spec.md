---
td-board: openspec-branching-prerequisite-changes-openspec-ff-change-skill
td-issue: td-9e1fd9
---

# Specification: openspec-ff-change-skill

## Overview

Delta spec adding a prerequisite-change spawning step to `openspec-ff-change`. Applied during fast-forward design artifact generation — the same logic as `openspec-continue-change` but executed non-interactively, without pausing.

## ADDED Requirements

### Requirement: ff-change spawns prerequisite changes after design artifact catalog audit

After the catalog entity audit completes during fast-forward design artifact generation, the skill SHALL read the `## Prerequisite Changes` table from `design.md` and process each non-`n/a` row — spawning changes, creating gate tasks, and wiring announcements — without pausing.

#### Scenario: Fast-forward reaches design artifact step with prerequisites declared

- **WHEN** `openspec-ff-change` generates the design artifact
- **THEN** after the catalog entity audit it reads the `## Prerequisite Changes` table
- **THEN** for each non-`n/a` row it runs `openspec new change <prereq-name>` (if not already existing)
- **THEN** it creates a gate task on the parent change root for each prerequisite
- **THEN** it continues fast-forward without pausing
- **THEN** the prerequisite changes summary is included in the fast-forward progress output

#### Scenario: Fast-forward with no prerequisite changes declared

- **WHEN** the `## Prerequisite Changes` table contains only `n/a`
- **THEN** the fast-forward continues without any prerequisite-related output
- **THEN** no gate tasks are created

### Requirement: ff-change and continue-change produce identical prerequisite td structures

The gate task creation and prerequisite change spawning logic in `openspec-ff-change` SHALL be identical to that in `openspec-continue-change`: same gate task title format (`Gate: <prereq-name> complete`), same parent (`<parent-change-root-id>`), same body content.

#### Scenario: ff-change and continue-change produce the same gate tasks

- **WHEN** a change is fast-forwarded with `openspec-ff-change` with two prerequisites declared
- **THEN** the resulting td gate tasks are indistinguishable from those produced by `openspec-continue-change`
- **THEN** the `development-orchestration` completion check operates identically for either path

