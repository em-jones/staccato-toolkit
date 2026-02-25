---
td-board: helm-release-management-helmrepository-sources
td-issue: td-dec80b
---

# Specification: HelmRepository Sources

## Overview

Defines the `HelmRepository` CRDs that must be committed to `staccato-manifests` to serve as Flux source references for all third-party Helm charts used in the platform. Each `HelmRepository` registers an upstream Helm registry URL in `flux-system` so that `HelmRelease` objects can resolve chart sources without inline registry configuration.

## ADDED Requirements

### Requirement: grafana HelmRepository

A `HelmRepository` named `grafana` SHALL be committed to `staccato-manifests/platform/local/k8s/flux-system/` with `spec.url: https://grafana.github.io/helm-charts` and `spec.interval: 10m`. This source covers the Loki, Tempo, and Grafana Alloy charts.

#### Scenario: Grafana repo resolves

- **WHEN** Flux reconciles the `grafana` HelmRepository in `flux-system`
- **THEN** `flux get sources helm -n flux-system grafana` reports `Ready=True` and the last fetched revision is populated

#### Scenario: Polling interval respected

- **WHEN** the HelmRepository is created
- **THEN** `spec.interval` SHALL be `10m`

### Requirement: prometheus-community HelmRepository

A `HelmRepository` named `prometheus-community` SHALL be committed to `staccato-manifests/platform/local/k8s/flux-system/` with `spec.url: https://prometheus-community.github.io/helm-charts` and `spec.interval: 10m`. This source covers the `kube-prometheus-stack` chart.

#### Scenario: prometheus-community repo resolves

- **WHEN** Flux reconciles the `prometheus-community` HelmRepository in `flux-system`
- **THEN** `flux get sources helm -n flux-system prometheus-community` reports `Ready=True`

### Requirement: gitea-charts HelmRepository

A `HelmRepository` named `gitea-charts` SHALL be committed to `staccato-manifests/platform/local/k8s/flux-system/` with `spec.url: https://dl.gitea.com/charts/` and `spec.interval: 10m`. This source covers the Gitea chart.

#### Scenario: gitea-charts repo resolves

- **WHEN** Flux reconciles the `gitea-charts` HelmRepository in `flux-system`
- **THEN** `flux get sources helm -n flux-system gitea-charts` reports `Ready=True`

### Requirement: HelmRepository namespace placement

All `HelmRepository` objects SHALL be created in the `flux-system` namespace. `HelmRelease` objects in other namespaces (e.g., `monitoring`, `gitea`) SHALL reference them via `spec.chart.spec.sourceRef.namespace: flux-system`.

#### Scenario: Cross-namespace source reference

- **WHEN** a HelmRelease in namespace `monitoring` references a HelmRepository
- **THEN** `spec.chart.spec.sourceRef.namespace` SHALL be `flux-system`
- **AND** the HelmRelease SHALL be able to resolve the chart without error
