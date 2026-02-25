---
td-board: adopt-grafana-alloy-backstage-observability-observability-stack-deployment
td-issue: td-bfd9ee
---

# Specification: Observability Stack Deployment (delta)

## Overview

Delta spec against the existing `observability-stack-deployment` spec. Replaces the standalone OpenTelemetry Collector DaemonSet and Promtail DaemonSet with Grafana Alloy, updating Helm values and deployment scripts accordingly.

## REMOVED Requirements

### Requirement: OTel Collector DaemonSet deployment

**Reason**: Grafana Alloy subsumes the OTel Collector's role. Alloy receives OTLP natively and routes signals to all backends, eliminating the need for a separate OTel Collector.

**Migration**: Remove the `opentelemetry-collector` Helm release from `src/ops/observability/`. Any OTLP endpoint references previously pointing to the OTel Collector MUST be updated to point to the Alloy agent endpoint (`alloy.monitoring.svc.cluster.local:4318`).

### Requirement: Loki and Promtail Helm deployment

**Reason**: Grafana Alloy replaces Promtail for Kubernetes pod log collection using the `loki.source.kubernetes` component. Loki itself remains but is now fed exclusively by Alloy.

**Migration**: Remove the `loki-stack` Helm release (which includes Promtail). Loki MAY be deployed as a standalone chart (`grafana/loki`) without the bundled Promtail. Alloy handles all log collection.

## ADDED Requirements

### Requirement: Remove OTel Collector DaemonSet

The standalone `opentelemetry-collector` Helm release SHALL be removed from the `monitoring` namespace and its values file SHALL be deleted from `src/ops/observability/`.

#### Scenario: OTel Collector is no longer running

- **WHEN** the observability stack is deployed with the updated scripts
- **THEN** `kubectl get pods -n monitoring` MUST NOT show any pod with `opentelemetry-collector` in its name

### Requirement: Remove Promtail DaemonSet

The `promtail` DaemonSet SHALL be removed from the `monitoring` namespace (by removing it from the `loki-stack` values or uninstalling the chart).

#### Scenario: Promtail is no longer running

- **WHEN** the observability stack is deployed with the updated scripts
- **THEN** `kubectl get daemonset -n monitoring` MUST NOT show any DaemonSet named `promtail`

### Requirement: Update observability stack deployment scripts

The deployment script(s) at `src/ops/observability/` SHALL be updated to: (1) install `grafana/alloy` before other stack components, (2) skip installation of `opentelemetry-collector` and `loki-stack`/`promtail`, and (3) deploy Loki as a standalone chart if not already present.

#### Scenario: Stack deploys cleanly with Alloy

- **WHEN** the deployment script is executed against a fresh `monitoring` namespace
- **THEN** all components (Alloy, Loki, Tempo, Prometheus/Grafana) MUST reach Running state within 5 minutes
