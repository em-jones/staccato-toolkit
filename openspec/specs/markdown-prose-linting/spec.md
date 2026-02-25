---
td-board: markdown-prose-linting-markdown-prose-linting
td-issue: td-7f2a1f
---

# Specification: markdown-prose-linting

## Overview

Defines requirements for automated Vale-based prose quality checking across all markdown files in the repository, with CI integration via Dagger.

## ADDED Requirements

### Requirement: Vale configuration and styles defined

The platform SHALL provide a `.vale.ini` configuration file and a `styles/` directory containing the active rule packages (e.g., Google style guide rules) that govern prose quality for all `.md` files.

#### Scenario: Configuration is discoverable

- **WHEN** Vale is run from the repository root
- **THEN** it discovers `.vale.ini` automatically and applies the configured styles without manual flag specification

#### Scenario: Styles directory is committed

- **WHEN** a developer clones the repository
- **THEN** the Vale styles directory is present without requiring a separate download step (styles are vendored or fetched via a `vale sync` step in CI)

### Requirement: Dagger task for prose linting

The platform SHALL expose a Dagger task (`lint-prose`) that runs Vale against all `.md` files in the repository source tree.

#### Scenario: Passing on conformant prose

- **WHEN** the `lint-prose` Dagger task is run against a repository with all `.md` files passing all active Vale rules
- **THEN** the task exits with code 0

#### Scenario: Reporting prose violations

- **WHEN** the `lint-prose` Dagger task is run against a repository containing prose violations (e.g., passive voice, weasel words)
- **THEN** the task exits with a non-zero code and reports each violation with file path, line number, rule name, and suggestion

### Requirement: CI lint job includes prose linting

The CI `lint` job SHALL invoke the `lint-prose` Dagger task so that prose violations block pull request merges.

#### Scenario: Lint job runs on pull request

- **WHEN** a pull request is opened or updated
- **THEN** the `lint` CI job runs `lint-prose` as part of its steps

#### Scenario: Merge blocked on prose failure

- **WHEN** the `lint-prose` step fails in CI
- **THEN** the pull request cannot be merged until all prose violations are resolved
