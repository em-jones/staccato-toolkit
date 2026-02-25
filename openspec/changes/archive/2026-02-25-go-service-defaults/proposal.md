---
td-board: go-service-defaults
td-issue: td-e773c7
---

# Proposal: Go Service Defaults Package

## Why

The platform lacks a unified initialization pattern for Go services. Each service manually wires observability signals, health checks, and HTTP defaults, leading to scattered initialization code across `staccato-server` and `staccato-cli`. Current problems:

- **Eager OTLP dial blocks development**: `telemetry.InitTelemetry()` dials the OTLP gRPC endpoint synchronously (line 95 in `telemetry.go`). If the Collector is not running locally, services fail to start or hang during init.
- **Global logger anti-pattern**: `server/main.go` declares `var logger *slog.Logger` at package scope (line 18), which is nil in tests and requires TestMain workarounds.
- **No OTel logs signal**: Logs go to stdout only; no integration with the OTLP logs exporter. The otelslog bridge is not wired.
- **No env-aware behavior**: No check for `OTEL_SDK_DISABLED` or `OTEL_EXPORTER_OTLP_ENDPOINT`. OTel always initializes, even in dev environments without a Collector.
- **No HTTP client defaults**: Outbound HTTP calls lack OTel transport instrumentation and consistent timeout/retry configuration.
- **Manual graceful shutdown**: Each service's main() manually wires signal handling and shutdown logic (lines 82-97 in `server/main.go`).

As services multiply, this divergence will worsen. The platform needs a `.NET Aspire AddServiceDefaults()` analog: a single `Configure()` call that sets up all observability signals, health checks, and HTTP defaults in one shot.

## What Changes

- Create `staccato-domain/pkg/servicedefaults` package with a `Configure()` function
- Wire TracerProvider, MeterProvider, and LoggerProvider (otelslog bridge) with non-blocking OTLP dial
- Replace `slog.Default()` with a TraceHandler-wrapped logger (no global var in service code)
- Add env-aware initialization: skip OTel setup if `OTEL_SDK_DISABLED=true` or `OTEL_EXPORTER_OTLP_ENDPOINT` is unset
- Provide `NewHTTPClient()` helper with OTel transport and configurable timeouts
- Return single shutdown function that tears down all three providers
- Update `server/main.go` and `cli/main.go` to replace `telemetry.InitTelemetry()` with `servicedefaults.Configure()`

## Capabilities

### New Capabilities

- `servicedefaults-core`: The `Configure(ctx, serviceName, ...opts)` function that initializes TracerProvider, MeterProvider, and LoggerProvider. Non-blocking OTLP dial with reconnect. Env-aware (OTEL_SDK_DISABLED check). Returns unified shutdown function.

- `servicedefaults-logging`: slog integration via otelslog bridge. Replaces `slog.Default()` with a TraceHandler-wrapped logger that injects trace_id and span_id. No global logger variable in service code.

- `servicedefaults-http-client`: `NewHTTPClient(opts...)` helper that returns `*http.Client` with otelhttp.NewTransport() for automatic span creation on outbound calls. Configurable timeouts and retry behavior.

### Modified Capabilities

- `telemetry-init`: Deprecated in favor of `servicedefaults.Configure()`. Existing `telemetry.InitTelemetry()` will be marked deprecated and removed in a future change.

## Impact

- Affected services: `staccato-server`, `staccato-cli` (immediate), all future Go services
- API changes: Public API is `servicedefaults.Configure()` and `servicedefaults.NewHTTPClient()`. Internal telemetry.InitTelemetry() becomes deprecated.
- Data model changes: None
- Dependencies: Add `go.opentelemetry.io/contrib/bridges/otelslog` for logs signal integration
- Observability: All three signals (traces, metrics, logs) wired via OTLP. Trace-to-log correlation enabled. Non-blocking dial eliminates dev environment startup failures.

## Prerequisites

This change depends on:
- `select-go-server-framework`: Framework decision informs HTTP handler middleware wiring
- `select-go-logging-library`: Logging library decision informs slog/otelslog integration approach
