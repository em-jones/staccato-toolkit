---
created-by-change: evaluate-observability-stack
last-validated: 2026-02-25
---

# OpenTelemetry Usage Rules

OpenTelemetry (OTel) is the CNCF standard for vendor-agnostic observability instrumentation. All Go services use the OTel SDK to emit traces, metrics, and logs to the OpenTelemetry Collector, which routes signals to Prometheus, Loki, and Tempo.

## Core Principle

OpenTelemetry is the single instrumentation layer for all observability signals. All Go services MUST use the OTel Go SDK (`go.opentelemetry.io/otel`). Signals are exported via OTLP/gRPC to the OTel Collector. Vendor-specific SDKs (Datadog, New Relic) are prohibited.

## Setup

Add the OpenTelemetry Go SDK and OTLP exporter to your service:

```go
// go.mod
require (
    go.opentelemetry.io/otel v1.24.0
    go.opentelemetry.io/otel/sdk v1.24.0
    go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc v1.24.0
    go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc v1.24.0
    go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp v0.49.0
)
```

Initialize the OTel SDK at service startup:

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/sdk/trace"
    "go.opentelemetry.io/otel/sdk/resource"
    semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

func initOTel(ctx context.Context, serviceName string) (func(), error) {
    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceNameKey.String(serviceName),
        ),
    )
    if err != nil {
        return nil, err
    }

    traceExporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint(os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")),
        otlptracegrpc.WithInsecure(), // use TLS in production
    )
    if err != nil {
        return nil, err
    }

    tp := trace.NewTracerProvider(
        trace.WithBatcher(traceExporter),
        trace.WithResource(res),
        trace.WithSampler(trace.ParentBased(trace.TraceIDRatioBased(0.1))), // 10% sampling
    )
    otel.SetTracerProvider(tp)

    return func() { tp.Shutdown(ctx) }, nil
}
```

## Key Guidelines

### Tracing: Instrument HTTP handlers and outbound calls

Use the `otelhttp` package to wrap HTTP handlers and clients. This automatically creates spans with semantic conventions.

```go
// ✓ Good: Wrap HTTP handler with OTel middleware
import "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"

mux := http.NewServeMux()
mux.Handle("/api", otelhttp.NewHandler(apiHandler, "api"))
http.ListenAndServe(":8080", mux)

// ✓ Good: Wrap HTTP client for outbound calls
client := &http.Client{
    Transport: otelhttp.NewTransport(http.DefaultTransport),
}
resp, err := client.Get("https://example.com")
```

```go
// ✗ Avoid: Manual span creation without semantic conventions
tracer := otel.Tracer("myservice")
ctx, span := tracer.Start(ctx, "api_call")
defer span.End()
// Missing http.method, http.status_code attributes
```

### Tracing: Propagate context through the call chain

Always pass `context.Context` through function calls to maintain trace parent-child relationships.

```go
// ✓ Good: Context passed to child function
func HandleRequest(ctx context.Context, req *Request) error {
    return processData(ctx, req.Data)
}

func processData(ctx context.Context, data string) error {
    tracer := otel.Tracer("myservice")
    ctx, span := tracer.Start(ctx, "process_data")
    defer span.End()
    // Child span is automatically linked to parent
    return nil
}
```

```go
// ✗ Avoid: Creating new context breaks trace continuity
func processData(data string) error {
    ctx := context.Background() // Loses parent trace context!
    tracer := otel.Tracer("myservice")
    ctx, span := tracer.Start(ctx, "process_data")
    defer span.End()
    return nil
}
```

### Metrics: Follow naming conventions

Custom metrics MUST follow the pattern `<service>_<subsystem>_<unit>_total` for counters and `<service>_<subsystem>_<unit>` for histograms.

```go
// ✓ Good: Semantic metric name
import "go.opentelemetry.io/otel/metric"

