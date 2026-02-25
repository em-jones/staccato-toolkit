---
td-board: k8s-dev-observability-stack-deployment
td-issue: td-988060
---

# Specification: Observability Stack Deployment

## Overview

The full LGTM observability stack (Prometheus, Grafana, Loki, Tempo) and the OpenTelemetry Collector SHALL be deployed to the `monitoring` namespace of the dev cluster using the Helm values defined in `evaluate-observability-stack`.

## ADDED Requirements

### Requirement: kube-prometheus-stack Helm deployment

`kube-prometheus-stack` SHALL be deployed to the `monitoring` namespace using the values file at `src/ops/observability/prometheus/values.yaml`. The release name SHALL be `kube-prometheus-stack`. Grafana SHALL be included and accessible via `kubectl port-forward`.

#### Scenario: Prometheus scrapes targets

- **WHEN** the kube-prometheus-stack is deployed and pods are Running
- **THEN** `kubectl port-forward svc/kube-prometheus-stack-prometheus 9090:9090 -n monitoring` exposes the Prometheus UI and the Targets page shows staccato-server as a scrape target

#### Scenario: Grafana is accessible

- **WHEN** the stack is deployed
- **THEN** `kubectl port-forward svc/kube-prometheus-stack-grafana 3000:80 -n monitoring` exposes Grafana at `http://localhost:3000` with the staccato-overview dashboard loaded

### Requirement: Loki and Promtail Helm deployment

Loki SHALL be deployed using `grafana/loki-stack` chart to the `monitoring` namespace with values from `src/ops/observability/loki/values.yaml`. Promtail SHALL be deployed as a DaemonSet. Log labels SHALL include `service`, `namespace`, and `pod`.

#### Scenario: Logs queryable in Grafana

- **WHEN** staccato-server is running and emitting JSON logs
- **THEN** Grafana Explore → Loki data source → `{namespace="staccato"}` returns log lines within 30 seconds

### Requirement: Tempo Helm deployment

Tempo SHALL be deployed using `grafana/tempo` chart to the `monitoring` namespace with values from `src/ops/observability/tempo/values.yaml`. The Grafana data source SHALL be pre-configured to point to Tempo.

#### Scenario: Traces visible in Grafana

- **WHEN** staccato-server handles a request
- **THEN** Grafana Explore → Tempo data source → search by service name returns the trace within 10 seconds

### Requirement: OTel Collector DaemonSet deployment

The OpenTelemetry Collector SHALL be deployed as a DaemonSet to the `monitoring` namespace. It SHALL receive OTLP/gRPC on port 4317 and route: traces → Tempo, metrics → Prometheus remote_write, logs → Loki. The Collector config SHALL be stored as a ConfigMap.

#### Scenario: Collector routes spans to Tempo

- **WHEN** staccato-server emits a span via OTLP/gRPC to the Collector
- **THEN** the span appears in Tempo within 5 seconds

#### Scenario: Collector routes logs to Loki

- **WHEN** staccato-server emits a JSON log line via OTLP logs pipeline
- **THEN** the log appears in Loki within 30 seconds
