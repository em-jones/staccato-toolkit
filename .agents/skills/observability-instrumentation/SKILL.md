---
name: Observability Instrumentation
description: Guide worker agents on implementing OpenTelemetry instrumentation, metrics, structured logging, and cross-signal correlation for Go services
metadata:
  workflow: implementation
---

## Goal

Instrument Go services with the OpenTelemetry SDK for distributed tracing, metrics, and structured logging. Ensure all three signals (traces, logs, metrics) are correlated and exported to the observability stack (Tempo, Loki, Prometheus via OTel Collector).

## Prerequisites

Before instrumenting a service, ensure:

1. The observability stack is deployed (Prometheus, Loki, Tempo, Grafana, OTel Collector)
2. You have reviewed the usage rules:
   - [Language Toolkit Pattern](../../rules/patterns/architecture/language-toolkits.md) - **Authoritative contract for what a language toolkit MUST provide** — read this first when implementing observability for a new language runtime
   - [Go Service Defaults](../../rules/technologies/go.md) - **Start here for new services**
   - [OpenTelemetry](../../rules/technologies/opentelemetry.md)
   - [log/slog](../../rules/technologies/slog.md)
   - [Prometheus](../../rules/technologies/prometheus.md)
   - [Loki](../../rules/technologies/loki.md)
   - [Tempo](../../rules/technologies/tempo.md)

## Instrumentation Workflow

### 1. Add Service Defaults Package (Recommended for New Services)

**For new Go services or when migrating from `telemetry.InitTelemetry()`**, use the `servicedefaults` package for unified observability setup:

```bash
go get github.com/staccato-toolkit/core/pkg/servicedefaults
```

This package provides a single `Configure()` call that initializes all observability signals (traces, metrics, logs) with best practices built in. See [Go Service Defaults](../../rules/technologies/go.md) for full usage patterns.

**For non-Go services (Python, TypeScript, etc.):** Start by reading the [Language Toolkit Pattern](../../rules/patterns/architecture/language-toolkits.md) to understand the full capability contract (logging, tracing, metrics, HTTP client defaults, single entry-point, no-op path, graceful shutdown) before selecting libraries. The pattern rule defines what your language toolkit MUST provide, regardless of language runtime.

**Quick start with servicedefaults.Configure():**

```go
import (
    "context"
    "log/slog"
    "os"
    "github.com/staccato-toolkit/core/pkg/servicedefaults"
)

func main() {
    ctx := context.Background()

    // Initialize all observability signals (traces, metrics, logs)
    shutdown, err := servicedefaults.Configure(ctx, "my-service")
    if err != nil {
        slog.Error("failed to initialize service defaults", "error", err)
        os.Exit(1)
    }
    defer shutdown(ctx)

    // Use slog.Default() for logging (no global logger variable)
    slog.Info("service started", "port", 8080)

    // Your service logic...
}
```

**Benefits of servicedefaults.Configure():**

- Non-blocking OTLP dial (service starts even if Collector is unreachable)
- Env-aware behavior (`OTEL_SDK_DISABLED=true` skips OTel init for dev/test)
- Eliminates global logger anti-pattern (uses `slog.Default()`)
- Unified shutdown for all three signals (traces, metrics, logs)
- HTTP client defaults with `servicedefaults.NewHTTPClient()`

**Note:** The `telemetry.InitTelemetry()` approach (shown below) still works but `servicedefaults.Configure()` is preferred for new services.

---

### Alternative: Manual OpenTelemetry Initialization (Legacy)

**If you cannot use the servicedefaults package**, follow these steps to manually initialize OTel:

#### 1. Add OpenTelemetry Dependencies

Add the OTel Go SDK and required instrumentation libraries to `go.mod`:

```bash
go get go.opentelemetry.io/otel@v1.24.0
go get go.opentelemetry.io/otel/sdk@v1.24.0
go get go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc@v1.24.0
go get go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc@v1.24.0
go get go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp@v0.49.0
```

#### 2. Initialize OpenTelemetry SDK at Startup

Create an initialization function that sets up the tracer and meter providers:

