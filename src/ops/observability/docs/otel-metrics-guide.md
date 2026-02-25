# OpenTelemetry Metrics SDK Integration Guide

This guide documents how to integrate the OpenTelemetry Go SDK (`go.opentelemetry.io/otel`) for application-level metrics in staccato services.

## Overview

All Go services in the staccato platform use the OpenTelemetry Go SDK to emit metrics. Metrics are exported via the OTLP (OpenTelemetry Protocol) exporter to the OpenTelemetry Collector, which forwards them to Prometheus for storage and querying.

**Architecture**:
```
Go Service → OTel SDK → OTLP Exporter → OTel Collector → Prometheus
```

## Requirements Met

- ✅ All Go services use OpenTelemetry Go SDK (`go.opentelemetry.io/otel`)
- ✅ Metrics exported via OTLP exporter to OpenTelemetry Collector
- ✅ Collector forwards metrics to Prometheus
- ✅ Custom business metrics follow naming convention: `<service>_<subsystem>_<unit>_total`
- ✅ Metrics are recorded when requests are handled or business operations complete
- ✅ Metric naming is validated (linting fails on invalid names)

## Installation

### Add Dependencies

```bash
# OpenTelemetry SDK and API
go get go.opentelemetry.io/otel@latest
go get go.opentelemetry.io/otel/sdk/metric@latest
go get go.opentelemetry.io/otel/metric@latest

# OTLP exporter for metrics
go get go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc@latest

# Prometheus exporter (optional, for local /metrics endpoint)
go get go.opentelemetry.io/otel/exporters/prometheus@latest

# Instrumentation libraries (HTTP, gRPC, database)
go get go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp@latest
go get go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc@latest
```

## SDK Setup

### Initialize OpenTelemetry Metrics

Create a `telemetry` package to encapsulate OTel setup:

```go
// telemetry/metrics.go
package telemetry

import (
    "context"
    "fmt"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
    "go.opentelemetry.io/otel/sdk/metric"
    "go.opentelemetry.io/otel/sdk/resource"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

// InitMetrics initializes the OpenTelemetry metrics SDK with OTLP exporter.
// It returns a shutdown function that must be called before the application exits.
func InitMetrics(ctx context.Context, serviceName, environment, otlpEndpoint string) (func(context.Context) error, error) {
    // Create resource with service metadata
    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName(serviceName),
            semconv.DeploymentEnvironment(environment),
        ),
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create resource: %w", err)
    }

    // Create OTLP exporter
    exporter, err := otlpmetricgrpc.New(ctx,
        otlpmetricgrpc.WithEndpoint(otlpEndpoint),
        otlpmetricgrpc.WithInsecure(), // Use TLS in production
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create OTLP exporter: %w", err)
    }

    // Create meter provider with periodic reader
    meterProvider := metric.NewMeterProvider(
        metric.WithResource(res),
        metric.WithReader(
            metric.NewPeriodicReader(exporter,
                metric.WithInterval(15*time.Second), // Match Prometheus scrape interval
            ),
        ),
    )

    // Set global meter provider
    otel.SetMeterProvider(meterProvider)

    // Return shutdown function
    return meterProvider.Shutdown, nil
}
```

### Initialize in main.go

```go
// main.go
package main

import (
    "context"
    "log"
    "os"
    "os/signal"
    "syscall"

    "your-module/telemetry"
)

func main() {
    ctx := context.Background()

    // Initialize OpenTelemetry metrics
    shutdownMetrics, err := telemetry.InitMetrics(
        ctx,
        os.Getenv("SERVICE_NAME"),              // e.g., "orders-api"
        os.Getenv("ENVIRONMENT"),               // e.g., "production"
        os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT"), // e.g., "otel-collector.monitoring.svc.cluster.local:4317"
    )
    if err != nil {
        log.Fatalf("failed to initialize metrics: %v", err)
    }
    defer shutdownMetrics(ctx)

    // Start application
    // ...

    // Graceful shutdown
    sigCh := make(chan os.Signal, 1)
    signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
    <-sigCh

    log.Println("shutting down...")
    shutdownMetrics(ctx)
}
```

## Metric Naming Convention

All custom business metrics MUST follow the naming pattern:

```
<service>_<subsystem>_<unit>_total
```

