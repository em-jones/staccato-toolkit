---
created-by-change: evaluate-observability-stack
last-validated: 2026-02-25
---

# Prometheus Usage Rules

Prometheus is the platform's metrics collection and time-series database. All Go services expose a `/metrics` endpoint that Prometheus scrapes at regular intervals. Metrics are visualized in Grafana dashboards and used for alerting.

## Core Principle

Prometheus is the single source of truth for metrics. All services MUST expose a `/metrics` endpoint in Prometheus exposition format. Metrics are scraped by Prometheus (pull model); services do not push metrics directly. Use OpenTelemetry SDK for instrumentation, which exports to Prometheus via the OTel Collector.

## Setup

Expose a `/metrics` endpoint using the Prometheus HTTP handler:

```go
import (
    "github.com/prometheus/client_golang/prometheus/promhttp"
    "net/http"
)

func main() {
    // Register metrics endpoint
    http.Handle("/metrics", promhttp.Handler())

    // Start HTTP server
    http.ListenAndServe(":8080", nil)
}
```

Configure Prometheus to scrape your service (via Kubernetes ServiceMonitor):

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: staccato-server
  namespace: staccato
spec:
  selector:
    matchLabels:
      app: staccato-server
  endpoints:
    - port: metrics
      interval: 15s
      path: /metrics
```

## Key Guidelines

### Metric Naming: Follow Prometheus conventions

Metric names MUST use underscores (not hyphens) and follow the pattern `<service>_<subsystem>_<unit>_total` for counters. Units should be base units (seconds, bytes) not multiples (milliseconds, kilobytes).

```go
// ✓ Good: Clear, semantic metric names
staccato_server_http_requests_total
staccato_server_http_request_duration_seconds
staccato_cli_command_executions_total
```

```go
// ✗ Avoid: Ambiguous or non-standard names
requests                                    // Too vague, missing service prefix
staccato-server-requests                    // Use underscores, not hyphens
staccato_server_http_request_duration_ms    // Use seconds, not milliseconds
```

### Metric Types: Use the right type for the job

- **Counter**: Monotonically increasing value (requests, errors). Suffix with `_total`.
- **Gauge**: Value that can go up or down (active connections, queue depth).
- **Histogram**: Distribution of values (request duration, response size). Automatically creates `_bucket`, `_sum`, and `_count` metrics.

```go
// ✓ Good: Appropriate metric types
import "go.opentelemetry.io/otel/metric"

meter := otel.Meter("staccato-server")

// Counter for total requests
requestCounter, _ := meter.Int64Counter("staccato_server_http_requests_total")
requestCounter.Add(ctx, 1)

// Gauge for active connections
activeConns, _ := meter.Int64UpDownCounter("staccato_server_active_connections")
activeConns.Add(ctx, 1)  // connection opened
activeConns.Add(ctx, -1) // connection closed

// Histogram for request duration
requestDuration, _ := meter.Float64Histogram("staccato_server_http_request_duration_seconds")
requestDuration.Record(ctx, duration.Seconds())
```

```go
// ✗ Avoid: Wrong metric type
// Using a gauge for a counter (resets on restart)
meter.Int64UpDownCounter("staccato_server_http_requests_total")

// Using a counter for a gauge (can't decrease)
meter.Int64Counter("staccato_server_active_connections")
```

### Labels: Use for dimensions, not for high cardinality

Labels allow filtering and aggregation in queries. Use labels for bounded dimensions (status code, method, endpoint). Avoid labels with unbounded cardinality (user ID, trace ID, timestamps).

```go
// ✓ Good: Low-cardinality labels
requestCounter.Add(ctx, 1, metric.WithAttributes(
    attribute.String("method", "GET"),
    attribute.String("endpoint", "/api/users"),
    attribute.Int("status", 200),
))
```

```go
// ✗ Avoid: High-cardinality labels (creates millions of time series)
requestCounter.Add(ctx, 1, metric.WithAttributes(
    attribute.String("user_id", userID),        // Unbounded
    attribute.String("trace_id", traceID),      // Unbounded
    attribute.String("timestamp", time.Now().String()), // Unbounded
))
```

### Queries: Use PromQL for dashboards and alerts

Prometheus Query Language (PromQL) is used in Grafana dashboards and alert rules. Common patterns:

```promql
# Request rate (requests per second)
rate(staccato_server_http_requests_total[5m])

# Error rate (percentage of 5xx responses)
sum(rate(staccato_server_http_requests_total{status=~"5.."}[5m]))
/ sum(rate(staccato_server_http_requests_total[5m]))

# p95 latency
histogram_quantile(0.95, rate(staccato_server_http_request_duration_seconds_bucket[5m]))

# Active connections by service
sum by (service) (staccato_server_active_connections)
```

### Scrape Configuration: Optimize for performance

Scrape intervals should balance freshness and load. Default is 15 seconds for production. For high-traffic services, consider increasing to 30 seconds to reduce overhead.

```yaml
# ✓ Good: Standard scrape interval
endpoints:
  - port: metrics
    interval: 15s
    scrapeTimeout: 10s
```

```yaml
# ✗ Avoid: Too frequent scraping (high load)
endpoints:
  - port: metrics
    interval: 1s # Excessive for most services
```

## Common Issues

**"metrics endpoint returns 404"**
→ Verify the HTTP handler is registered at `/metrics`. Check that the service is listening on the expected port. Use `curl http://localhost:8080/metrics` to test locally.

**"Prometheus shows target as DOWN"**
→ Check the ServiceMonitor selector matches your service's labels. Verify the `port` name in the ServiceMonitor matches the service's port name. Check Prometheus logs for scrape errors.

**"high cardinality warning in Prometheus"**
→ Identify labels with unbounded values (user IDs, trace IDs, timestamps). Remove or aggregate these labels. Use `topk(10, count by (__name__) ({__name__=~".+"}))` to find high-cardinality metrics.

**"missing data in Grafana dashboard"**
→ Verify Prometheus is scraping the service (check Targets page in Prometheus UI). Confirm the PromQL query syntax is correct. Check the time range in Grafana matches when the service was running.

**"histogram buckets not appropriate for my data"**
→ Customize histogram buckets when creating the metric. Example: `metric.WithExplicitBucketBoundaries(0.001, 0.01, 0.1, 1, 10)` for durations from 1ms to 10s.

## See Also

- [OpenTelemetry Usage Rules](./opentelemetry.md) - Metrics instrumentation SDK
- [Grafana](./grafana.md) - Visualization layer
- [Prometheus Documentation](https://prometheus.io/docs/) - Official query and configuration guide
