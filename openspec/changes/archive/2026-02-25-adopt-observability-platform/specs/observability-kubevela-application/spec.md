---
td-board: adopt-observability-platform-observability-kubevela-application
td-issue: td-245c57
---

# Specification: Observability KubeVela Application

## Overview

Defines requirements for the KubeVela OAM Application manifest that provisions the observability stack (kube-prometheus-stack + Loki + Tempo) in a Kubernetes cluster. This is the first example of a platform component defined as an OAM Application, establishing the pattern.

## ADDED Requirements

### Requirement: Observability stack is defined as a KubeVela OAM Application

The observability platform SHALL be declared as a KubeVela Application manifest so that it can be provisioned, updated, and removed using the KubeVela component platform rather than ad-hoc helm commands.

#### Scenario: OAM Application manifest exists

- **WHEN** a developer looks in the `infra/observability/` directory
- **THEN** they SHALL find an OAM Application YAML file that declares the observability stack components (kube-prometheus-stack, Loki, Tempo)

#### Scenario: Application provisions via vela apply

- **WHEN** a developer runs `vela up -f infra/observability/application.yaml`
- **THEN** KubeVela SHALL provision the observability stack components on the cluster

### Requirement: Each observability tool is a separate OAM HelmRelease component

The OAM Application SHALL decompose the observability stack into separate HelmRelease components (one per tool), each referencing a pinned helm chart version.

#### Scenario: Helm chart versions are pinned

- **WHEN** a reviewer reads the OAM Application manifest
- **THEN** each HelmRelease component SHALL specify a pinned chart version and a values file, following the rendered manifests pattern

### Requirement: Observability stack configuration is committed to the repository

Helm values files for each component (Prometheus, Grafana, Loki, Tempo) SHALL be committed to the repository under `infra/observability/` so the installation is reproducible and auditable.

#### Scenario: Values files exist for each tool

- **WHEN** a reviewer reads the `infra/observability/` directory
- **THEN** they SHALL find a separate values file for each tool (e.g., `prometheus-values.yaml`, `grafana-values.yaml`, `loki-values.yaml`, `tempo-values.yaml`)
