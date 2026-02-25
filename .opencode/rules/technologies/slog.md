---
created-by-change: select-go-logging-library
last-validated: 2026-02-25
---

# log/slog Usage Rules

`log/slog` is Go's standard library structured logging package (Go 1.21+). All Go services use slog for structured logging with the OpenTelemetry logs bridge (`go.opentelemetry.io/contrib/bridges/otelslog`) to export logs via OTLP to the OTel Collector → Loki.

## Core Principle

`log/slog` is the single logging library for all Go services. All log output MUST use structured key-value pairs (not printf-style formatting). The `otelslog` bridge MUST be used to export logs to the OTel Collector alongside traces and metrics. Logs MUST include trace context (trace_id, span_id) for correlation with distributed traces.

## Setup

Add the OpenTelemetry logs bridge to your service:

```go
// go.mod
require (
    go.opentelemetry.io/contrib/bridges/otelslog v0.15.0
    go.opentelemetry.io/otel/sdk/log v0.16.0
    go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc v0.16.0
)
```

Initialize the OTel LoggerProvider in your telemetry setup (typically in `pkg/telemetry/telemetry.go`):

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

In your service's `main()`, set up the default logger with TraceHandler and otelslog bridge:

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
    baseHandler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelDebug,
    })
    traceHandler := telemetry.NewTraceHandler(baseHandler)
    slog.SetDefault(slog.New(traceHandler))

    // Initialize otelslog bridge (forwards logs to OTel LoggerProvider)
    _ = otelslog.NewHandler("staccato-server")

    // Use slog throughout the service
    slog.Info("service started", "port", 8080)
}
```

## Key Guidelines

### Use structured key-value logging

Always use key-value pairs for log attributes. Never use printf-style formatting.

```go
// ✓ Good: Structured logging with key-value pairs
slog.Info("user logged in", "user_id", 12345, "ip", "192.168.1.1")
slog.Error("database query failed", "error", err, "query", "SELECT * FROM users", "duration_ms", 523)
```

```go
// ✗ Avoid: Printf-style formatting loses structure
slog.Info(fmt.Sprintf("user %d logged in from %s", 12345, "192.168.1.1"))
slog.Error(fmt.Sprintf("database query failed: %v", err))
```

### Use context-aware logging for trace correlation

Use `slog.InfoContext(ctx, ...)` and `slog.ErrorContext(ctx, ...)` to automatically include trace_id and span_id from the active span.

```go
// ✓ Good: Context-aware logging includes trace context
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

```go
// ✗ Avoid: Non-context logging loses trace correlation
func HandleRequest(ctx context.Context, req *Request) error {
    slog.Info("processing request", "request_id", req.ID) // Missing trace_id/span_id!
    // ...
}
```

### Use appropriate log levels

Follow these conventions for log levels:

- **Debug**: Detailed diagnostic information (disabled in production by default)
- **Info**: General informational messages (service lifecycle, request handling)
- **Warn**: Unexpected but recoverable conditions (retries, fallbacks)
- **Error**: Error conditions that require attention (failed operations, exceptions)

```go
// ✓ Good: Appropriate log levels
slog.Debug("cache miss", "key", "user:12345")
slog.Info("server started", "port", 8080, "version", "v1.2.3")
slog.Warn("rate limit exceeded, retrying", "user_id", 12345, "retry_count", 2)
slog.Error("failed to connect to database", "error", err, "host", "postgres:5432")
```

```go
// ✗ Avoid: Misusing log levels
slog.Info("failed to connect to database", "error", err) // Should be Error
slog.Error("cache miss", "key", "user:12345") // Should be Debug
```

### Configure log levels via environment variables

Use the `OTEL_LOG_LEVEL` environment variable to control log verbosity in production:

```yaml
# ✓ Good: Production deployment with appropriate log level
env:
  - name: OTEL_LOG_LEVEL
    value: "info"
```

In your handler options:

```go
level := slog.LevelInfo
if os.Getenv("OTEL_LOG_LEVEL") == "debug" {
    level = slog.LevelDebug
}

handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
    Level: level,
})
```