```go
func initOTel(ctx context.Context, serviceName string) (func(context.Context) error, error) {
    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceNameKey.String(serviceName),
            semconv.ServiceVersionKey.String(version),
            semconv.DeploymentEnvironmentKey.String(os.Getenv("ENVIRONMENT")),
        ),
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create resource: %w", err)
    }

    // Trace exporter
    traceExporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint(os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")),
        otlptracegrpc.WithInsecure(), // Use TLS in production
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create trace exporter: %w", err)
    }

    // Tracer provider with sampling
    samplingRate := 0.1 // 10% default
    if rate := os.Getenv("OTEL_TRACES_SAMPLER_ARG"); rate != "" {
        if parsed, err := strconv.ParseFloat(rate, 64); err == nil {
            samplingRate = parsed
        }
    }

    tp := trace.NewTracerProvider(
        trace.WithBatcher(traceExporter),
        trace.WithResource(res),
        trace.WithSampler(trace.ParentBased(trace.TraceIDRatioBased(samplingRate))),
    )
    otel.SetTracerProvider(tp)

    // Metric exporter
    metricExporter, err := otlpmetricgrpc.New(ctx,
        otlpmetricgrpc.WithEndpoint(os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")),
        otlpmetricgrpc.WithInsecure(),
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create metric exporter: %w", err)
    }

    mp := metric.NewMeterProvider(
        metric.WithReader(metric.NewPeriodicReader(metricExporter)),
        metric.WithResource(res),
    )
    otel.SetMeterProvider(mp)

    // Return shutdown function
    return func(ctx context.Context) error {
        if err := tp.Shutdown(ctx); err != nil {
            return err
        }
        return mp.Shutdown(ctx)
    }, nil
}
```

Call this at service startup:

```go
func main() {
    ctx := context.Background()
    shutdown, err := initOTel(ctx, "staccato-server")
    if err != nil {
        log.Fatal(err)
    }
    defer shutdown(context.Background())

    // Start service...
}
```

**Migration note:** If you're currently using `telemetry.InitTelemetry()`, replace it with `servicedefaults.Configure()` for improved non-blocking dial, env-aware behavior, and unified logging setup. See the [Go Service Defaults](../../rules/technologies/go.md) for details.

---

### 2. Instrument HTTP Handlers

Wrap HTTP handlers with `otelhttp` to automatically create spans:

```go
import "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"

mux := http.NewServeMux()
mux.Handle("/api/users", otelhttp.NewHandler(usersHandler, "api.users"))
mux.Handle("/api/orders", otelhttp.NewHandler(ordersHandler, "api.orders"))

// Expose metrics endpoint
mux.Handle("/metrics", promhttp.Handler())

http.ListenAndServe(":8080", mux)
```

### 3. Instrument Outbound HTTP Calls

**If using servicedefaults**, create an instrumented HTTP client:

```go
import "github.com/staccato-toolkit/core/pkg/servicedefaults"

client := servicedefaults.NewHTTPClient()
resp, err := client.Get("https://api.example.com/data")
```

**If using manual OTel setup**, wrap HTTP clients to propagate trace context:

```go
client := &http.Client{
    Transport: otelhttp.NewTransport(http.DefaultTransport),
}

req, _ := http.NewRequestWithContext(ctx, "GET", "https://api.example.com/data", nil)
resp, err := client.Do(req)
```

### 4. Add Custom Spans for Business Logic

Create child spans for important operations:

```go
func processOrder(ctx context.Context, order *Order) error {
    tracer := otel.Tracer("staccato-server")
    ctx, span := tracer.Start(ctx, "process_order")
    defer span.End()

    // Add useful attributes
    span.SetAttributes(
        attribute.String("order_id", order.ID),
        attribute.String("user_id", order.UserID),
        attribute.Int("item_count", len(order.Items)),
    )

    // Business logic...
    if err := validateOrder(ctx, order); err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "validation failed")
        return err
    }

    span.SetStatus(codes.Ok, "order processed")
    return nil
}
```

### 5. Emit Custom Metrics

Create metrics for business events:

