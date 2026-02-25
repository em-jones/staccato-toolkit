---
td-board: go-service-defaults-servicedefaults-logging
td-issue: td-4612f4
---

# Specification: Service Defaults — Logging Integration

## Overview

Defines slog integration via the otelslog bridge, replacing `slog.Default()` with a TraceHandler-wrapped logger that injects trace_id and span_id into every log record. Eliminates global logger variables in service code.

## ADDED Requirements

### Requirement: otelslog bridge for logs signal

The package MUST use `go.opentelemetry.io/contrib/bridges/otelslog` to create a LoggerProvider that bridges slog to OpenTelemetry logs. Logs MUST be exported via OTLP to the Collector alongside traces and metrics.

#### Scenario: Logs exported via OTLP

- **WHEN** a service logs via `slog.InfoContext(ctx, "message")`
- **THEN** the log record is sent to the OTLP logs endpoint
- **AND** the log appears in Loki with trace_id and span_id fields

### Requirement: Replace slog.Default with TraceHandler composition

The `Configure()` function MUST compose a TraceHandler (from `domain/pkg/telemetry/slog.go`) with the otelslog bridge handler. It SHALL call `slog.SetDefault()` with the composed handler. Services MUST NOT declare global `var logger *slog.Logger` variables; they SHALL use `slog.Default()` or `slog.With()` instead.

#### Scenario: Trace context injected into logs

- **WHEN** a log is emitted within an active span context
- **THEN** the log record includes `trace_id` and `span_id` attributes
- **AND** the log is correlated with the trace in Grafana

### Requirement: Log level configuration via environment

The package SHALL respect the `LOG_LEVEL` environment variable (values: `debug`, `info`, `warn`, `error`). Default SHALL be `info`. The base slog.Handler MUST be a JSONHandler writing to stdout.

#### Scenario: Debug logging enabled in dev

- **WHEN** `LOG_LEVEL=debug` and a service calls `slog.DebugContext(ctx, "debug message")`
- **THEN** the log is emitted and exported via OTLP

### Requirement: No global logger variable in service code

Services MUST NOT declare package-level `var logger *slog.Logger`. The `Configure()` function sets `slog.Default()`, and services access the logger via `slog.InfoContext()`, `slog.ErrorContext()`, etc. This eliminates nil logger issues in tests.

#### Scenario: Tests use default logger without TestMain

- **WHEN** a test calls `slog.InfoContext(ctx, "test log")` without calling `Configure()`
- **THEN** the log is emitted to stdout via the stdlib default handler (no panic)

### Requirement: Service name and version in logger attributes

The `Configure()` function SHALL create a logger with pre-configured attributes: `service` (serviceName), `version` (from `SERVICE_VERSION` env var, default `"dev"`), and `environment` (from `ENVIRONMENT` env var, default `"development"`).

#### Scenario: Service metadata in logs

- **WHEN** a service logs after calling `Configure(ctx, "staccato-server")`
- **THEN** every log record includes `service=staccato-server`, `version=<SERVICE_VERSION>`, and `environment=<ENVIRONMENT>`

## MODIFIED Requirements

### Requirement: TraceHandler remains in telemetry package

The existing `telemetry.TraceHandler` (in `domain/pkg/telemetry/slog.go`) SHALL remain unchanged. The `servicedefaults` package MUST import and compose it with the otelslog bridge handler.

## REMOVED Requirements

_None_
