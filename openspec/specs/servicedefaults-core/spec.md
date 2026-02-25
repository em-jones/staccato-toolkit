---
td-board: go-service-defaults-servicedefaults-core
td-issue: td-0442ba
---

# Specification: Service Defaults — Core Initialization

## Overview

Defines the `Configure()` function that initializes OpenTelemetry TracerProvider, MeterProvider, and LoggerProvider in a single call. Provides non-blocking OTLP dial with reconnect, env-aware behavior (OTEL_SDK_DISABLED check), and unified shutdown.

## ADDED Requirements

### Requirement: Configure function initializes all OTel providers

The package SHALL export a `Configure(ctx context.Context, serviceName string, opts ...Option) (shutdown func(context.Context) error, err error)` function. It MUST initialize TracerProvider, MeterProvider, and LoggerProvider. It MUST set global OTel providers via `otel.SetTracerProvider()`, `otel.SetMeterProvider()`, and configure `slog.Default()` with the LoggerProvider bridge. It SHALL return a single shutdown function that tears down all three providers in reverse order.

#### Scenario: Service calls Configure and all providers are initialized

- **WHEN** a service calls `servicedefaults.Configure(ctx, "my-service")`
- **THEN** `otel.GetTracerProvider()`, `otel.GetMeterProvider()`, and `slog.Default()` are all configured
- **AND** a shutdown function is returned

### Requirement: Non-blocking OTLP dial with reconnect

The TracerProvider OTLP exporter MUST use `otlptracegrpc.WithReconnectPeriod()` to enable non-blocking dial. The exporter SHALL NOT block service startup if the Collector is unreachable. It MUST attempt reconnection in the background.

#### Scenario: Service starts without Collector running

- **WHEN** `Configure()` is called and the OTLP endpoint is not reachable
- **THEN** the function returns successfully without blocking
- **AND** spans are buffered until the Collector becomes available

### Requirement: Env-aware initialization with OTEL_SDK_DISABLED

The package SHALL check the `OTEL_SDK_DISABLED` environment variable. If set to `"true"`, `Configure()` MUST skip all OTel provider initialization and return a no-op shutdown function. This allows dev environments to run without a Collector.

#### Scenario: OTel disabled in dev environment

- **WHEN** `OTEL_SDK_DISABLED=true` and `Configure()` is called
- **THEN** no TracerProvider, MeterProvider, or LoggerProvider is initialized
- **AND** the returned shutdown function is a no-op

### Requirement: Env-aware OTLP endpoint check

If `OTEL_EXPORTER_OTLP_ENDPOINT` is unset or empty, the package SHALL default to `localhost:4317` for development. It MUST NOT fail if the endpoint is unreachable (non-blocking dial).

#### Scenario: Default OTLP endpoint used

- **WHEN** `OTEL_EXPORTER_OTLP_ENDPOINT` is not set
- **THEN** the OTLP exporter defaults to `localhost:4317`

### Requirement: Env-aware sampling configuration

The TracerProvider MUST respect `OTEL_TRACES_SAMPLER` and `OTEL_TRACES_SAMPLER_ARG` environment variables. Default SHALL be `parentbased_traceidratio` with 10% sampling (`0.1`). In development, services MAY set `OTEL_TRACES_SAMPLER=always_on` for 100% sampling.

#### Scenario: Production sampling at 10%

- **WHEN** `OTEL_TRACES_SAMPLER=parentbased_traceidratio` and `OTEL_TRACES_SAMPLER_ARG=0.1`
- **THEN** root spans are sampled at 10% and child spans respect parent sampling decisions

### Requirement: Unified shutdown function

The returned shutdown function MUST call `Shutdown(ctx)` on TracerProvider, MeterProvider, and LoggerProvider in reverse initialization order. It SHALL aggregate errors from all three shutdowns and return a combined error if any fail.

#### Scenario: Graceful shutdown flushes all signals

- **WHEN** the shutdown function is called with a 5-second timeout context
- **THEN** all pending spans, metrics, and logs are flushed before the function returns
- **AND** if any provider shutdown fails, the error is returned

### Requirement: W3C TraceContext propagation

The package MUST register W3C TraceContext and Baggage propagators via `otel.SetTextMapPropagator()`. This enables cross-service trace context propagation.

#### Scenario: Trace context propagated across services

- **WHEN** a service makes an outbound HTTP call with OTel instrumentation
- **THEN** the `traceparent` header is included in the request
- **AND** the downstream service can extract the trace context

## MODIFIED Requirements

_None - this is a new capability_

## REMOVED Requirements

_None_