### Avoid global logger variables

Never use package-level or global logger variables. Always use `slog.SetDefault()` in `main()` and retrieve the logger with `slog.Default()` or use the context-aware functions directly.

```go
// ✓ Good: Set default logger in main(), use context-aware functions
func main() {
    // ... setup ...
    slog.SetDefault(slog.New(handler))
    
    // Use slog.InfoContext, slog.ErrorContext, etc.
    slog.Info("service started")
}

func HandleRequest(ctx context.Context) {
    slog.InfoContext(ctx, "handling request")
}
```

```go
// ✗ Avoid: Global logger variable (anti-pattern)
var logger *slog.Logger

func main() {
    logger = slog.New(handler) // Global variable!
    logger.Info("service started")
}

func HandleRequest(ctx context.Context) {
    logger.Info("handling request") // Implicit dependency on global state
}
```

### Use TraceHandler for trace context injection

The `telemetry.TraceHandler` automatically injects `trace_id` and `span_id` from the active span context into log records. Always layer this handler with the base handler.

```go
// ✓ Good: TraceHandler layered with base handler
baseHandler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug})
traceHandler := telemetry.NewTraceHandler(baseHandler)
slog.SetDefault(slog.New(traceHandler))
```

```go
// ✗ Avoid: Using base handler without TraceHandler
baseHandler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug})
slog.SetDefault(slog.New(baseHandler)) // Missing trace context injection!
```

### Test logging with slogtest

Use the `testing/slogtest` package to validate custom handlers (like TraceHandler):

```go
import (
    "testing/slogtest"
    "log/slog"
)

func TestTraceHandler(t *testing.T) {
    var buf bytes.Buffer
    handler := telemetry.NewTraceHandler(slog.NewJSONHandler(&buf, nil))
    
    if err := slogtest.TestHandler(handler, func() []map[string]any {
        // Parse log output and return as slice of maps
        // ...
    }); err != nil {
        t.Fatal(err)
    }
}
```

## Common Issues

**"logs not appearing in Loki"**
→ Verify the OTel Collector is reachable at `OTEL_EXPORTER_OTLP_ENDPOINT`. Check that the LoggerProvider is shut down on service exit (`lp.Shutdown(ctx)`) to flush pending logs.

**"trace_id missing from logs"**
→ Ensure you're using `slog.InfoContext(ctx, ...)` instead of `slog.Info(...)`. Verify that `TraceHandler` is layered with the base handler. Check that the context passed to logging functions contains an active span (from `otelhttp` middleware or manual `tracer.Start(ctx, ...)`).

**"logs duplicated in stdout and Loki"**
→ This is expected. Logs go to both stdout (for local development and Promtail fallback) and OTLP (for unified observability via OTel Collector). If you want to disable stdout logs in production, remove the `baseHandler` and use only the otelslog bridge.

**"performance overhead from dual log output"**
→ OTLP export is asynchronous (batched), so overhead is minimal. If needed, adjust the batch processor settings in `initLoggerProvider` (e.g., increase batch size or delay).

## Architecture

The logging architecture layers multiple handlers:

```
slog.Logger → TraceHandler → JSONHandler → stdout
                     ↓
            (injects trace_id, span_id)

otelslog.Handler → OTel LoggerProvider → OTLP Exporter → Collector → Loki
                        ↓
              (uses global LoggerProvider)
```

- **TraceHandler**: Custom handler that injects trace context into log records for stdout logs
- **otelslog bridge**: Forwards log records to the OTel LoggerProvider for OTLP export
- **Dual output**: Logs go to both stdout (for local dev) and OTLP (for production observability)

## See Also

- [OpenTelemetry Usage Rules](./opentelemetry.md) - OTel SDK setup and tracing patterns
- [Loki Usage Rules](./loki.md) - Logs backend with trace correlation
- [Go slog documentation](https://pkg.go.dev/log/slog) - Official slog package docs
- [otelslog bridge](https://pkg.go.dev/go.opentelemetry.io/contrib/bridges/otelslog) - OTel logs bridge
