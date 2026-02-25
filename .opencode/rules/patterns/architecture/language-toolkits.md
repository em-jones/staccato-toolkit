---
created-by-change: language-toolkit-pattern
last-validated: 2026-02-25
---

# Language Toolkit Pattern Rules

_Unified, single-call initialisation of platform cross-cutting concerns (logging, tracing, metrics, HTTP client defaults) for every language runtime on the platform._

## Core Principle

Every service on the platform must initialise the same set of cross-cutting concerns in a consistent, single-call manner regardless of the language runtime. A **language toolkit** is a language-specific package that provides this unified entry point, abstracting away the complexity of configuring multiple observability signals and HTTP client defaults. The toolkit must respect the `OTEL_SDK_DISABLED` environment variable to support testing and local development without requiring an observability backend.

> "Cross-cutting concerns belong at architectural boundaries, not scattered through business logic." — Clean Architecture, Ch. 17–22

## What Is a Language Toolkit?

A **language toolkit** is a language-runtime package (Go module, npm package, Python wheel, NuGet package, etc.) that provides:

1. A **single entry-point function** that accepts a service name and initialises all platform observability signals (structured logging, distributed tracing, metrics) plus HTTP client defaults with OpenTelemetry instrumentation
2. A **shutdown function** returned by the entry point for graceful teardown of all providers
3. A **no-op path** when `OTEL_SDK_DISABLED=true` — the toolkit returns immediately without initialising any OpenTelemetry providers
4. **Functional options** for overriding defaults (OTLP endpoint, sampling rate, log level, etc.)

The pattern is inspired by .NET Aspire's `AddServiceDefaults()` and standardises observability initialisation across all platform services.

## Required Capabilities

Every language toolkit **MUST** provide the following four capabilities. Each capability is declared in the toolkit's usage-rules file under a `## Pattern Conformance` section (see [Conformance Declaration](#conformance-declaration) below).

### 1. Structured Logging

**What it means**: The toolkit configures the language runtime's logging library to emit structured logs (JSON or key-value pairs) with consistent field names. Logs must include trace context (trace_id, span_id) when emitted from within a span.

**Implementation requirements**:

- Set the global/default logger to a structured format (e.g., JSON)
- Integrate with OpenTelemetry Logs API or bridge the native logger to OTel (e.g., `otelslog` in Go, `winston-opentelemetry` in Node.js)
- Ensure trace context propagation: logs emitted within a span must include `trace_id` and `span_id` fields
- Respect `OTEL_SDK_DISABLED`: when true, logs should still be structured but without OTel export

**Example (Go)**:

```go
// Sets slog.Default() to output JSON with trace context
otelHandler := otelslog.NewHandler(serviceName)
traceHandler := telemetry.NewTraceHandler(otelHandler)
slog.SetDefault(slog.New(traceHandler))
```

### 2. Distributed Tracing

**What it means**: The toolkit initialises an OpenTelemetry TracerProvider that exports spans to an OTLP endpoint. It registers W3C TraceContext and Baggage propagators for cross-service tracing.

**Implementation requirements**:

- Create and register a global `TracerProvider` with an OTLP/gRPC exporter
- Use non-blocking dial (e.g., `WithReconnectionPeriod` in Go) so the service starts even if the collector is unreachable
- Register `TraceContext` and `Baggage` propagators via `otel.SetTextMapPropagator`
- Configure sampling (default: parent-based with 10% trace ID ratio for root spans)
- Respect `OTEL_SDK_DISABLED`: when true, skip TracerProvider initialisation entirely

**Example (Go)**:

```go
tp := sdktrace.NewTracerProvider(
  sdktrace.WithBatcher(traceExporter),
  sdktrace.WithResource(res),
  sdktrace.WithSampler(sdktrace.ParentBased(sdktrace.TraceIDRatioBased(0.1))),
)
otel.SetTracerProvider(tp)
otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
  propagation.TraceContext{},
  propagation.Baggage{},
))
```

### 3. Metrics

**What it means**: The toolkit initialises an OpenTelemetry MeterProvider that exports metrics in a format consumable by the platform's metrics backend (e.g., Prometheus).

**Implementation requirements**:

