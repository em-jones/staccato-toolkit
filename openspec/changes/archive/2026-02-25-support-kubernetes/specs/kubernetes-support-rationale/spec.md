---
td-board: support-kubernetes-kubernetes-support-rationale
td-issue: td-ca36e0
---

# Specification: Kubernetes Support Rationale

## Overview

This spec defines the requirements for the design document that makes the case for adopting Kubernetes as the standard runtime target for the platform toolkit, and establishes the canonical set of tools to support it. The output is an ADR-style design document, not runtime code.

## ADDED Requirements

### Requirement: Kubernetes adoption rationale is documented

The platform toolkit SHALL include a design document that articulates why Kubernetes is the appropriate runtime target for this project, covering the problem it solves, the alternatives considered, and the decision outcome.

#### Scenario: Rationale addresses platform toolkit context

- **WHEN** a developer or architect reads the design document
- **THEN** they SHALL understand why a platform toolkit specifically benefits from Kubernetes support (e.g., standardised workload scheduling, declarative infrastructure, ecosystem maturity, CNCF alignment)

#### Scenario: Rationale addresses current state

- **WHEN** the document is written
- **THEN** it SHALL describe the current state of the project (devbox-based, Dagger CI, Go monorepo) and explain how Kubernetes complements rather than replaces those choices

### Requirement: Kubernetes toolchain is defined

The design document SHALL enumerate the canonical set of Kubernetes tools adopted by the platform toolkit and specify the role of each tool.

#### Scenario: Local cluster tool is specified

- **WHEN** a developer reads the toolchain section
- **THEN** they SHALL know which tool is used to run a local Kubernetes cluster (e.g., `kind` — Kubernetes IN Docker) and why it was chosen over alternatives (e.g., minikube, k3d)

#### Scenario: Package management tool is specified

- **WHEN** a developer reads the toolchain section
- **THEN** they SHALL know that `helm` is used for packaging and deploying applications to Kubernetes clusters, and understand its role in the platform delivery workflow

#### Scenario: CLI interaction tool is specified

- **WHEN** a developer reads the toolchain section
- **THEN** they SHALL know that `kubectl` is the standard CLI for interacting with Kubernetes clusters, and that it is a prerequisite for all other tooling

#### Scenario: Cluster UI tool is specified

- **WHEN** a developer reads the toolchain section
- **THEN** they SHALL know that `k9s` is available as a terminal UI for navigating and managing Kubernetes clusters during local development

#### Scenario: Development workflow tool is specified

- **WHEN** a developer reads the toolchain section
- **THEN** they SHALL know that `skaffold` is available for iterative local development workflows (build → push → deploy) against a local cluster

#### Scenario: Alternatives are documented

- **WHEN** a developer reads the toolchain section
- **THEN** each tool choice SHALL document at least one rejected alternative and the reason for rejection

### Requirement: Local development cluster strategy is defined

The design document SHALL define the strategy for running Kubernetes locally during development, including cluster lifecycle management and developer ergonomics.

#### Scenario: Cluster creation and teardown is described

- **WHEN** a developer reads the local development section
- **THEN** they SHALL understand how to create and destroy a local Kubernetes cluster using the chosen tool (`kind`) and how this fits into the devbox workflow

#### Scenario: Integration with devbox is addressed

- **WHEN** a developer reads the local development section
- **THEN** the design SHALL explain how Kubernetes tooling will be added to `devbox.json` so that all cluster tooling is available in a reproducible shell environment

### Requirement: CI integration surface is outlined

The design document SHALL describe at a high level how Kubernetes will be used in CI pipelines (e.g., Dagger pipelines deploying to a kind cluster for integration tests), without prescribing implementation details left to follow-on changes.

#### Scenario: CI strategy is described

- **WHEN** a developer reads the CI section
- **THEN** they SHALL understand the intended role of Kubernetes in CI (e.g., running integration tests against a cluster, validating helm charts) and how this aligns with the existing Dagger-based CI approach
