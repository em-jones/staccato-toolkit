---
td-board: garden-dev-environment-garden-project-config
td-issue: td-bebc7a
---

# Specification: Garden Project Config

## Overview

Validates that `project.garden.yml` correctly discovers all four dev service action files via directory scanning, without requiring explicit service registration.

## ADDED Requirements

### Requirement: Project scan discovers all 4 services

`project.garden.yml` SHALL scan the repository for `garden.yml` files and automatically discover Build/Deploy/Run actions for all four services: staccato-server, staccato-cli, staccato-tui, and staccato-web. No explicit service listing is required — Garden's file-system scan handles discovery.

#### Scenario: All services visible in garden status

- **WHEN** `garden dev` is run in the project root
- **THEN** Garden discovers and displays actions for `staccato-server`, `staccato-cli`, `staccato-tui`, and `staccato-web` (plus Backstage)

#### Scenario: New service garden.yml is auto-discovered

- **WHEN** a new `garden.yml` file is placed in any non-excluded subdirectory
- **THEN** Garden includes it in the next `garden dev` run without editing `project.garden.yml`

### Requirement: Document project.garden.yml structure

The `project.garden.yml` file SHALL include inline comments explaining the `scan.exclude` list so engineers know which paths are intentionally excluded from service discovery.

#### Scenario: Comments present in project.garden.yml

- **WHEN** a developer opens `project.garden.yml`
- **THEN** they can see which directories are excluded from scanning and why
