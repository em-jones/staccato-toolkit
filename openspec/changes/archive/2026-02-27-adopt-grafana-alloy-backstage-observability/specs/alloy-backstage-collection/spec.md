---
td-board: adopt-grafana-alloy-backstage-observability-alloy-backstage-collection
td-issue: td-bed357
---

# Specification: Alloy Backstage Collection

## Overview

Defines the requirements for configuring Backstage's OpenTelemetry Node.js SDK to target the Grafana Alloy agent endpoint, replacing any direct-to-backend OTLP exporters, and validating that all three signal types (logs, traces, metrics) are delivered end-to-end to their respective backends via Alloy.

## ADDED Requirements

### Requirement: Backstage OTLP exporter endpoint configuration

The Backstage OTel instrumentation (`packages/backend/src/instrumentation.js`) SHALL configure all OTLP exporters (traces, metrics, logs) to target the Alloy agent endpoint. The endpoint SHALL be configurable via environment variable `OTEL_EXPORTER_OTLP_ENDPOINT` with a default of `http://alloy.monitoring.svc.cluster.local:4318`.

#### Scenario: Exporter endpoint is configurable

- **WHEN** the environment variable `OTEL_EXPORTER_OTLP_ENDPOINT` is set
- **THEN** all OTLP exporters MUST use the provided value as their target endpoint

#### Scenario: Default endpoint targets Alloy

- **WHEN** `OTEL_EXPORTER_OTLP_ENDPOINT` is not set
- **THEN** all OTLP exporters MUST target `http://alloy.monitoring.svc.cluster.local:4318`

### Requirement: Logs forwarding to Loki via Alloy

Backstage backend log records exported via `@opentelemetry/exporter-logs-otlp-http` SHALL be received by Alloy and forwarded to Loki, appearing within 30 seconds of emission.

#### Scenario: Backstage log appears in Loki

- **WHEN** the Backstage backend emits a log record (e.g., on startup or handling a request)
- **THEN** Grafana Explore → Loki → `{service_name="backstage"}` MUST return that log line within 30 seconds

#### Scenario: Log resource attributes are preserved

- **WHEN** a log record is queried in Loki
- **THEN** the log MUST include the `service_name` resource attribute as a Loki label

### Requirement: Traces forwarding to Tempo via Alloy

Backstage backend spans exported via `@opentelemetry/exporter-trace-otlp-http` SHALL be received by Alloy and forwarded to Tempo, queryable within 10 seconds of the request completing.

#### Scenario: Backstage trace appears in Tempo

- **WHEN** the Backstage backend handles an HTTP request
- **THEN** Grafana Explore → Tempo → search by `service.name=backstage` MUST return the corresponding trace within 10 seconds

#### Scenario: Trace contains service name

- **WHEN** a Backstage trace is queried in Tempo
- **THEN** the root span MUST have `service.name` set to `backstage`

### Requirement: Metrics forwarding to Prometheus via Alloy

Backstage backend metrics exported via `@opentelemetry/exporter-metrics-otlp-http` (or `@opentelemetry/exporter-prometheus`) SHALL be received by Alloy and available in Prometheus within 60 seconds.

#### Scenario: Backstage metrics appear in Prometheus

- **WHEN** the Backstage backend has been running for at least 60 seconds
- **THEN** Prometheus MUST have at least one metric with label `service_name="backstage"` (e.g., `http_server_duration_milliseconds`)

#### Scenario: Metric labels include service name

- **WHEN** a Backstage metric is queried in Prometheus
- **THEN** the metric series MUST include a `service_name` label with value `backstage`
