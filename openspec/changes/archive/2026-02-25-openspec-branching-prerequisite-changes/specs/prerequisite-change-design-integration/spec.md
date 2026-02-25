---
td-board: openspec-branching-prerequisite-changes-prerequisite-change-design-integration
td-issue: td-d29e52
---

# Specification: prerequisite-change-design-integration

## Overview

Adds a `## Prerequisite Changes` table to the `design.md` template, enabling architects to declare emergent prerequisite changes discovered during design. The `openspec-continue-change` and `openspec-ff-change` skills read this table after design authoring and automatically spawn each declared change, create a td gate task on the parent change root, and wire td dependencies so the parent's completion is blocked until prerequisites are satisfied.

## ADDED Requirements

### Requirement: design.md template includes a Prerequisite Changes table

The `design.md` template SHALL include a `## Prerequisite Changes` table with columns: `Change`, `Rationale`, `Status`. A comment block SHALL explain when to populate it (emergent decisions that deserve their own change) and provide an example row.

#### Scenario: Architect opens design.md and sees no prerequisites needed

- **WHEN** the architect creates `design.md` and has no emergent prerequisite changes to declare
- **THEN** they write `n/a` in the table body, identical to the `## Catalog Entities` pattern
- **THEN** the skill treats `n/a` as "no prerequisites" and skips spawning

#### Scenario: Architect declares one or more prerequisite changes

- **WHEN** the architect populates the table with one or more rows (e.g., `add-opentelemetry-sdk | Third-party SDK selection deserves its own change | pending`)
- **THEN** the skill reads each row's `Change` column as the prerequisite change name
- **THEN** the skill proceeds to spawn and wire each declared prerequisite

### Requirement: Skills spawn each declared prerequisite change after design authoring

After writing `design.md`, the `openspec-continue-change` and `openspec-ff-change` skills SHALL read the `## Prerequisite Changes` table and, for each non-`n/a` row, run `openspec new change <prereq-name>` to create the prerequisite change directory.

#### Scenario: Prerequisite change does not yet exist

- **WHEN** a row declares `add-opentelemetry-sdk` as a prerequisite
- **WHEN** no change directory exists at `openspec/changes/add-opentelemetry-sdk/`
- **THEN** the skill runs `openspec new change add-opentelemetry-sdk`
- **THEN** the skill announces: `✓ Created prerequisite change: add-opentelemetry-sdk`

#### Scenario: Prerequisite change already exists

- **WHEN** a row declares a prerequisite change whose directory already exists
- **THEN** the skill skips `openspec new change` for that entry
- **THEN** the skill announces: `↩ Prerequisite change already exists: <name> — skipping creation`
- **THEN** the skill still proceeds to wire the gate task and td dependency

### Requirement: Skills create a td gate task on the parent change root for each prerequisite

For each declared prerequisite change, the skill SHALL create a gate task on the parent change root and wire it as a dependency of the parent change root so the parent cannot be considered complete while the gate is open.

#### Scenario: Gate task is created and wired

- **WHEN** the skill spawns or confirms prerequisite change `add-opentelemetry-sdk`
- **THEN** the skill creates: `td create "Gate: add-opentelemetry-sdk complete" --type task --parent <parent-change-root-id> --body "Blocks completion. Prerequisite change add-opentelemetry-sdk must be archived before this change can be archived."`
- **THEN** the skill adds the gate task to the change board
- **THEN** `td dep add <parent-change-root-id> <gate-task-id>` is NOT used — gate tasks surface as open tasks on the board, visible to the orchestration skill's completion check

#### Scenario: Multiple prerequisites declared

- **WHEN** the table contains three prerequisite rows
- **THEN** one gate task is created per row
- **THEN** each gate task is independently closeable when its prerequisite is archived
- **THEN** de-duplicate: if a gate task for the same prereq name already exists under the change root, skip creation

### Requirement: Prerequisite spawning is announced in skill output

The skill SHALL announce each prerequisite action (create, skip, gate task created) as part of the design-phase output, immediately after the catalog entity audit.

#### Scenario: Skill output includes prerequisite summary

- **WHEN** design authoring completes with two prerequisite rows declared
- **THEN** the skill outputs a `Prerequisite changes:` section listing each action taken
- **THEN** the summary appears after the catalog entity audit summary and before returning control