- Create and register a global `MeterProvider` with an appropriate exporter (Prometheus, OTLP, etc.)
- Expose metrics on a standard endpoint (e.g., `/metrics` for Prometheus)
- Include resource attributes (service name, version, environment) on all metrics
- Respect `OTEL_SDK_DISABLED`: when true, skip MeterProvider initialisation entirely

**Example (Go)**:

```go
metricExporter, _ := prometheus.New()
mp := metric.NewMeterProvider(
  metric.WithResource(res),
  metric.WithReader(metricExporter),
)
otel.SetMeterProvider(mp)
```

### 4. HTTP Client Defaults with OTel Instrumentation

**What it means**: The toolkit provides a factory function or configuration object that returns an HTTP client pre-configured with OpenTelemetry tracing instrumentation, appropriate timeouts, and a User-Agent header identifying the service.

**Implementation requirements**:

- Return an HTTP client (or configure the default client) with OTel tracing transport/interceptor
- Set default timeouts (e.g., 30s request timeout, 10s connection timeout)
- Set a User-Agent header in the format `<service-name>/<version>`
- Propagate trace context via HTTP headers on outbound requests
- Respect `OTEL_SDK_DISABLED`: when true, return a client without OTel instrumentation

**Example (Go)**:

```go
func NewHTTPClient() *http.Client {
  return &http.Client{
    Transport: otelhttp.NewTransport(
      &http.Transport{/* ... */},
      otelhttp.WithTracerProvider(otel.GetTracerProvider()),
    ),
    Timeout: 30 * time.Second,
  }
}
```

## Structural Contract

Every language toolkit **MUST** adhere to the following structural conventions:

### Entry Point Signature

