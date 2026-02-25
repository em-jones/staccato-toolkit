---
td-board: markdown-formatting-markdown-formatting
td-issue: td-54c47b
---

# Specification: markdown-formatting

## Overview

Defines requirements for automated Prettier-based formatting enforcement across all markdown files in the repository, with CI integration via Dagger.

## ADDED Requirements

### Requirement: Prettier configured for markdown

The platform SHALL provide a Prettier configuration that enforces consistent markdown style (prose wrap, print width, end of line) for all `.md` files in the repository.

#### Scenario: Configuration file present

- **WHEN** a developer runs Prettier on any `.md` file
- **THEN** Prettier applies the project-specified formatting rules without requiring manual flags

#### Scenario: Consistent output on re-run

- **WHEN** Prettier is run twice on an already-formatted file
- **THEN** the file is unchanged on the second run (idempotency)

### Requirement: Dagger task for markdown format check

The platform SHALL expose a Dagger task (`format-md`) that runs Prettier in check mode (`--check`) against all `.md` files in the repository source tree.

#### Scenario: Passing on correctly formatted files

- **WHEN** the `format-md` Dagger task is run against a repository with all `.md` files already formatted
- **THEN** the task exits with code 0

#### Scenario: Failing on unformatted files

- **WHEN** the `format-md` Dagger task is run against a repository containing an unformatted `.md` file
- **THEN** the task exits with a non-zero code and reports which files are non-conformant

### Requirement: CI format job includes markdown check

The CI `format` job SHALL invoke the `format-md` Dagger task so that unformatted markdown files block pull request merges.

#### Scenario: Format job runs on pull request

- **WHEN** a pull request is opened or updated
- **THEN** the `format` CI job runs `format-md` as part of its steps

#### Scenario: Merge blocked on format failure

- **WHEN** the `format-md` step fails in CI
- **THEN** the pull request cannot be merged until the formatting issue is resolved
