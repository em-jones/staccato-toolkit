---
td-board: k8s-dev-observability-stack-deployment
td-issue: td-988060
---

# Specification: Observability Stack Deployment

## Overview

The full LGTM observability stack (Prometheus, Grafana, Loki, Tempo) and Grafana Alloy SHALL be deployed to the `monitoring` namespace of the dev cluster. Alloy serves as the unified telemetry collection agent, replacing both the standalone OpenTelemetry Collector and Promtail.

## ADDED Requirements

### Requirement: kube-prometheus-stack Helm deployment

`kube-prometheus-stack` SHALL be deployed to the `monitoring` namespace using the values file at `src/ops/observability/prometheus/values.yaml`. The release name SHALL be `kube-prometheus-stack`. Grafana SHALL be included and accessible via `kubectl port-forward`.

#### Scenario: Prometheus scrapes targets

- **WHEN** the kube-prometheus-stack is deployed and pods are Running
- **THEN** `kubectl port-forward svc/kube-prometheus-stack-prometheus 9090:9090 -n monitoring` exposes the Prometheus UI and the Targets page shows staccato-server as a scrape target

#### Scenario: Grafana is accessible

- **WHEN** the stack is deployed
- **THEN** `kubectl port-forward svc/kube-prometheus-stack-grafana 3000:80 -n monitoring` exposes Grafana at `http://localhost:3000` with the staccato-overview dashboard loaded

### Requirement: Tempo Helm deployment

Tempo SHALL be deployed using `grafana/tempo` chart to the `monitoring` namespace with values from `src/ops/observability/tempo/values.yaml`. The Grafana data source SHALL be pre-configured to point to Tempo.

#### Scenario: Traces visible in Grafana

- **WHEN** staccato-server handles a request
- **THEN** Grafana Explore → Tempo data source → search by service name returns the trace within 10 seconds

### Requirement: Remove OTel Collector DaemonSet

The standalone `opentelemetry-collector` Helm release SHALL be removed from the `monitoring` namespace and its values file SHALL be deleted from `src/ops/observability/`. Grafana Alloy replaces this role.

#### Scenario: OTel Collector is no longer running

- **WHEN** the observability stack is deployed with the updated scripts
- **THEN** `kubectl get pods -n monitoring` MUST NOT show any pod with `opentelemetry-collector` in its name

### Requirement: Remove Promtail DaemonSet

The `promtail` DaemonSet SHALL be removed from the `monitoring` namespace (disabled in `lgtm-stack-values.yaml`). Grafana Alloy's `loki.source.kubernetes` component handles all pod log collection.

#### Scenario: Promtail is no longer running

- **WHEN** the observability stack is deployed with the updated scripts
- **THEN** `kubectl get daemonset -n monitoring` MUST NOT show any DaemonSet named `promtail`

### Requirement: Update observability stack deployment scripts

The deployment script(s) at `src/ops/observability/` SHALL be updated to: (1) install `grafana/alloy` before other stack components, (2) skip installation of `opentelemetry-collector` and `loki-stack`/`promtail`, and (3) deploy Loki as a standalone chart if not already present.

#### Scenario: Stack deploys cleanly with Alloy

- **WHEN** the deployment script is executed against a fresh `monitoring` namespace
- **THEN** all components (Alloy, Loki, Tempo, Prometheus/Grafana) MUST reach Running state within 5 minutes