meter := otel.Meter("staccato-server")
requestCounter, _ := meter.Int64Counter(
    "staccato_server_http_requests_total",
    metric.WithDescription("Total HTTP requests received"),
)
requestCounter.Add(ctx, 1, metric.WithAttributes(
    attribute.String("method", "GET"),
    attribute.Int("status", 200),
))
```

```go
// ✗ Avoid: Ambiguous or non-standard metric names
meter.Int64Counter("requests") // Too vague
meter.Int64Counter("http-requests") // Use underscores, not hyphens
```

### Logs: Use the otelslog bridge for unified observability

The OpenTelemetry logs signal allows structured logs to be exported via OTLP alongside traces and metrics. Use the `otelslog` bridge (`go.opentelemetry.io/contrib/bridges/otelslog`) to forward `log/slog` output to the OTel Collector.

**Initialize the LoggerProvider with OTLP/gRPC exporter:**

```go
import (
    "go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc"
    "go.opentelemetry.io/otel/log/global"
    sdklog "go.opentelemetry.io/otel/sdk/log"
)

func initLoggerProvider(ctx context.Context, res *resource.Resource) (*sdklog.LoggerProvider, error) {
    // Create OTLP/gRPC log exporter (same endpoint as traces/metrics)
    logExporter, err := otlploggrpc.New(ctx,
        otlploggrpc.WithEndpoint(os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")),
        otlploggrpc.WithInsecure(), // Use TLS in production
    )
    if err != nil {
        return nil, err
    }

    // Create LoggerProvider with batch processor
    lp := sdklog.NewLoggerProvider(
        sdklog.WithProcessor(sdklog.NewBatchProcessor(logExporter)),
        sdklog.WithResource(res),
    )

    // Set global logger provider (used by otelslog bridge)
    global.SetLoggerProvider(lp)

    return lp, nil
}
```

**The otelslog bridge automatically hooks into the global LoggerProvider:**

```go
import (
    "log/slog"
    "go.opentelemetry.io/contrib/bridges/otelslog"
)

func main() {
    // ... initialize OTel (traces, metrics, logs) ...

    // Initialize otelslog bridge (forwards logs to OTel LoggerProvider)
    // The bridge automatically uses the global LoggerProvider set above
    _ = otelslog.NewHandler("service-name")

    // Use slog throughout the service
    slog.Info("service started", "port", 8080)
}
```

The `otelslog.NewHandler()` call creates a bridge that forwards all `log/slog` output to the OTel LoggerProvider. The bridge automatically uses the global LoggerProvider set by `global.SetLoggerProvider(lp)`. Logs are exported via OTLP/gRPC to the OTel Collector, which routes them to Loki.

For full `log/slog` patterns (structured logging, trace context injection, log levels), see the [slog usage rules](./slog.md).

### Sampling: Configure for production

Set the sampling rate via environment variable `OTEL_TRACES_SAMPLER` and `OTEL_TRACES_SAMPLER_ARG`. Default production sampling is 10% (`traceidratio=0.1`).

```yaml
# ✓ Good: Production deployment with sampling
env:
  - name: OTEL_TRACES_SAMPLER
    value: "parentbased_traceidratio"
  - name: OTEL_TRACES_SAMPLER_ARG
    value: "0.1"
  - name: OTEL_EXPORTER_OTLP_ENDPOINT
    value: "otel-collector:4317"
```

```yaml
# ✗ Avoid: 100% sampling in production (high overhead)
env:
  - name: OTEL_TRACES_SAMPLER
    value: "always_on"
```

## Common Issues

**"spans not appearing in Tempo"**
→ Verify the OTel Collector is reachable at `OTEL_EXPORTER_OTLP_ENDPOINT`. Check that `tp.Shutdown(ctx)` is called on service shutdown to flush pending spans.

**"trace context not propagated to downstream service"**
→ Ensure you're using `otelhttp.NewTransport` for HTTP clients or manually injecting `traceparent` headers. Verify the downstream service is also instrumented with OTel.

**"high latency overhead from tracing"**
→ Reduce sampling rate (e.g., 5% or 1% for high-traffic services). Use `trace.WithBatcher` instead of `trace.WithSyncer` to batch span exports.

**"missing trace_id in logs"**
→ Extract the trace ID from the span context and include it in structured logs. See the `slog` usage rules for trace-to-log correlation patterns.

## See Also

- [Prometheus Usage Rules](./prometheus.md) - Metrics backend
- [Loki Usage Rules](./loki.md) - Logs backend with trace correlation
- [Tempo Usage Rules](./tempo.md) - Distributed tracing backend
- [OpenTelemetry Go Documentation](https://opentelemetry.io/docs/instrumentation/go/) - Official SDK guide
