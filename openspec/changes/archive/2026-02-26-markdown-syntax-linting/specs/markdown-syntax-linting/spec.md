---
td-board: markdown-syntax-linting-markdown-syntax-linting
td-issue: td-899706
---

# Specification: markdown-syntax-linting

## Overview

Defines requirements for automated markdownlint-cli2-based syntax linting across all markdown files in the repository, with CI integration via Dagger.

## ADDED Requirements

### Requirement: markdownlint configuration defined

The platform SHALL provide a `.markdownlint.json` configuration file that specifies the active markdownlint rule set for the repository, including rules for heading levels, code fence language tags, line length, trailing spaces, and blank line discipline.

#### Scenario: Configuration is discoverable

- **WHEN** `markdownlint-cli2` is run from the repository root
- **THEN** it automatically discovers and applies `.markdownlint.json` without manual flag specification

#### Scenario: Rules reject heading level skips

- **WHEN** a markdown file contains a heading that skips a level (e.g., `## h2` followed by `#### h4`)
- **THEN** `markdownlint-cli2` reports a violation for that file

### Requirement: Dagger task for markdown syntax linting

The platform SHALL expose a Dagger task (`lint-md`) that runs `markdownlint-cli2` against all `.md` files in the repository source tree.

#### Scenario: Passing on conformant files

- **WHEN** the `lint-md` Dagger task is run against a repository with all `.md` files passing all active rules
- **THEN** the task exits with code 0

#### Scenario: Failing on rule violations

- **WHEN** the `lint-md` Dagger task is run against a repository containing `.md` files with syntax violations
- **THEN** the task exits with a non-zero code and reports each violation with file path, line number, and rule name

### Requirement: CI lint job includes markdown syntax linting

The CI `lint` job SHALL invoke the `lint-md` Dagger task so that markdown syntax violations block pull request merges.

#### Scenario: Lint job runs on pull request

- **WHEN** a pull request is opened or updated
- **THEN** the `lint` CI job runs `lint-md` as part of its steps

#### Scenario: Merge blocked on lint failure

- **WHEN** the `lint-md` step fails in CI
- **THEN** the pull request cannot be merged until all violations are resolved