```go
var (
    meter = otel.Meter("staccato-server")

    requestCounter, _ = meter.Int64Counter(
        "staccato_server_http_requests_total",
        metric.WithDescription("Total HTTP requests"),
    )

    requestDuration, _ = meter.Float64Histogram(
        "staccato_server_http_request_duration_seconds",
        metric.WithDescription("HTTP request duration"),
    )

    orderCounter, _ = meter.Int64Counter(
        "staccato_server_orders_total",
        metric.WithDescription("Total orders processed"),
    )
)

func handleRequest(w http.ResponseWriter, r *http.Request) {
    start := time.Now()

    // Handle request...

    duration := time.Since(start)
    requestCounter.Add(r.Context(), 1, metric.WithAttributes(
        attribute.String("method", r.Method),
        attribute.String("endpoint", r.URL.Path),
        attribute.Int("status", 200),
    ))
    requestDuration.Record(r.Context(), duration.Seconds())
}
```

### 6. Configure Structured Logging with OTel Logs Bridge

**If using servicedefaults.Configure()**, logging is automatically set up with the otelslog bridge and TraceHandler. Simply use `slog.Default()`:

```go
import "log/slog"

func HandleRequest(ctx context.Context, req *Request) error {
    slog.InfoContext(ctx, "processing request", "request_id", req.ID)

    if err := processData(ctx, req.Data); err != nil {
        slog.ErrorContext(ctx, "failed to process data", "error", err)
        return err
    }

    return nil
}
```

**If using manual OTel setup**, all services MUST use `log/slog` with the OpenTelemetry logs bridge (`otelslog`) to export logs via OTLP to the OTel Collector. This ensures unified observability (traces, metrics, logs) through a single pipeline.

#### Add Logging Dependencies

```bash
go get go.opentelemetry.io/contrib/bridges/otelslog@v0.15.0
go get go.opentelemetry.io/otel/sdk/log@v0.16.0
go get go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc@v0.16.0
```

#### Initialize LoggerProvider

Add LoggerProvider initialization to your `initOTel` function (or telemetry package):

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
        return nil, fmt.Errorf("failed to create log exporter: %w", err)
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

Add LoggerProvider to your main initialization:

```go
func initOTel(ctx context.Context, serviceName string) (func(context.Context) error, error) {
    // ... resource, tracer provider, meter provider setup ...

    // Initialize LoggerProvider
    lp, err := initLoggerProvider(ctx, res)
    if err != nil {
        return nil, fmt.Errorf("failed to initialize logger provider: %w", err)
    }

    // Return shutdown function that includes LoggerProvider
    return func(ctx context.Context) error {
        var errs []error
        if err := lp.Shutdown(ctx); err != nil {
            errs = append(errs, err)
        }
        if err := tp.Shutdown(ctx); err != nil {
            errs = append(errs, err)
        }
        if err := mp.Shutdown(ctx); err != nil {
            errs = append(errs, err)
        }
        if len(errs) > 0 {
            return fmt.Errorf("shutdown errors: %v", errs)
        }
        return nil
    }, nil
}
```

#### Set Up Structured Logging in main()

Configure the default logger with TraceHandler (for trace context injection) and initialize the otelslog bridge:

```go
import (
    "log/slog"
    "os"
    "github.com/staccato-toolkit/core/pkg/telemetry"
    "go.opentelemetry.io/contrib/bridges/otelslog"
)

func main() {
    ctx := context.Background()

    // Initialize OTel (traces, metrics, logs)
    shutdown, err := telemetry.InitTelemetry(ctx, "staccato-server")
    if err != nil {
        slog.Error("failed to initialize telemetry", "error", err)
        os.Exit(1)
    }
    defer shutdown(ctx)

    // Set up structured logging with trace context injection
    // Layer: slog.Default() -> TraceHandler -> JSONHandler -> stdout
    baseHandler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelDebug,
    })
    traceHandler := telemetry.NewTraceHandler(baseHandler)
    slog.SetDefault(slog.New(traceHandler))

    // Initialize otelslog bridge (forwards logs to OTel LoggerProvider -> OTLP)
    _ = otelslog.NewHandler("staccato-server")

    // Use slog throughout the service
    slog.Info("service started", "port", 8080)
}
```

#### Use Context-Aware Logging

