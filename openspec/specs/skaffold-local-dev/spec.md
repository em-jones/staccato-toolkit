# Specification: Skaffold Local Dev Integration

## Overview

This spec defines how Skaffold integrates with devbox to provide a seamless local development workflow with hot-reload, dev mode configuration, and clear usage patterns for rapid iteration on containerized workloads.

## Requirements
### Requirement: Skaffold in devbox installation

Skaffold SHALL be installed and available in the devbox environment with version constraints and initialization documented.

#### Scenario: User can run skaffold commands in devbox

- **WHEN** user runs `devbox run skaffold version`
- **THEN** system returns valid skaffold version output without errors

### Requirement: Skaffold dev mode configuration

The system SHALL provide a template or guide for configuring `skaffold.yaml` with dev mode enabled for hot-reload of code changes during local development.

#### Scenario: User can start skaffold dev mode

- **WHEN** user runs `skaffold dev` with a properly configured `skaffold.yaml`
- **THEN** system rebuilds and redeploys containers automatically on code changes

### Requirement: Usage rules for Skaffold workflows

Usage rules SHALL document best practices for using Skaffold in development including when to use dev mode vs. build mode, configuration examples, and integration with k9s.

#### Scenario: Developer can reference Skaffold patterns

- **WHEN** developer reviews `.opencode/rules/patterns/` directory
- **THEN** developer finds documented patterns for local dev workflows with Skaffold

### Requirement: Integration with devbox shell context

Skaffold SHALL work seamlessly within the devbox environment without requiring additional environment setup or configuration changes.

#### Scenario: Developer runs skaffold in devbox shell

- **WHEN** user enters devbox environment and executes Skaffold commands
- **THEN** all dependencies resolve correctly and Skaffold functions as expected

### Requirement: Documentation for rapid iteration

The system SHALL document how developers use Skaffold dev mode for rapid iteration including code changes, artifact rebuilding, and redeployment cycles.

#### Scenario: Developer understands iteration workflow

- **WHEN** developer reads documentation on local dev workflows
- **THEN** developer can configure Skaffold and iterate rapidly on code changes