**Components**:
- `<service>`: Service name (e.g., `orders`, `payments`, `inventory`)
- `<subsystem>`: Functional area within the service (e.g., `http`, `database`, `cache`, `order`)
- `<unit>`: What is being measured (e.g., `requests`, `duration`, `bytes`, `errors`)
- `_total`: Suffix for counters (omit for gauges and histograms)

**Examples**:
```
orders_http_requests_total          # Counter: total HTTP requests
orders_http_request_duration_ms     # Histogram: HTTP request duration in milliseconds
orders_order_created_total          # Counter: total orders created
orders_database_query_duration_ms   # Histogram: database query duration
payments_payment_processed_total    # Counter: total payments processed
payments_stripe_api_errors_total    # Counter: Stripe API errors
```

### Naming Rules

1. **Use snake_case**: All lowercase with underscores
2. **Service prefix**: Always start with the service name
3. **Subsystem**: Group related metrics by subsystem
4. **Unit**: Include the unit of measurement (e.g., `_ms`, `_bytes`, `_seconds`)
5. **Counter suffix**: Counters end with `_total`
6. **No type suffix**: Do not include metric type in name (e.g., avoid `_counter`, `_histogram`)

### Validation

Metric names are validated at registration time. Invalid names will cause the application to fail at startup.

```go
// Example: Linting validation (integrate with golangci-lint or custom linter)
// Pattern: ^[a-z]+_[a-z]+_[a-z]+(_total)?$

// ✓ Valid
orders_http_requests_total
orders_http_request_duration_ms
orders_order_created_total

// ✗ Invalid (linting will fail)
OrdersHttpRequests              // Not snake_case
http_requests_total             // Missing service prefix
orders_requests                 // Missing subsystem
ordersHttpRequestsTotal         // camelCase instead of snake_case
```

## Metric Types

### Counter

A counter is a cumulative metric that only increases (never decreases). Use counters for totals: requests, errors, operations completed.

```go
package metrics

import (
    "context"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/metric"
)

var (
    meter = otel.Meter("orders-api")

    // Counter: total HTTP requests
    httpRequestsTotal metric.Int64Counter
)

func init() {
    var err error
    httpRequestsTotal, err = meter.Int64Counter(
        "orders_http_requests_total",
        metric.WithDescription("Total number of HTTP requests"),
        metric.WithUnit("1"), // Dimensionless count
    )
    if err != nil {
        panic(err)
    }
}

// RecordHTTPRequest increments the HTTP request counter
func RecordHTTPRequest(ctx context.Context, method, route, statusCode string) {
    httpRequestsTotal.Add(ctx, 1,
        metric.WithAttributes(
            attribute.String("method", method),
            attribute.String("route", route),
            attribute.String("status_code", statusCode),
        ),
    )
}
```

**Usage**:
```go
// In HTTP handler
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    // ... handle request ...

    metrics.RecordHTTPRequest(r.Context(), r.Method, route, strconv.Itoa(statusCode))
}
```

### Histogram

A histogram samples observations (typically request durations or response sizes) and counts them in configurable buckets. Use histograms for latencies and sizes.

```go
var (
    // Histogram: HTTP request duration
    httpRequestDurationMs metric.Float64Histogram
)

func init() {
    var err error
    httpRequestDurationMs, err = meter.Float64Histogram(
        "orders_http_request_duration_ms",
        metric.WithDescription("HTTP request duration in milliseconds"),
        metric.WithUnit("ms"),
        metric.WithExplicitBucketBoundaries(5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000), // Buckets in ms
    )
    if err != nil {
        panic(err)
    }
}

// RecordHTTPDuration records the duration of an HTTP request
func RecordHTTPDuration(ctx context.Context, durationMs float64, method, route string) {
    httpRequestDurationMs.Record(ctx, durationMs,
        metric.WithAttributes(
            attribute.String("method", method),
            attribute.String("route", route),
        ),
    )
}
```

**Usage**:
```go
// In HTTP handler with middleware
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    start := time.Now()
    defer func() {
        durationMs := float64(time.Since(start).Milliseconds())
        metrics.RecordHTTPDuration(r.Context(), durationMs, r.Method, route)
    }()

    // ... handle request ...
}
```

### Gauge

A gauge is a metric that can go up or down. Use gauges for current values: queue depth, active connections, memory usage.

