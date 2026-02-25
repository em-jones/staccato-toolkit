---
td-board: instrument-services-with-observability
td-issue: td-713595
---

# Proposal: Instrument Services with Observability

## Why

`staccato-server` and `staccato-cli` are empty stubs. Before deploying to Kubernetes, they need real HTTP handlers and must be instrumented with the observability stack selected in `evaluate-observability-stack` — so that metrics, structured logs, and distributed traces flow to Prometheus, Loki, and Tempo from day one. Container images must also be built and published for Kubernetes deployment.

## What Changes

- Implement a minimal but real HTTP server in `staccato-server` (health check, `/metrics`, a stub API endpoint)
- Implement a minimal CLI in `staccato-cli` (health command that calls the server)
- Wire OpenTelemetry Go SDK into both services: traces, metrics, structured logging via `log/slog` with trace_id injection
- Add Dockerfiles for `staccato-server` and `staccato-cli`
- Extend Dagger `Build` task to produce OCI images (not just `go build`)
- Wire the OTel Collector config to route OTLP traffic from services to Prometheus/Loki/Tempo

## Capabilities

### New Capabilities

- `server-http-foundation`: `staccato-server` minimal HTTP service with health, metrics, and API endpoints
- `service-observability-wiring`: OTel SDK instrumentation in both services (traces, metrics, structured logs)
- `container-image-build`: Dockerfiles + Dagger `Build` producing OCI images for both services

### Modified Capabilities

_(none — all new)_

## Impact

- Affected services/modules: `staccato-server`, `staccato-cli`, `staccato-domain`, `src/ops/workloads` (Dagger pipeline)
- API changes: New — `staccato-server` exposes HTTP endpoints for the first time
- Data model changes: No
- Dependencies: `go.opentelemetry.io/otel`, `go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc`, `go.opentelemetry.io/otel/exporters/prometheus`, `go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp`, `prometheus/client_golang`
