---
td-board: markdown-spell-checking-markdown-spell-checking
td-issue: td-165103
---

# Specification: markdown-spell-checking

## Overview

Defines requirements for automated cspell-based spell checking across all markdown files in the repository, including a project-specific wordlist, with CI integration via Dagger.

## ADDED Requirements

### Requirement: cspell configuration with project wordlist

The platform SHALL provide a `cspell.config.yaml` configuration file containing a project-specific word list that includes technical terms used in this repository (e.g., `openspec`, `staccato`, `devbox`, `dagger`, `td`, `grpc`, `protobuf`, `lychee`, `markdownlint`, `kubectl`, `kubernetes`, `backstage`, `grafana`, `otel`).

#### Scenario: Known technical terms pass

- **WHEN** cspell is run on a markdown file containing project-specific technical terms from the wordlist
- **THEN** those terms are not flagged as misspellings

#### Scenario: Genuine typos are caught

- **WHEN** cspell is run on a markdown file containing a misspelled common word (e.g., `teh`, `impelmentation`)
- **THEN** cspell reports a violation for that word with file path and line number

### Requirement: Dagger task for spell checking

The platform SHALL expose a Dagger task (`spell-check`) that runs cspell against all `.md` files in the repository source tree.

#### Scenario: Passing on correctly spelled files

- **WHEN** the `spell-check` Dagger task is run against a repository with no spelling violations
- **THEN** the task exits with code 0

#### Scenario: Failing on misspelled words

- **WHEN** the `spell-check` Dagger task is run against a repository containing `.md` files with spelling errors
- **THEN** the task exits with a non-zero code and reports each misspelled word with file and line number

### Requirement: CI lint job includes spell checking

The CI `lint` job SHALL invoke the `spell-check` Dagger task so that spelling errors block pull request merges.

#### Scenario: Lint job runs on pull request

- **WHEN** a pull request is opened or updated
- **THEN** the `lint` CI job runs `spell-check` as part of its steps

#### Scenario: Merge blocked on spell check failure

- **WHEN** the `spell-check` step fails in CI
- **THEN** the pull request cannot be merged until all spelling violations are resolved or the wordlist is updated