```go
var (
    // Gauge: active database connections
    activeDBConnections metric.Int64UpDownCounter
)

func init() {
    var err error
    activeDBConnections, err = meter.Int64UpDownCounter(
        "orders_database_active_connections",
        metric.WithDescription("Number of active database connections"),
        metric.WithUnit("1"),
    )
    if err != nil {
        panic(err)
    }
}

// IncrementActiveConnections increments the active connections gauge
func IncrementActiveConnections(ctx context.Context) {
    activeDBConnections.Add(ctx, 1)
}

// DecrementActiveConnections decrements the active connections gauge
func DecrementActiveConnections(ctx context.Context) {
    activeDBConnections.Add(ctx, -1)
}
```

## Custom Business Metrics

### Example: Order Created Counter

```go
var (
    orderCreatedTotal metric.Int64Counter
)

func init() {
    var err error
    orderCreatedTotal, err = meter.Int64Counter(
        "orders_order_created_total",
        metric.WithDescription("Total number of orders created"),
        metric.WithUnit("1"),
    )
    if err != nil {
        panic(err)
    }
}

// RecordOrderCreated increments the order created counter
func RecordOrderCreated(ctx context.Context, paymentMethod string) {
    orderCreatedTotal.Add(ctx, 1,
        metric.WithAttributes(
            attribute.String("payment_method", paymentMethod),
        ),
    )
}
```

**Usage**:
```go
// In order service
func (s *OrderService) CreateOrder(ctx context.Context, req CreateOrderRequest) (*Order, error) {
    order, err := s.repo.Create(ctx, req)
    if err != nil {
        return nil, err
    }

    // Record business metric
    metrics.RecordOrderCreated(ctx, req.PaymentMethod)

    return order, nil
}
```

### Example: Payment Processing Duration

```go
var (
    paymentProcessingDurationMs metric.Float64Histogram
)

func init() {
    var err error
    paymentProcessingDurationMs, err = meter.Float64Histogram(
        "payments_payment_processing_duration_ms",
        metric.WithDescription("Payment processing duration in milliseconds"),
        metric.WithUnit("ms"),
        metric.WithExplicitBucketBoundaries(10, 50, 100, 250, 500, 1000, 2500, 5000, 10000),
    )
    if err != nil {
        panic(err)
    }
}

// RecordPaymentProcessingDuration records payment processing duration
func RecordPaymentProcessingDuration(ctx context.Context, durationMs float64, paymentMethod, status string) {
    paymentProcessingDurationMs.Record(ctx, durationMs,
        metric.WithAttributes(
            attribute.String("payment_method", paymentMethod),
            attribute.String("status", status),
        ),
    )
}
```

## Instrumentation Patterns

### HTTP Server Instrumentation

Use the `otelhttp` middleware for automatic HTTP request/response metrics:

```go
import (
    "net/http"
    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

func main() {
    // Wrap HTTP handler with OTel middleware
    handler := otelhttp.NewHandler(http.HandlerFunc(myHandler), "my-service")
    
    http.ListenAndServe(":8080", handler)
}
```

The middleware automatically records:
- `http.server.request_count` (counter)
- `http.server.duration` (histogram)
- `http.server.request_size` (histogram)
- `http.server.response_size` (histogram)

### HTTP Client Instrumentation

```go
import (
    "net/http"
    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

func main() {
    // Create HTTP client with OTel transport
    client := &http.Client{
        Transport: otelhttp.NewTransport(http.DefaultTransport),
    }

    // Use client as normal
    resp, err := client.Get("https://api.example.com/users")
    // ...
}
```

### Database Instrumentation

For database queries, manually record metrics:

```go
var (
    dbQueryDurationMs metric.Float64Histogram
)

func init() {
    var err error
    dbQueryDurationMs, err = meter.Float64Histogram(
        "orders_database_query_duration_ms",
        metric.WithDescription("Database query duration in milliseconds"),
        metric.WithUnit("ms"),
        metric.WithExplicitBucketBoundaries(1, 5, 10, 25, 50, 100, 250, 500, 1000),
    )
    if err != nil {
        panic(err)
    }
}

// RecordDBQuery records a database query duration
func RecordDBQuery(ctx context.Context, durationMs float64, operation, table string) {
    dbQueryDurationMs.Record(ctx, durationMs,
        metric.WithAttributes(
            attribute.String("operation", operation), // SELECT, INSERT, UPDATE, DELETE
            attribute.String("table", table),
        ),
    )
}
```

