---
td-board: instrument-services-service-observability-wiring
td-issue: td-821909
---

# Specification: Service Observability Wiring

## Overview

Both `staccato-server` and `staccato-cli` SHALL be instrumented with the OpenTelemetry Go SDK. Traces, metrics, and structured logs MUST be emitted from day one, following the patterns defined in `evaluate-observability-stack`.

## ADDED Requirements

### Requirement: OTel TracerProvider and MeterProvider initialization

Each Go service SHALL initialize an OpenTelemetry `TracerProvider` (exporting to OTel Collector via OTLP/gRPC on `localhost:4317`) and a `MeterProvider` (exporting via Prometheus exposition at `/metrics`). Both providers MUST be shut down gracefully on `SIGTERM`/`SIGINT`. The Collector endpoint MUST be configurable via `OTEL_EXPORTER_OTLP_ENDPOINT` env var (default: `localhost:4317`).

#### Scenario: TracerProvider connects to Collector

- **WHEN** the service starts and `OTEL_EXPORTER_OTLP_ENDPOINT` is set
- **THEN** the TracerProvider establishes a gRPC connection and spans are exported to the Collector

#### Scenario: Graceful shutdown flushes spans

- **WHEN** the service receives SIGTERM
- **THEN** the TracerProvider flush is called before exit and in-flight spans are exported

### Requirement: HTTP handler instrumentation with otelhttp

All HTTP handlers in `staccato-server` SHALL be wrapped with `otelhttp.NewHandler()` from `go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp`. Every inbound request MUST produce a span with `http.method`, `http.route`, `http.status_code`, and `http.target` attributes. The W3C `traceparent` header MUST be read and used to parent incoming spans.

#### Scenario: Inbound request creates span

- **WHEN** a client sends `GET /api/v1/status`
- **THEN** a span named `GET /api/v1/status` appears in Tempo with `http.status_code=200`

#### Scenario: Traceparent header propagates context

- **WHEN** a client sends a request with a valid W3C `traceparent` header
- **THEN** the server span is a child of the trace identified in the header

### Requirement: Structured logging with slog and trace_id injection

Both services SHALL use `log/slog` with a JSON handler for all log output. Every log record MUST include: `time` (RFC3339Nano), `level`, `service` (service name), `msg`. When a request context contains an active OTel span, the log record MUST also include `trace_id` (hex string) and `span_id`. The `LOG_LEVEL` environment variable MUST control the minimum log level (default: `info`).

#### Scenario: Log line includes required fields

- **WHEN** a service logs any message at any level
- **THEN** the JSON line contains `time`, `level`, `service`, and `msg`

#### Scenario: Trace context injected into logs

- **WHEN** a request with an active span is being handled and the handler logs a message
- **THEN** the log line includes `trace_id` matching the active span's trace ID
