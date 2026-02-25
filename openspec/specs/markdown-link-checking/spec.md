---
td-board: markdown-link-checking-markdown-link-checking
td-issue: td-4e395a
---

# Specification: markdown-link-checking

## Overview

Defines requirements for automated lychee-based link validation across all markdown files in the repository, with CI integration via Dagger.

## ADDED Requirements

### Requirement: lychee configuration defined

The platform SHALL provide a `lychee.toml` configuration file specifying timeout, retry count, concurrency, and exclusion patterns for known-unreachable or intentionally skipped link targets (e.g., `localhost`, private network addresses, example domains).

#### Scenario: Configuration is discoverable

- **WHEN** lychee is run from the repository root
- **THEN** it automatically discovers `lychee.toml` and applies configured settings without manual flag specification

#### Scenario: Excluded patterns are not checked

- **WHEN** a markdown file contains a link matching an exclusion pattern in `lychee.toml`
- **THEN** lychee does not attempt to validate that link and does not report it as a failure

### Requirement: Internal file links are validated

The platform SHALL validate all relative file links in markdown files to confirm that the referenced path exists within the repository.

#### Scenario: Valid relative link passes

- **WHEN** a markdown file contains a relative link (e.g., `../design.md`) that resolves to an existing file
- **THEN** lychee reports no error for that link

#### Scenario: Broken relative link fails

- **WHEN** a markdown file contains a relative link that does not resolve to an existing file
- **THEN** lychee reports a broken link error with file path, line number, and the unresolved target

### Requirement: Dagger task for link checking

The platform SHALL expose a Dagger task (`check-links`) that runs lychee against all `.md` files in the repository source tree.

#### Scenario: Passing on valid links

- **WHEN** the `check-links` Dagger task is run against a repository with no broken links
- **THEN** the task exits with code 0

#### Scenario: Failing on broken links

- **WHEN** the `check-links` Dagger task is run against a repository containing `.md` files with broken links
- **THEN** the task exits with a non-zero code and reports each broken link with file path, line number, and the failed URL or path

### Requirement: Dedicated CI links job

The CI pipeline SHALL include a dedicated `links` job that invokes the `check-links` Dagger task, separate from the `lint` job, so that slower network-dependent link checks do not block or delay fast local syntax checks.

#### Scenario: Links job runs on pull request

- **WHEN** a pull request is opened or updated
- **THEN** the `links` CI job runs `check-links` as part of its steps

#### Scenario: Merge blocked on link check failure

- **WHEN** the `check-links` step fails in CI
- **THEN** the pull request cannot be merged until all broken links are resolved or excluded