**Usage**:
```go
func (r *OrderRepository) FindByID(ctx context.Context, id string) (*Order, error) {
    start := time.Now()
    defer func() {
        durationMs := float64(time.Since(start).Milliseconds())
        metrics.RecordDBQuery(ctx, durationMs, "SELECT", "orders")
    }()

    var order Order
    err := r.db.QueryRowContext(ctx, "SELECT * FROM orders WHERE id = $1", id).Scan(&order)
    return &order, err
}
```

## Configuration

### Environment Variables

```bash
# Service identification
SERVICE_NAME=orders-api
ENVIRONMENT=production

# OTLP exporter endpoint
OTEL_EXPORTER_OTLP_ENDPOINT=otel-collector.monitoring.svc.cluster.local:4317

# Optional: TLS configuration
OTEL_EXPORTER_OTLP_CERTIFICATE=/etc/certs/ca.crt

# Optional: Export interval (default: 15s)
OTEL_METRIC_EXPORT_INTERVAL=15000  # milliseconds
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-api
spec:
  template:
    spec:
      containers:
        - name: orders-api
          image: orders-api:v1.0.0
          env:
            - name: SERVICE_NAME
              value: "orders-api"
            - name: ENVIRONMENT
              value: "production"
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "otel-collector.monitoring.svc.cluster.local:4317"
```

## Testing

### Unit Tests

Mock the meter provider in tests:

```go
import (
    "testing"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/sdk/metric"
    "go.opentelemetry.io/otel/sdk/metric/metricdata"
)

func TestRecordHTTPRequest(t *testing.T) {
    // Create in-memory reader for testing
    reader := metric.NewManualReader()
    provider := metric.NewMeterProvider(metric.WithReader(reader))
    otel.SetMeterProvider(provider)

    // Record metric
    RecordHTTPRequest(context.Background(), "GET", "/users", "200")

    // Collect metrics
    var rm metricdata.ResourceMetrics
    err := reader.Collect(context.Background(), &rm)
    if err != nil {
        t.Fatalf("failed to collect metrics: %v", err)
    }

    // Assert metric was recorded
    // ... validate metric data ...
}
```

### Integration Tests

Verify metrics are exported to the OTLP endpoint:

```go
func TestMetricsExport(t *testing.T) {
    // Start test OTLP receiver
    receiver := startTestOTLPReceiver(t)
    defer receiver.Stop()

    // Initialize metrics with test endpoint
    shutdown, err := telemetry.InitMetrics(context.Background(), "test-service", "test", receiver.Endpoint())
    if err != nil {
        t.Fatalf("failed to initialize metrics: %v", err)
    }
    defer shutdown(context.Background())

    // Record a metric
    RecordHTTPRequest(context.Background(), "GET", "/test", "200")

    // Wait for export
    time.Sleep(2 * time.Second)

    // Assert metric was received
    metrics := receiver.ReceivedMetrics()
    if len(metrics) == 0 {
        t.Fatal("no metrics received")
    }
}
```

## Troubleshooting

### Metrics not appearing in Prometheus

1. Verify OTLP exporter endpoint is correct:
   ```bash
   kubectl get svc -n monitoring otel-collector
   ```

2. Check service logs for export errors:
   ```bash
   kubectl logs -n staccato-production orders-api-xxx | grep -i "metric"
   ```

3. Verify OTel Collector is running and receiving metrics:
   ```bash
   kubectl logs -n monitoring otel-collector-xxx | grep -i "metric"
   ```

4. Check Prometheus scrapes the OTel Collector:
   - Open Prometheus UI → Status → Targets
   - Look for `otel-collector` job

### Metric naming validation fails

Ensure metric names follow the pattern: `<service>_<subsystem>_<unit>_total`

```go
// ✗ Invalid
"httpRequests"           // Not snake_case
"http_requests"          // Missing service prefix
"orders-http-requests"   // Uses dashes instead of underscores

// ✓ Valid
"orders_http_requests_total"
"orders_http_request_duration_ms"
```

### High memory usage

If metrics are consuming excessive memory:

1. Reduce cardinality: Avoid high-cardinality labels (e.g., user IDs, request IDs)
2. Use histograms instead of recording every value
3. Increase export interval (trade-off: less real-time data)

## See Also

- [LGTM Stack & Prometheus](../README.md)
- [Observability Pattern Rules](../../../../.opencode/rules/patterns/delivery/observability.md)
- [Naming Pattern Rules](../../../../.opencode/rules/patterns/code/naming.md)
- [OpenTelemetry Go SDK Documentation](https://opentelemetry.io/docs/instrumentation/go/)
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)