Always use `slog.InfoContext(ctx, ...)` and `slog.ErrorContext(ctx, ...)` to include trace context:

```go
func HandleRequest(ctx context.Context, req *Request) error {
    slog.InfoContext(ctx, "processing request", "request_id", req.ID)

    if err := processData(ctx, req.Data); err != nil {
        slog.ErrorContext(ctx, "failed to process data", "error", err, "request_id", req.ID)
        return err
    }

    slog.InfoContext(ctx, "request completed", "request_id", req.ID)
    return nil
}
```

#### TraceHandler for Trace Context Injection

The `TraceHandler` automatically injects `trace_id` and `span_id` from the active span context into log records. This is used for stdout logs. The otelslog bridge handles OTLP export.

```go
// domain/pkg/telemetry/slog.go
type TraceHandler struct {
    handler slog.Handler
}

func NewTraceHandler(h slog.Handler) slog.Handler {
    return &TraceHandler{handler: h}
}

func (h *TraceHandler) Handle(ctx context.Context, r slog.Record) error {
    span := trace.SpanFromContext(ctx)
    spanCtx := span.SpanContext()

    if spanCtx.IsValid() {
        r.AddAttrs(
            slog.String("trace_id", spanCtx.TraceID().String()),
            slog.String("span_id", spanCtx.SpanID().String()),
        )
    }

    return h.handler.Handle(ctx, r)
}

// Implement Enabled, WithAttrs, WithGroup methods...
```

#### Logging Architecture

The logging setup creates dual output:

```
slog.Logger → TraceHandler → JSONHandler → stdout
                     ↓
            (injects trace_id, span_id)

otelslog.Handler → OTel LoggerProvider → OTLP Exporter → Collector → Loki
                        ↓
              (uses global LoggerProvider)
```

- **stdout logs**: For local development and Promtail fallback (with trace context)
- **OTLP logs**: For unified observability pipeline (OTel Collector → Loki)

#### Configure Log Levels

Use environment variables to control log verbosity:

```yaml
# Kubernetes deployment
env:
  - name: OTEL_LOG_LEVEL
    value: "info" # debug, info, warn, error
```

In your handler setup:

```go
level := slog.LevelInfo
if os.Getenv("OTEL_LOG_LEVEL") == "debug" {
    level = slog.LevelDebug
}

handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
    Level: level,
})
```

### 7. Environment Configuration

Configure via environment variables:

```yaml
# Kubernetes deployment
env:
  - name: OTEL_EXPORTER_OTLP_ENDPOINT
    value: "otel-collector:4317"
  - name: OTEL_TRACES_SAMPLER
    value: "parentbased_traceidratio"
  - name: OTEL_TRACES_SAMPLER_ARG
    value: "0.1" # 10% sampling
  - name: ENVIRONMENT
    value: "production"
  - name: LOG_LEVEL
    value: "info"
```

## Validation Checklist

After instrumentation, verify:

- [ ] Service exposes `/metrics` endpoint (test: `curl http://localhost:8080/metrics`)
- [ ] Traces appear in Grafana Tempo within 10 seconds of request
- [ ] Logs appear in Grafana Loki within 30 seconds
- [ ] Metrics are scraped by Prometheus (check Targets page)
- [ ] Trace-to-log correlation works (click "Logs for this span" in Grafana)
- [ ] Span attributes include useful debugging context (user_id, order_id, etc.)
- [ ] Log lines include `trace_id` when a trace context is active
- [ ] Metric names follow convention: `<service>_<subsystem>_<unit>_total`

## Common Patterns

### Pattern: Middleware for automatic trace/log correlation

```go
func TracingMiddleware(logger *slog.Logger) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            span := trace.SpanFromContext(r.Context())
            if span.SpanContext().IsValid() {
                logger = logger.With(
                    slog.String("trace_id", span.SpanContext().TraceID().String()),
                )
            }
            next.ServeHTTP(w, r.WithContext(
                context.WithValue(r.Context(), "logger", logger),
            ))
        })
    }
}
```

### Pattern: Error handling with span recording

