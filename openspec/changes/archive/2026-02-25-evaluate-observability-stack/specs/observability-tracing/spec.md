---
td-board: evaluate-observability-stack-observability-tracing
td-issue: td-216e02
---

# Specification: Observability — Distributed Tracing

## Overview

Defines requirements for Grafana Tempo as the distributed tracing backend, with OpenTelemetry as the instrumentation standard for all Go services.

## ADDED Requirements

### Requirement: Tempo distributed tracing backend

The platform SHALL deploy Grafana Tempo to store and query distributed traces. Tempo MUST be integrated with Grafana as a data source. Trace retention SHALL be configurable (default: 72 hours for development, 30 days for production). Tempo MUST support TraceQL queries.

#### Scenario: Trace visible in Grafana

- **WHEN** a request spans multiple services with active OpenTelemetry spans
- **THEN** the full trace tree is visible in Grafana Explore via Tempo within 10 seconds of request completion

#### Scenario: Trace-to-log correlation

- **WHEN** a user inspects a trace in Grafana
- **THEN** related Loki logs (matching `trace_id`) are accessible via the "Logs for this span" link

### Requirement: OpenTelemetry trace SDK integration

All Go services SHALL use the OpenTelemetry Go SDK to instrument inbound and outbound HTTP/gRPC calls. Trace context MUST be propagated via W3C TraceContext headers. Services MUST export spans to the OpenTelemetry Collector via OTLP/gRPC. Sampling rate SHALL be configurable via environment variable `OTEL_TRACES_SAMPLER` (default: `parentbased_traceidratio` at 10% for production).

#### Scenario: Span created for inbound request

- **WHEN** a Go service receives an HTTP or gRPC request
- **THEN** an OpenTelemetry span is created with `http.method`, `http.route`, and `http.status_code` attributes

#### Scenario: Context propagated to downstream call

- **WHEN** a service makes an outbound HTTP call to another service
- **THEN** the W3C `traceparent` header is included and the downstream span is parented to the current span
