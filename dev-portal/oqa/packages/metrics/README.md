# OQA Metrics

Metrics utilities and OpenTelemetry metric integration.

## Alignment with OQA Ecosystem Spec

Implements the **Performance Signal** requirement - quantitative measures of system behavior derived from OTel metrics.

### Performance Metrics

Computed from OTel histogram/summary metrics:

- `latency_percentile`: Response time percentiles (p50, p90, p99)
- `throughput`: Requests per second
- `cpu_utilization`: CPU usage percentage
- `memory_utilization`: Memory usage percentage

### Metric Types

- Counter: Cumulative values (error counts, request counts)
- Gauge: Point-in-time values (current connections)
- Histogram: Statistical distributions (latency buckets)
- Summary: Aggregated percentiles