```go
func recordError(span trace.Span, err error, msg string) {
    span.RecordError(err)
    span.SetStatus(codes.Error, msg)
    span.SetAttributes(attribute.String("error.message", err.Error()))
}

// Usage
if err := processOrder(ctx, order); err != nil {
    recordError(span, err, "failed to process order")
    return err
}
```

## Troubleshooting

**Spans not appearing in Tempo**
→ Check `OTEL_EXPORTER_OTLP_ENDPOINT` is correct. Verify OTel Collector is running. Ensure `shutdown()` is called on service exit to flush pending spans.

**Logs missing trace_id**
→ Verify you're passing `context.Context` to log calls. Use `trace.SpanFromContext(ctx)` to extract trace ID. Ensure the span context is valid before logging.

**Metrics not scraped by Prometheus**
→ Verify `/metrics` endpoint is exposed. Check ServiceMonitor selector matches service labels. Confirm OTel Collector is forwarding metrics to Prometheus.

**High latency overhead**
→ Reduce sampling rate (e.g., 5% or 1%). Use `trace.WithBatcher` (not `WithSyncer`). Profile with `pprof` to identify bottlenecks.

## See Also

- [OpenTelemetry Usage Rules](../../rules/technologies/opentelemetry.md)
- [log/slog Usage Rules](../../rules/technologies/slog.md)
- [Prometheus Usage Rules](../../rules/technologies/prometheus.md)
- [Loki Usage Rules](../../rules/technologies/loki.md)
- [Tempo Usage Rules](../../rules/technologies/tempo.md)
- [Grafana Alloy Usage Rules](../../rules/technologies/alloy.md)

---

## Grafana Alloy: Telemetry Collection Agent

> **Alloy replaces both Promtail and the standalone OTel Collector.** All OTLP signals (traces, metrics, logs) from services should target the Alloy agent endpoint.

### What Alloy Does

Grafana Alloy is a DaemonSet in the `monitoring` namespace that:

1. **Collects Kubernetes pod logs** via `loki.source.kubernetes` (replaces Promtail)
2. **Receives OTLP** from services on gRPC `:4317` and HTTP `:4318`
3. **Routes** traces → Tempo, metrics → Prometheus, logs → Loki

### Configuring Services to Target Alloy

**Go services** (via `servicedefaults` or manual OTel init): set the endpoint to Alloy:

```bash
# In-cluster
export OTEL_EXPORTER_OTLP_ENDPOINT=http://alloy.monitoring.svc.cluster.local:4317

# Or via DaemonSet node IP (for DaemonSet-aware clients)
# OTEL_EXPORTER_OTLP_ENDPOINT=http://$(NODE_IP):4317
```

**Node.js services (Backstage)**: the `instrumentation.js` bootstrap reads `OTEL_EXPORTER_OTLP_ENDPOINT`:

```javascript
// Default: http://alloy.monitoring.svc.cluster.local:4318 (OTLP/HTTP)
// Override for local dev: export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
const otlpEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://alloy.monitoring.svc.cluster.local:4318";
```

### Alloy River Pipeline Configuration

The Alloy pipeline is configured in `src/ops/observability/alloy/config.alloy` using River syntax. Key components:

```river
// OTLP receiver — accepts all signals from services
otelcol.receiver.otlp "default" {
  grpc { endpoint = "0.0.0.0:4317" }
  http { endpoint = "0.0.0.0:4318" }
  output {
    traces  = [otelcol.exporter.otlp.tempo.input]
    metrics = [otelcol.exporter.prometheus.default.input]
    logs    = [otelcol.exporter.loki.default.input]
  }
}

// Kubernetes pod log collection — replaces Promtail
loki.source.kubernetes "pod_logs" {
  targets    = discovery.relabel.pod_logs.output
  forward_to = [loki.write.default.receiver]
}
```

See [Grafana Alloy Usage Rules](../../rules/technologies/alloy.md) for the full pipeline reference and deployment checklist.

### Local Development

For local dev (no in-cluster Alloy), start Alloy locally or use a Docker Compose stack:

```bash
# Point to a local Alloy or OTel Collector for dev
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

Or set `OTEL_SDK_DISABLED=true` to skip OTel init entirely in local dev.