The toolkit exposes a **single initialisation function** with this contract (adapted to the language's idioms):

```
Configure(ctx Context, serviceName string, opts ...Option) (shutdown func(Context) error, error)
```

**Parameters**:

- `ctx`: Context for initialisation (timeout, cancellation)
- `serviceName`: Name of the service (used in resource attributes, User-Agent, etc.)
- `opts`: Variadic functional options for overriding defaults (OTLP endpoint, sampler, log level, etc.)

**Returns**:

- `shutdown`: A function that gracefully shuts down all providers (flushes pending logs/spans/metrics). Must be called on service termination (e.g., signal handler, defer, try-finally).
- `error`: Non-nil if initialisation failed (e.g., invalid configuration, resource creation error)

**Behaviour**:

- If `OTEL_SDK_DISABLED=true`, return a no-op shutdown function immediately without initialising any providers
- Otherwise, initialise all four required capabilities (logging, tracing, metrics, HTTP client defaults)
- Set global/default providers so that application code does not need to pass providers explicitly
- Return a unified shutdown function that tears down all providers in reverse initialisation order

### Functional Options

The toolkit **MUST** support functional options for overriding defaults. At minimum:

- `WithOTLPEndpoint(endpoint string)`: Override OTLP endpoint (default: `localhost:4317`)
- `WithSampler(sampler Sampler)`: Override trace sampler (default: parent-based 10% ratio)
- `WithLogLevel(level LogLevel)`: Override minimum log level (default: INFO)

Additional options (e.g., `WithDialTimeout`, `WithMetricsPort`) are permitted but not required.

### Graceful Shutdown

The `shutdown` function returned by the entry point **MUST**:

- Accept a context with a timeout (e.g., 5 seconds)
- Shut down providers in reverse initialisation order (logger, meter, tracer)
- Flush pending telemetry (logs, spans, metrics)
- Return an error if any provider fails to shut down cleanly

### OTEL_SDK_DISABLED No-Op Path

When the environment variable `OTEL_SDK_DISABLED` is set to `"true"`:

- The toolkit **MUST** return immediately without initialising any OpenTelemetry providers
- The returned shutdown function **MUST** be a no-op (returns nil error)
- Structured logging **MAY** still be configured (without OTel export)
- HTTP client defaults **MAY** still be applied (without OTel instrumentation)

This path is essential for:

- Unit tests that do not require observability overhead
- Local development without an OTLP collector
- CI/CD pipelines where observability is not needed

## Testing Requirements

Every language toolkit **MUST** have:

### Unit Tests Covering the No-Op/Disabled Path

- Test that `Configure` with `OTEL_SDK_DISABLED=true` returns a no-op shutdown function
- Verify that the shutdown function can be called without error
- Verify that no OTel providers are initialised (no network calls, no background goroutines/threads)

**Example test case**:

```
GIVEN OTEL_SDK_DISABLED=true
WHEN Configure is called
THEN it returns immediately with a no-op shutdown function
AND calling shutdown returns no error
AND no OTel providers are registered
```

### Integration Tests Exercising Each Signal

- **Logging**: Emit a log line, verify it includes trace context when in a span
- **Tracing**: Create a span, verify it is exported to the OTLP endpoint
- **Metrics**: Record a metric, verify it is exposed on the metrics endpoint
- **HTTP client**: Make an outbound HTTP request, verify trace context is propagated via headers

These tests **SHOULD** use a local OTLP collector (e.g., `otel/opentelemetry-collector` Docker image) or a test harness that captures exported telemetry.

## Conformance Declaration

The toolkit's **technology usage-rules file** (e.g., `.opencode/rules/technologies/<language>/<toolkit-name>.md`) **MUST** include a `## Pattern Conformance` section that maps each required capability to the implementation mechanism.

**Example (Go toolkit)**:

```markdown
## Pattern Conformance

This package conforms to the `language-toolkits` architecture pattern (`.opencode/rules/patterns/architecture/language-toolkits.md`).

### Required Capabilities

| Capability           | Implementation                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Structured Logging   | `slog.Default()` configured with `otelslog.NewHandler` + `telemetry.TraceHandler` for trace context injection                         |
| Distributed Tracing  | `sdktrace.NewTracerProvider` with OTLP/gRPC exporter; W3C TraceContext/Baggage propagators registered via `otel.SetTextMapPropagator` |
| Metrics              | `metric.NewMeterProvider` with Prometheus exporter; metrics exposed on `/metrics` endpoint                                            |
| HTTP Client Defaults | `NewHTTPClient()` factory function returns `http.Client` with `otelhttp.NewTransport` for automatic tracing                           |

### Entry Point

- **Function**: `servicedefaults.Configure(ctx, serviceName, ...opts)`
- **Shutdown**: Returns `func(context.Context) error` for graceful teardown
- **No-op path**: Respects `OTEL_SDK_DISABLED=true` environment variable

### Testing

- Unit tests: `servicedefaults_test.go` covers disabled path and option overrides
- Integration tests: `servicedefaults_integration_test.go` exercises all four signals against a local OTLP collector
```

This declaration allows automated audits to verify that a toolkit fulfils the pattern contract.

## Common Issues

**"Our framework requires observability configuration in a specific lifecycle hook — can we split the entry point?"**
→ No. Wrap the framework's lifecycle hook inside the toolkit's `Configure` function. The platform contract is a single entry point; internal delegation to framework hooks is an implementation detail.

**"We want to use a different metrics backend (not Prometheus) — is that allowed?"**
→ Yes, as long as the toolkit exposes metrics in a standard format (OpenMetrics, OTLP, etc.) and documents the endpoint/protocol in the conformance section. The Prometheus exporter is a reference implementation, not a requirement.

**"Can we make OTLP endpoint configuration mandatory instead of defaulting to localhost:4317?"**
→ No. The toolkit must have a sensible default that works for local development. Use functional options or environment variables to override in production.

**"Our language doesn't have a mature OpenTelemetry SDK — can we skip tracing?"**
→ No. If the language lacks OTel support, either contribute to the upstream OTel project or use a different language for platform services. All four capabilities are mandatory for platform consistency.

## See Also

- [Boundaries Pattern](./boundaries.md) — Cross-cutting concerns live at architectural boundaries
- [Observability Pattern](../delivery/observability.md) — Logging, tracing, and metrics conventions
- [Testing Pattern](../code/testing.md) — Integration test strategy for external dependencies
- OpenTelemetry documentation: [Traces](https://opentelemetry.io/docs/concepts/signals/traces/), [Metrics](https://opentelemetry.io/docs/concepts/signals/metrics/), [Logs](https://opentelemetry.io/docs/concepts/signals/logs/)
- .NET Aspire: [AddServiceDefaults](https://learn.microsoft.com/en-us/dotnet/aspire/fundamentals/service-defaults) — the pattern this rule formalises
- Reference implementation: `src/staccato-toolkit/core/pkg/servicedefaults/` (Go)
