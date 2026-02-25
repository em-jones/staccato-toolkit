---
td-board: complete-skaffold-k9s-tools-k9s-cluster-navigation
td-issue: td-8ec352
---

# Specification: k9s Cluster Navigation

## Overview

This spec defines how k9s integrates with local development workflows to provide interactive cluster exploration, pod management, and debugging capabilities in the devbox environment.

## ADDED Requirements

### Requirement: k9s in devbox installation

k9s SHALL be installed and available in the devbox environment with version constraints and initialization documented.

#### Scenario: User can run k9s commands in devbox

- **WHEN** user runs `devbox run k9s version`
- **THEN** system returns valid k9s version output without errors

### Requirement: k9s cluster connection from devbox

The system SHALL allow k9s to connect to the local Kubernetes cluster configured in the devbox environment without manual kubeconfig manipulation.

#### Scenario: Developer can launch k9s to inspect cluster

- **WHEN** developer runs `k9s` in devbox environment with a local cluster running
- **THEN** k9s TUI opens and displays cluster resources and status

### Requirement: Usage rules for k9s workflows

Usage rules SHALL document best practices for using k9s for cluster navigation including viewing pods, logs, events, and interactive debugging in local development scenarios.

#### Scenario: Developer can reference k9s patterns

- **WHEN** developer reviews `.opencode/rules/patterns/` directory
- **THEN** developer finds documented patterns for cluster navigation and debugging with k9s

### Requirement: Integration with Skaffold workflows

k9s SHALL integrate seamlessly with Skaffold dev mode to allow developers to monitor and debug containerized workloads during rapid iteration.

#### Scenario: Developer uses k9s alongside skaffold dev

- **WHEN** developer runs `skaffold dev` and opens k9s in another terminal
- **THEN** k9s displays live updates to pods and resources being managed by Skaffold

### Requirement: Documentation for interactive debugging

The system SHALL document how developers use k9s for interactive cluster exploration, pod inspection, log viewing, and troubleshooting during local development.

#### Scenario: Developer understands k9s debugging workflow

- **WHEN** developer reads documentation on interactive cluster navigation
- **THEN** developer can use k9s to inspect, debug, and manage cluster resources
