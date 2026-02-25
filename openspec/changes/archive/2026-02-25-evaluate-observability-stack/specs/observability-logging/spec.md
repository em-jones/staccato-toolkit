---
td-board: evaluate-observability-stack-observability-logging
td-issue: td-801a09
---

# Specification: Observability — Logging

## Overview

Defines requirements for Loki-based log aggregation with Grafana as the query interface, and structured JSON log format as the platform standard.

## ADDED Requirements

### Requirement: Loki log aggregation

The platform SHALL deploy Grafana Loki to aggregate logs from all services. Log shipping MUST use Promtail or the OpenTelemetry Collector log pipeline. Loki MUST be configured with label-based indexing on `service`, `environment`, and `level` labels.

#### Scenario: Logs are queryable in Grafana

- **WHEN** a Go service emits a log line
- **THEN** the log is available in Grafana Explore via Loki within 30 seconds

#### Scenario: Log filtering by level

- **WHEN** a user queries Loki with `{level="error"}`
- **THEN** only error-level log lines are returned

### Requirement: Structured log format standard

All Go services SHALL emit logs as JSON objects using `log/slog` (stdlib) or `zerolog`. Every log line MUST include: `time` (RFC3339), `level`, `service`, `msg`, and a `trace_id` when a trace context is active. Log level SHALL be configurable via environment variable `LOG_LEVEL`.

#### Scenario: Log line includes required fields

- **WHEN** a service logs any message
- **THEN** the JSON object contains `time`, `level`, `service`, and `msg` fields

#### Scenario: Trace ID propagated to logs

- **WHEN** a request with an active OpenTelemetry span is being handled
- **THEN** the log line includes `trace_id` matching the active span's trace ID
