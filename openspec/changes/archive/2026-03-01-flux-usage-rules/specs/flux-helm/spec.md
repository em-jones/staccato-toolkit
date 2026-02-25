---
td-board: flux-usage-rules-helm
td-issue: td-371469
---

# Specification: Flux Helm (HelmRepository & HelmRelease)

## Overview

Defines rules for deploying third-party Helm charts via Flux v2 `HelmRelease` CRDs. Use cases include the observability stack (Grafana, Prometheus, Loki, Tempo), Gitea, and any other externally maintained chart. These rules govern naming, version pinning, value configuration, upgrade remediation, and source referencing.

## ADDED Requirements

### Requirement: HelmRelease naming and namespace conventions

`HelmRelease` resources SHALL be named using the pattern `<chart-name>` or `<chart-name>-<variant>` (e.g., `grafana`, `prometheus-stack`, `gitea`). They SHALL be placed in the namespace where the chart's workloads will run (e.g., `monitoring`, `gitea`), not in `flux-system`.

#### Scenario: HelmRelease naming

- **WHEN** a `HelmRelease` is created for a third-party chart
- **THEN** `metadata.name` SHALL match the chart name in kebab-case, optionally suffixed with a variant

#### Scenario: HelmRelease target namespace

- **WHEN** a `HelmRelease` is created
- **THEN** `spec.targetNamespace` SHALL be the namespace where chart workloads run, and `metadata.namespace` SHALL be the same namespace or `flux-system`

#### Scenario: Namespace pre-creation

- **WHEN** the target namespace does not exist
- **THEN** a separate `Kustomization` MUST create the namespace before the `HelmRelease` reconciles (via `spec.dependsOn`)

### Requirement: HelmRelease version pinning

All `HelmRelease` resources SHALL pin the chart version via `spec.chart.spec.version`. Floating version ranges (e.g., `>=1.0.0`) are prohibited in production. SemVer ranges like `~1.2` (patch-level updates only) are permitted in development environments.

#### Scenario: Production version pin

- **WHEN** a `HelmRelease` targets a production cluster
- **THEN** `spec.chart.spec.version` MUST be an exact version string (e.g., `7.3.11`)

#### Scenario: Development semver range

- **WHEN** a `HelmRelease` targets a development/local cluster
- **THEN** `spec.chart.spec.version` MAY use a patch-level semver range (e.g., `~7.3`)

#### Scenario: No floating latest

- **WHEN** any `HelmRelease` is authored
- **THEN** `spec.chart.spec.version` MUST NOT be `*`, `latest`, or a broad range like `>=1.0.0`

### Requirement: HelmRelease value overrides

Chart value overrides SHALL be declared in `spec.values` (inline) for small overrides (fewer than 20 keys) or in `spec.valuesFrom` referencing a `ConfigMap` for larger configurations. Values MUST NOT contain secrets; secrets SHALL be injected via `spec.valuesFrom` referencing a `Secret`.

#### Scenario: Inline values for small overrides

- **WHEN** the number of customized values is fewer than 20
- **THEN** overrides SHALL be placed inline in `spec.values`

#### Scenario: ConfigMap for large value sets

- **WHEN** the number of customized values is 20 or more
- **THEN** overrides SHALL be stored in a `ConfigMap` and referenced via `spec.valuesFrom`

#### Scenario: No secrets in spec.values

- **WHEN** a chart requires secret values (passwords, tokens)
- **THEN** the secret values MUST NOT appear in `spec.values`; they SHALL be referenced via `spec.valuesFrom` with a `Secret` source

### Requirement: HelmRelease upgrade remediation

All `HelmRelease` resources SHALL declare `spec.upgrade.remediation` with `remediateLastFailure: true` and `retries: 3`. This ensures Flux automatically rolls back failed upgrades rather than leaving releases in a broken state.

#### Scenario: Upgrade remediation configured

- **WHEN** a `HelmRelease` is created
- **THEN** `spec.upgrade.remediation.remediateLastFailure` SHALL be `true` and `spec.upgrade.remediation.retries` SHALL be `3`

#### Scenario: Rollback on failure

- **WHEN** a chart upgrade fails after exhausting retries
- **THEN** Flux SHALL automatically roll back to the previous successful release

#### Scenario: Install remediation

- **WHEN** a chart initial installation fails
- **THEN** `spec.install.remediation.retries` SHALL be set to `3` to allow Flux to retry

### Requirement: HelmRelease source reference pattern

`HelmRelease` resources SHALL reference their chart source via `spec.chart.spec.sourceRef`. The `sourceRef` MUST point to a `HelmRepository` in `flux-system`. Cross-namespace source references SHALL use `spec.chart.spec.sourceRef.namespace: flux-system`.

#### Scenario: Source reference to flux-system

- **WHEN** a `HelmRelease` references a `HelmRepository`
- **THEN** `spec.chart.spec.sourceRef.namespace` SHALL be `flux-system`

#### Scenario: Chart interval

- **WHEN** a `HelmRelease` is created
- **THEN** `spec.chart.spec.interval` SHALL be set to `10m` to match the `HelmRepository` polling interval
