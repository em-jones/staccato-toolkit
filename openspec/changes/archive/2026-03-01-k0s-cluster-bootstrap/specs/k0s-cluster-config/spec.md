---
td-board: k0s-cluster-bootstrap-k0s-cluster-config
td-issue: td-a19f09
---

# Specification: k0s Cluster Config

## Overview

Defines the embedded k0sctl configuration assets stored in the `staccato-toolkit/core` Go package
via `embed.FS`. The config is templated per environment (local single-node, prod HA) and applied
by the CLI to provision a k0s cluster.

## ADDED Requirements

### Requirement: Embedded k0s config asset

The core Go package SHALL provide a k0sctl configuration YAML as an embedded asset at
`assets/bootstrap/k0s-config.yaml`, accessible via `embed.FS` without network access.

#### Scenario: Asset is accessible at runtime

- **WHEN** the CLI calls `core.BootstrapAssets.Open("bootstrap/k0s-config.yaml")`
- **THEN** the file is returned without error and contains valid k0sctl YAML

#### Scenario: Asset contains required k0sctl fields

- **WHEN** the config file is parsed
- **THEN** it contains `apiVersion`, `kind: Cluster`, `spec.hosts`, and `spec.k0s` sections

### Requirement: Single-node local variant

The embedded config SHALL define a single-node k0s cluster profile suitable for local development,
with the node acting as both controller and worker.

#### Scenario: Single-node config applies cleanly

- **WHEN** `k0sctl apply --config <single-node-config>` is run against a fresh local host
- **THEN** a k0s cluster is provisioned with one node in `Ready` state within 3 minutes

#### Scenario: Local config enables host networking for dev tooling

- **WHEN** the single-node config is applied
- **THEN** the cluster exposes ports 80 and 443 on the host for ingress (replacing KinD port mappings)

### Requirement: HA production variant

The core package SHALL provide a separate embedded HA config template
(`assets/bootstrap/k0s-config-ha.yaml`) for multi-node production deployments with at least 3
controllers.

#### Scenario: HA config template contains placeholder tokens

- **WHEN** the HA config is read
- **THEN** it contains `{{ .ControllerIPs }}` and `{{ .WorkerIPs }}` template tokens resolvable
  by the CLI's `bootstrap init --env prod` command

### Requirement: Config templating via CLI

The CLI SHALL template the embedded k0s config at bootstrap time, substituting environment-specific
values (node IPs, cluster name, SANs) before passing it to `k0sctl apply`.

#### Scenario: Templated config passed to k0sctl

- **WHEN** `staccato bootstrap init --env local` is run
- **THEN** the CLI renders the embedded template with local defaults and passes the result to
  `k0sctl apply` via stdin or a temp file

#### Scenario: Invalid template values produce a descriptive error

- **WHEN** a required template token (e.g. `ControllerIPs`) is missing for the prod profile
- **THEN** the CLI exits with a non-zero code and prints which token is missing
