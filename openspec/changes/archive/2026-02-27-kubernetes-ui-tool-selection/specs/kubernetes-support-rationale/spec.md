---
td-board: kubernetes-ui-tool-selection-kubernetes-support-rationale
td-issue: td-9659e7
---

# Specification: kubernetes-support-rationale (delta)

## Overview

Delta spec updating the existing `kubernetes-support-rationale` specification to reference the
selected Kubernetes web UI tool alongside k9s in the toolchain section.

## MODIFIED Requirements

### Requirement: Cluster UI tool is specified

The design document SHALL know that `k9s` is available as a terminal UI for navigating and
managing Kubernetes clusters during local development, AND that a web/graphical UI tool
(the tool selected by the `kubernetes-ui-tool-selection` change) is also available for
resource visualisation, CRD inspection, and onboarding workflows.

#### Scenario: CLI interaction tool is specified

- **WHEN** a developer reads the toolchain section
- **THEN** they SHALL know that `kubectl` is the standard CLI for interacting with Kubernetes
  clusters, and that it is a prerequisite for all other tooling

#### Scenario: Terminal UI tool is specified

- **WHEN** a developer reads the toolchain section
- **THEN** they SHALL know that `k9s` is available as a terminal UI for navigating and
  managing Kubernetes clusters during local development

#### Scenario: Web UI tool is specified

- **WHEN** a developer reads the toolchain section
- **THEN** they SHALL know which web/graphical UI tool is adopted for Kubernetes cluster
  visualisation, the rationale for its selection, and how to launch it in the devbox environment

#### Scenario: Alternatives are documented

- **WHEN** a developer reads the toolchain section
- **THEN** each tool choice SHALL document at least one rejected alternative and the reason for
  rejection, including the web UI alternatives considered (Headlamp, Lens, Octant, k8s Dashboard)
