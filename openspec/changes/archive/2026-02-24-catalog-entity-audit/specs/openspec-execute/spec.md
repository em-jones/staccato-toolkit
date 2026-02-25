---
td-board: catalog-entity-audit-openspec-execute
td-issue: td-04c373
---

# Specification: openspec-execute

## Overview

Delta spec for `openspec/specs/openspec-execute/spec.md`. Adds a catalog task completion check to the completion step.

## ADDED Requirements

### Requirement: Catalog tasks must be closed before change is marked complete

When `openspec-execute` determines all tasks on the change board are closed, it SHALL check for any open tasks with titles matching `Catalog:` before declaring the change complete.

#### Scenario: Open catalog tasks remain when implementation tasks are all closed

- **WHEN** all non-catalog implementation tasks on the board are closed
- **AND** one or more tasks with titles matching `Catalog:` are still open
- **THEN** `openspec-execute` SHALL NOT display the "Execution Complete" message
- **THEN** it SHALL display: "⚠ Implementation complete but catalog tasks remain open:" followed by the list of open catalog tasks
- **THEN** it SHALL continue the implementation loop, treating catalog tasks as the next work items

#### Scenario: All tasks including catalog tasks are closed

- **WHEN** all tasks on the change board are closed, including any `Catalog:` tasks
- **THEN** `openspec-execute` displays the "Execution Complete" message and suggests archiving

#### Scenario: No catalog tasks exist on the board

- **WHEN** the board contains no tasks with titles matching `Catalog:`
- **THEN** the existing completion logic is unchanged
