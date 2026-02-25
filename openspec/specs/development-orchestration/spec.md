---
td-board: catalog-entity-audit-development-orchestration
td-issue: td-24e2f4
---

# Specification: development-orchestration

## Overview

Delta spec for `openspec/specs/` (no existing spec for development-orchestration). Adds catalog task completion check to the completion step of the autonomous orchestration skill.

## ADDED Requirements

### Requirement: Catalog tasks must be closed before ready-to-archive notification

When `development-orchestration` reaches its completion step (Step 6), it SHALL check for open `Catalog:` tasks before notifying the user the change is ready to archive.

#### Scenario: Open catalog tasks remain when all implementation tasks close

- **WHEN** all implementation tasks across all worker streams are closed
- **AND** one or more tasks with titles matching `Catalog:` remain open on the change board
- **THEN** the orchestrator SHALL NOT display "Ready to archive"
- **THEN** it SHALL display: "⚠ Implementation streams complete but catalog tasks remain:" followed by the list
- **THEN** it SHALL dispatch a worker to complete the open catalog tasks before re-evaluating completion

#### Scenario: All tasks including catalog tasks are closed

- **WHEN** all tasks including `Catalog:` tasks are closed
- **THEN** the orchestrator displays the "Execution Complete" message and notifies ready-to-archive

#### Scenario: No catalog tasks exist

- **WHEN** the board contains no tasks with titles matching `Catalog:`
- **THEN** the existing completion logic is unchanged
