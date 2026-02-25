---
td-board: helm-release-management-observability-helm-releases
td-issue: td-f33fbd
---

# Specification: Observability Helm Releases

## Overview

Defines the `HelmRelease` CRDs for the full observability stack — kube-prometheus-stack, Loki, Tempo, and Grafana Alloy — committed to `staccato-manifests/platform/local/k8s/monitoring/`. Flux reconciles these releases to install and maintain the stack without manual `helm install` invocations.

## ADDED Requirements

### Requirement: kube-prometheus-stack HelmRelease

A `HelmRelease` named `kube-prometheus-stack` SHALL be committed to `staccato-manifests/platform/local/k8s/monitoring/` referencing the `prometheus-community/kube-prometheus-stack` chart. The release SHALL pin a specific chart version, set `spec.targetNamespace: monitoring`, configure `spec.upgrade.remediation.remediateLastFailure: true` and `spec.upgrade.remediation.retries: 3`, and embed values equivalent to `src/ops/observability/prometheus/values.yaml` in `spec.values`.

#### Scenario: kube-prometheus-stack installed by Flux

- **WHEN** Flux reconciles the `kube-prometheus-stack` HelmRelease in namespace `monitoring`
- **THEN** `flux get helmreleases -n monitoring kube-prometheus-stack` SHALL report `Ready=True`
- **AND** `kubectl get pods -n monitoring` SHALL show prometheus-stack pods in Running state

#### Scenario: Grafana accessible via port-forward

- **WHEN** the `kube-prometheus-stack` HelmRelease is Ready
- **THEN** `kubectl port-forward svc/kube-prometheus-stack-grafana 3000:80 -n monitoring` SHALL expose Grafana at `http://localhost:3000`

#### Scenario: Upgrade remediation configured

- **WHEN** the HelmRelease is authored
- **THEN** `spec.upgrade.remediation.remediateLastFailure` SHALL be `true` and `spec.upgrade.remediation.retries` SHALL be `3`

### Requirement: Loki HelmRelease

A `HelmRelease` named `loki` SHALL be committed to `staccato-manifests/platform/local/k8s/monitoring/` referencing `grafana/loki`. The release SHALL pin a chart version, target the `monitoring` namespace, and embed values for single-binary mode suitable for local development.

#### Scenario: Loki installed by Flux

- **WHEN** Flux reconciles the `loki` HelmRelease
- **THEN** `flux get helmreleases -n monitoring loki` SHALL report `Ready=True`
- **AND** a Loki pod SHALL be Running in the `monitoring` namespace

#### Scenario: Loki data source pre-configured in Grafana

- **WHEN** the loki HelmRelease is Ready and Grafana is accessible
- **THEN** Grafana data sources SHALL include a Loki source pointing at `http://loki:3100`

### Requirement: Tempo HelmRelease

A `HelmRelease` named `tempo` SHALL be committed to `staccato-manifests/platform/local/k8s/monitoring/` referencing `grafana/tempo`. The release SHALL pin a chart version, target the `monitoring` namespace, and embed values equivalent to `src/ops/observability/tempo/values.yaml`.

#### Scenario: Tempo installed by Flux

- **WHEN** Flux reconciles the `tempo` HelmRelease
- **THEN** `flux get helmreleases -n monitoring tempo` SHALL report `Ready=True`

#### Scenario: Tempo data source pre-configured in Grafana

- **WHEN** the tempo HelmRelease is Ready and Grafana is accessible
- **THEN** Grafana data sources SHALL include a Tempo source pointing at `http://tempo:3100`

### Requirement: Grafana Alloy HelmRelease

A `HelmRelease` named `alloy` SHALL be committed to `staccato-manifests/platform/local/k8s/monitoring/` referencing `grafana/alloy`. The release SHALL pin a chart version, target the `monitoring` namespace, and embed values configuring Alloy as the unified telemetry collection agent (replacing OTel Collector and Promtail).

#### Scenario: Alloy installed by Flux

- **WHEN** Flux reconciles the `alloy` HelmRelease
- **THEN** `flux get helmreleases -n monitoring alloy` SHALL report `Ready=True`
- **AND** no pod named `opentelemetry-collector` or `promtail` SHALL exist in the `monitoring` namespace

#### Scenario: Alloy receives OTLP traces

- **WHEN** staccato-server emits an OTLP trace
- **THEN** Alloy forwards the trace to Tempo within 10 seconds

### Requirement: Observability HelmRelease version pinning

All observability `HelmRelease` objects SHALL use exact chart version strings (e.g., `61.3.0` for kube-prometheus-stack). Floating ranges or `latest` are prohibited.

#### Scenario: Version string is exact

- **WHEN** any observability HelmRelease is committed
- **THEN** `spec.chart.spec.version` MUST match an exact semver string with no wildcards or range operators

### Requirement: Remove observability helm install scripts

The shell scripts under `src/ops/observability/` that call `helm install`/`helm upgrade` directly SHALL be removed or rewritten to only perform pre-flight checks and Flux readiness polling. No direct `helm install` invocations SHALL remain.

#### Scenario: No helm install calls in observability scripts

- **WHEN** `src/ops/observability/` is inspected after migration
- **THEN** no file SHALL contain `helm install` or `helm upgrade` commands targeting the observability charts
