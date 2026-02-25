---
td-board: document-github-actions-patterns-github-actions-action-curation
td-issue: td-ea7df9
---

# Specification: GitHub Actions Action Curation

## Overview

This spec defines the process for selecting, vetting, and maintaining approved GitHub Actions. It establishes criteria for action evaluation and a curated catalog of recommended actions.

## ADDED Requirements

### Requirement: Action vetting criteria

New actions to be used in workflows SHALL be evaluated against a defined set of criteria before approval for organization-wide use.

#### Scenario: Action evaluation and approval

- **WHEN** a developer wants to use a new action in workflows
- **THEN** the action is evaluated against vetting criteria (maintainability, security, documentation, activity)
- **THEN** approved actions are added to the organization's curated catalog

### Requirement: Action source and trust assessment

Actions SHALL come from trusted sources with evidence of active maintenance and security practices.

#### Scenario: Source verification

- **WHEN** evaluating an action from a GitHub Marketplace
- **THEN** the action source and maintainer credentials are verified
- **WHEN** using official actions (e.g., GitHub-provided actions)
- **THEN** these are considered pre-approved as trusted sources

### Requirement: Security scanning for actions

Actions used in workflows SHALL be scanned for known vulnerabilities and security issues.

#### Scenario: Vulnerability detection

- **WHEN** a new action is proposed for use
- **THEN** the action code is scanned for known vulnerabilities
- **THEN** actions with unresolved critical vulnerabilities are rejected

### Requirement: Action documentation and clarity

Actions SHALL be well-documented with clear input/output definitions and usage examples.

#### Scenario: Clear usage patterns

- **WHEN** a developer uses an approved action
- **THEN** the action's inputs, outputs, and behavior are clearly documented
- **THEN** documentation includes practical examples of common usage patterns

### Requirement: Action maintenance status

Actions SHALL be actively maintained by their maintainers or the organization SHALL fork and maintain them internally.

#### Scenario: Dependency currency

- **WHEN** an approved action becomes unmaintained
- **THEN** the action status is reviewed and either the maintainer is contacted or an alternative is provided
- **WHEN** a fork is necessary
- **THEN** the organization creates and maintains a version internally

### Requirement: Curated action catalog

The organization SHALL maintain a documented, searchable catalog of approved actions with their purpose, inputs, and usage guidelines.

#### Scenario: Action discovery

- **WHEN** a developer looks for an action to perform a specific task
- **THEN** the curated catalog lists approved actions with their purposes
- **THEN** the catalog includes links to documentation and usage examples

### Requirement: Action version pinning strategies

Workflows SHALL specify action versions using appropriate pinning strategies (major version, semantic version, or commit SHA) based on stability needs.

#### Scenario: Version stability and updates

- **WHEN** a workflow uses an action from the catalog
- **THEN** the action is pinned to a specific version (e.g., `v1`, `v1.2.3`, or commit SHA)
- **THEN** version updates are managed deliberately rather than automatically picking new versions

### Requirement: Deprecated action handling

The organization SHALL have a process for deprecating actions and migrating workflows to replacements.

#### Scenario: Graceful deprecation

- **WHEN** an action becomes deprecated or replaced
- **THEN** workflows using the deprecated action are identified
- **THEN** migration guides are provided to switch to the replacement action
