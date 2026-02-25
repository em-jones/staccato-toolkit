# Specification: Tool Integration

## Overview

This spec defines the requirements for integrating the selected Kubernetes UI tool into the
platform devbox environment, wiring it to the local cluster, and publishing usage rules.

## Requirements

### Requirement: Devbox integration for the selected tool

The selected Kubernetes UI tool SHALL be available in the devbox environment without requiring
manual installation steps outside of `devbox shell`.

#### Scenario: Tool is available after entering devbox shell

- **WHEN** a developer runs `devbox shell` in the project root
- **THEN** the selected tool binary SHALL be on `$PATH` and executable

#### Scenario: Tool version is pinned in devbox.json

- **WHEN** a developer inspects `devbox.json`
- **THEN** they SHALL find the selected tool entry with a specific version pin

### Requirement: Local cluster kubeconfig wiring

The selected tool SHALL connect to the local cluster without requiring manual kubeconfig
configuration by the developer.

#### Scenario: Tool opens against local cluster

- **WHEN** a developer launches the selected tool in a devbox shell with a running local cluster
- **THEN** the tool SHALL connect to the local cluster using the kubeconfig at
  `~/.kube/config` or the `KUBECONFIG` environment variable without additional flags

#### Scenario: No cluster-side components required for basic use

- **WHEN** a developer evaluates the tool's local-dev fit
- **THEN** basic resource viewing SHALL work without installing any in-cluster agents or
  operators (cluster-side components, if any, SHALL be optional)

### Requirement: Usage rules for the selected tool

Usage rules SHALL document how developers use the selected tool in the platform workflow,
covering common tasks: viewing resources, inspecting CRD state, reading logs, and port-forwarding.

#### Scenario: Usage rules are published at the canonical path

- **WHEN** a developer looks for UI tool documentation
- **THEN** they SHALL find a usage rule file at
  `.opencode/rules/patterns/kubernetes/<tool-name>.md`

#### Scenario: Usage rules cover CRD / KubeVela resource inspection

- **WHEN** a developer reads the usage rules
- **THEN** they SHALL find documented steps for navigating to and inspecting KubeVela
  Application and ComponentDefinition custom resources

#### Scenario: Devbox run script is documented

- **WHEN** a developer reads the usage rules
- **THEN** they SHALL find the exact command to launch the tool (e.g., `devbox run ui` or the
  binary name), including any required environment variables

### Requirement: Catalog entity for the selected tool

The selected tool SHALL have a Backstage catalog entity registered in the software catalog.

#### Scenario: Catalog entity is present

- **WHEN** a developer browses the Backstage catalog
- **THEN** they SHALL find a `Component` entity for the selected Kubernetes UI tool with kind,
  lifecycle, owner, and relevant links populated
