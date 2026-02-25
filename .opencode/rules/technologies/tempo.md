---
created-by-change: evaluate-observability-stack
last-validated: 2026-02-25
---

# Grafana Tempo Usage Rules

Grafana Tempo is the platform's distributed tracing backend. Services instrument with OpenTelemetry and export traces via OTLP to the OTel Collector, which forwards to Tempo. Traces are queried in Grafana Explore using TraceQL and correlated with logs and metrics.

## Core Principle

Tempo stores distributed traces and provides TraceQL queries in Grafana. All Go services MUST instrument with OpenTelemetry SDK and export spans via OTLP. Tempo is the single tracing backend; Jaeger is not used. Traces are sampled (default 10% in production) to control storage costs. Tempo integrates with Loki for trace-to-log correlation.

## Setup

Tempo is deployed via Helm and configured as a Grafana data source:

```yaml
# Helm values for Tempo
tempo:
  storage:
    trace:
      backend: s3  # Use object storage for cost-effective long-term retention
      s3:
        bucket: tempo-traces
        endpoint: s3.amazonaws.com
  retention: 720h  # 30 days
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: 0.0.0.0:4317
```

Configure Grafana data source:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
data:
  tempo.yaml: |
    apiVersion: 1
    datasources:
      - name: Tempo
        type: tempo
        access: proxy
        url: http://tempo:3100
        jsonData:
          tracesToLogs:
            datasourceUid: loki  # Enable trace-to-log correlation
            tags: [trace_id]
            mappedTags: [{key: 'trace_id', value: 'trace_id'}]
```

## Key Guidelines

### Trace Instrumentation: Use OpenTelemetry SDK

All services MUST use the OpenTelemetry Go SDK to create spans. Spans are automatically exported to Tempo via the OTel Collector.

```go
// ✓ Good: Instrumented HTTP handler with OTel
import "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"

mux := http.NewServeMux()
mux.Handle("/api", otelhttp.NewHandler(apiHandler, "api"))
http.ListenAndServe(":8080", mux)
```

See the [OpenTelemetry Usage Rules](./opentelemetry.md) for detailed instrumentation patterns.

### TraceQL Queries: Search and filter traces

TraceQL is Tempo's query language for finding traces. Use it in Grafana Explore to filter by service, duration, status, or custom span attributes.

```traceql
# Find traces for a specific service
{service.name="staccato-server"}

# Find slow traces (> 1 second duration)
{duration > 1s}

# Find traces with errors
{status=error}

# Find traces with specific HTTP status
{span.http.status_code=500}

# Combine filters
{service.name="staccato-server" && duration > 500ms && status=error}

# Find traces with specific custom attribute
{span.user_id="user-123"}
```

### Trace-to-Log Correlation: Navigate from traces to logs

When viewing a trace in Grafana, click "Logs for this span" to see related Loki logs. This requires:

1. Logs include a `trace_id` field matching the OpenTelemetry trace ID
2. Grafana Tempo data source is configured with `tracesToLogs` mapping
3. Loki is configured as a data source in Grafana

```go
// ✓ Good: Include trace_id in logs for correlation
import (
    "log/slog"
    "go.opentelemetry.io/otel/trace"
)

span := trace.SpanFromContext(ctx)
if span.SpanContext().IsValid() {
    logger.InfoContext(ctx, "processing request",
        slog.String("trace_id", span.SpanContext().TraceID().String()),
        slog.String("span_id", span.SpanContext().SpanID().String()),
    )
}
```

### Sampling: Configure for production

Tempo stores ALL spans it receives, so sampling MUST be configured at the SDK level to control costs. Default production sampling is 10% (`traceidratio=0.1`).

```yaml
# ✓ Good: Production sampling configuration
env:
  - name: OTEL_TRACES_SAMPLER
    value: "parentbased_traceidratio"
  - name: OTEL_TRACES_SAMPLER_ARG
    value: "0.1"  # 10% sampling
```

```yaml
# ✗ Avoid: 100% sampling in production (high storage costs)
env:
  - name: OTEL_TRACES_SAMPLER
    value: "always_on"
```

For high-traffic services, consider lower sampling rates (5% or 1%). For development/staging, 100% sampling is acceptable.

### Span Attributes: Add context for debugging

Add custom attributes to spans to make traces more useful for debugging. Use semantic conventions where available.

```go
// ✓ Good: Add useful span attributes
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
)

tracer := otel.Tracer("staccato-server")
ctx, span := tracer.Start(ctx, "process_order")
defer span.End()

span.SetAttributes(
    attribute.String("user_id", userID),
    attribute.String("order_id", orderID),
    attribute.Int("item_count", len(items)),
    attribute.String("payment_method", "credit_card"),
)
```

```go
// ✗ Avoid: Missing context in spans
ctx, span := tracer.Start(ctx, "process_order")
defer span.End()
// No attributes, hard to debug specific orders
```

### Retention: Balance cost and debugging needs

Tempo retention is configured in the Helm chart. Default is 30 days for production. Adjust based on storage costs and debugging requirements.

```yaml
# ✓ Good: Tiered retention strategy
# Development: 7 days (fast iteration)
# Staging: 14 days (pre-production testing)
# Production: 30 days (incident investigation)
```

## Common Issues

**"traces not appearing in Tempo"**
→ Verify the OTel Collector is running and configured to forward traces to Tempo. Check that services are exporting spans via OTLP to the collector endpoint (`OTEL_EXPORTER_OTLP_ENDPOINT`). Verify sampling is not set to `always_off`.

**"trace-to-log correlation not working"**
→ Ensure logs include a `trace_id` field matching the OpenTelemetry trace ID format (32-character hex string). Verify Grafana's Tempo data source has `tracesToLogs` configured with the correct Loki data source UID.

**"TraceQL query returns no results"**
→ Check the time range in Grafana Explore. Verify the service name matches the OTel SDK configuration (`resource.WithAttributes(semconv.ServiceNameKey.String("..."))`). Confirm traces are being sampled and exported (check OTel Collector logs).

**"high Tempo storage costs"**
→ Reduce sampling rate (e.g., from 10% to 5% or 1%). Configure object storage (S3) instead of local disk for long-term retention. Reduce retention period if 30 days is excessive for your use case.

**"missing spans in trace"**
→ Verify context propagation: ensure `context.Context` is passed through all function calls. Check that downstream services are also instrumented with OTel. Verify W3C `traceparent` headers are included in outbound HTTP requests.

## See Also

- [OpenTelemetry Usage Rules](./opentelemetry.md) - Trace instrumentation SDK
- [Loki Usage Rules](./loki.md) - Trace-to-log correlation
- [TraceQL Documentation](https://grafana.com/docs/tempo/latest/traceql/) - Tempo query language reference
- [Tempo Configuration](https://grafana.com/docs/tempo/latest/configuration/) - Storage and retention settings
