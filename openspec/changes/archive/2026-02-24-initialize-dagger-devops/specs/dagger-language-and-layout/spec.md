---
td-board: initialize-dagger-devops-dagger-language-and-layout
td-issue: td-d4ba35
---

# Specification: dagger-language-and-layout

## Overview

Defines the language selection decision for dagger modules and the monorepo layout conventions for dagger code within this repository.

## ADDED Requirements

### Requirement: Language selection decision is documented with decision analysis

The change SHALL include a documented decision record comparing dagger language options (Go, Python, TypeScript) and selecting one. The decision record SHALL include evaluation criteria, option comparison, and rationale for the chosen language.

#### Scenario: Decision record covers all three official dagger SDKs

- **WHEN** the decision record is authored
- **THEN** it evaluates Go, Python, and TypeScript SDKs against criteria including: existing team language fluency, CI execution speed, type safety, ecosystem maturity, and devbox integration effort
- **THEN** it selects Go as the chosen language and records the rationale

#### Scenario: Decision record is embedded in design.md

- **WHEN** a developer reads design.md
- **THEN** they find the language decision in a dedicated "Dagger Language Selection" section with the full option comparison and chosen outcome

### Requirement: Dagger module directory follows repository layout conventions

The dagger module SHALL be placed at a path consistent with the repository layout rules (`patterns/architecture/repository-layout.md`). The directory SHALL contain only dagger module files for the chosen language.

#### Scenario: Dagger module at correct repository path

- **WHEN** the dagger module is created
- **THEN** it exists at `src/ops/platform/` per `repository-layout.md`
- **THEN** it does NOT mix dagger module files with unrelated application code

#### Scenario: Directory structure documented in devops-automation skill

- **WHEN** an agent reads `.opencode/skills/devops-automation/SKILL.md`
- **THEN** it finds the directory structure and file naming conventions for adding new dagger tasks

### Requirement: Monorepo tooling integrates dagger with devbox

The devbox configuration (`devbox.json`) SHALL include dagger and the Go runtime as available tools so developers can run `dagger` commands without separate installation.

#### Scenario: dagger available after devbox shell

- **WHEN** a developer runs `devbox shell`
- **THEN** the `dagger` CLI is on PATH
- **THEN** running `dagger version` succeeds

#### Scenario: devbox.json updated

- **WHEN** the change is complete
- **THEN** `devbox.json` contains dagger and go in its packages list
