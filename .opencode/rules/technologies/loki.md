---
created-by-change: evaluate-observability-stack
last-validated: 2026-02-25
---

# Grafana Loki Usage Rules

Grafana Loki is the platform's log aggregation system. Services emit structured JSON logs to stdout, which are collected by Promtail or the OpenTelemetry Collector and shipped to Loki. Logs are queried via Grafana Explore using LogQL.

## Core Principle

Loki is a label-based log aggregation system, NOT a full-text search engine like Elasticsearch. Index only low-cardinality labels (`service`, `environment`, `level`). Store high-cardinality data (user IDs, trace IDs) in the log message body, not as labels. All logs MUST be structured JSON with required fields: `time`, `level`, `service`, `msg`, and `trace_id` (when a trace context is active).

## Setup

Configure your Go service to emit structured JSON logs using `log/slog`:

```go
import (
    "log/slog"
    "os"
    "go.opentelemetry.io/otel/trace"
)

func main() {
    // Create JSON logger with required fields
    logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelInfo,
    })).With(
        slog.String("service", "staccato-server"),
        slog.String("environment", os.Getenv("ENVIRONMENT")),
    )
    slog.SetDefault(logger)
    
    // Log with trace context
    ctx := context.Background()
    span := trace.SpanFromContext(ctx)
    if span.SpanContext().IsValid() {
        logger.InfoContext(ctx, "request processed",
            slog.String("trace_id", span.SpanContext().TraceID().String()),
            slog.String("user_id", userID),
            slog.Duration("duration", elapsed),
        )
    }
}
```

Deploy Promtail or configure the OTel Collector to ship logs to Loki:

```yaml
# Promtail configuration (Kubernetes DaemonSet)
scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    pipeline_stages:
      - json:
          expressions:
            level: level
            service: service
            trace_id: trace_id
      - labels:
          level:
          service:
    relabel_configs:
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
```

## Key Guidelines

### Labels: Index only low-cardinality dimensions

Loki indexes labels, not log content. Use labels for filtering (e.g., `{service="staccato-server", level="error"}`). Avoid indexing high-cardinality fields like user IDs, trace IDs, or timestamps.

```yaml
# ✓ Good: Low-cardinality labels
{service="staccato-server", level="error", environment="production"}
```

```yaml
# ✗ Avoid: High-cardinality labels (breaks Loki's performance model)
{service="staccato-server", user_id="12345", trace_id="abc123"}
```

### Log Structure: Required fields for all log lines

Every log line MUST include these fields:

- `time` (RFC3339 timestamp)
- `level` (debug, info, warn, error)
- `service` (service name, e.g., "staccato-server")
- `msg` (human-readable message)
- `trace_id` (when a trace context is active)

```json
// ✓ Good: Complete structured log
{
  "time": "2026-02-25T10:30:00Z",
  "level": "info",
  "service": "staccato-server",
  "msg": "request processed",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "user_id": "user-123",
  "duration_ms": 45
}
```

```json
// ✗ Avoid: Unstructured or incomplete log
{
  "msg": "request processed"
  // Missing time, level, service, trace_id
}
```

### Trace-to-Log Correlation: Include trace_id in every log

When an OpenTelemetry trace context is active, extract the trace ID and include it in the log line. This enables "Logs for this span" links in Grafana.

```go
// ✓ Good: Extract trace ID from context
span := trace.SpanFromContext(ctx)
if span.SpanContext().IsValid() {
    logger.InfoContext(ctx, "processing request",
        slog.String("trace_id", span.SpanContext().TraceID().String()),
    )
}
```

```go
// ✗ Avoid: Logging without trace context
logger.Info("processing request")
// Missing trace_id, breaks trace-to-log correlation
```

### LogQL Queries: Filter by labels, search in message

Use LogQL to query logs in Grafana Explore. Filter by labels first (indexed), then search log content (not indexed).

```logql
# Filter by service and level (fast, uses index)
{service="staccato-server", level="error"}

# Search for text in log message (slower, scans content)
{service="staccato-server"} |= "database connection failed"

# Extract and aggregate fields from JSON logs
{service="staccato-server"} 
| json 
| duration_ms > 1000 
| line_format "{{.msg}} took {{.duration_ms}}ms"

# Trace-to-log correlation (find logs for a specific trace)
{service="staccato-server"} | json | trace_id="4bf92f3577b34da6a3ce929d0e0e4736"
```

### Log Levels: Use appropriately

- **debug**: Verbose diagnostics (disabled in production)
- **info**: Normal operational events (request processed, service started)
- **warn**: Unexpected but recoverable conditions (retry after failure, deprecated API used)
- **error**: Errors requiring attention (database unavailable, request failed)

```go
// ✓ Good: Appropriate log levels
logger.Info("server started", slog.Int("port", 8080))
logger.Warn("deprecated API called", slog.String("endpoint", "/v1/users"))
logger.Error("database connection failed", slog.String("error", err.Error()))
```

```go
// ✗ Avoid: Misusing log levels
logger.Error("server started")  // Not an error
logger.Info("database connection failed")  // Should be error
```

## Common Issues

**"logs not appearing in Grafana"**
→ Verify Promtail or OTel Collector is running and configured to ship to Loki. Check that your service is emitting JSON logs to stdout. Use `kubectl logs <pod>` to verify log output format.

**"LogQL query returns no results"**
→ Confirm the label selector matches your logs (e.g., `{service="staccato-server"}`). Check the time range in Grafana Explore. Verify Loki has received logs by checking the Loki Explore page.

**"too many label values" error**
→ You're indexing a high-cardinality field as a label (e.g., user_id, trace_id). Move these fields into the log message body (JSON fields) instead of labels. Only index `service`, `level`, `environment`, and `namespace`.

**"trace-to-log correlation not working in Grafana"**
→ Ensure the log line includes a `trace_id` field matching the OpenTelemetry trace ID. Verify Grafana's Tempo data source is configured with "Derived fields" mapping `trace_id` to Tempo queries.

**"Loki query is slow"**
→ Loki is optimized for label-based filtering, not full-text search. Add more specific label filters (e.g., `{service="x", level="error"}`) before searching log content with `|=`. Reduce the time range if querying long periods.

## See Also

- [OpenTelemetry Usage Rules](./opentelemetry.md) - Trace context propagation
- [Tempo Usage Rules](./tempo.md) - Trace-to-log correlation
- [slog Documentation](https://pkg.go.dev/log/slog) - Structured logging in Go
- [LogQL Documentation](https://grafana.com/docs/loki/latest/logql/) - Loki query language reference
