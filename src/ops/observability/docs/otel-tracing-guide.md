# OpenTelemetry Distributed Tracing Guide

## Overview

This guide documents the standard pattern for instrumenting Go services with OpenTelemetry distributed tracing. All services export spans to the OpenTelemetry Collector via OTLP/gRPC, which forwards them to Tempo for storage and querying.

## Core Components

- **OpenTelemetry Go SDK**: Provides `TracerProvider`, `Tracer`, and span creation APIs
- **OTLP/gRPC Exporter**: Sends spans to the OpenTelemetry Collector
- **W3C TraceContext Propagation**: Ensures trace context flows across service boundaries via HTTP headers
- **Trace-to-Log Correlation**: Links traces to logs via `trace_id` injection into structured log context

## TracerProvider Setup

Initialize the `TracerProvider` at application startup. This is a singleton that manages span exporters and sampling configuration.

```go
package observability

import (
	"context"
	"fmt"
	"os"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

// InitTracer initializes the global OpenTelemetry TracerProvider
// Call this once at application startup, before handling any requests
func InitTracer(ctx context.Context, serviceName string) (func(context.Context) error, error) {
	// OTLP/gRPC exporter configuration
	// Connects to OpenTelemetry Collector (default: localhost:4317)
	exporter, err := otlptracegrpc.New(ctx,
		otlptracegrpc.WithEndpoint(getOTLPEndpoint()),
		otlptracegrpc.WithInsecure(), // Use WithTLSCredentials() for production
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create OTLP trace exporter: %w", err)
	}

	// Resource identifies this service in trace data
	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceNameKey.String(serviceName),
			semconv.ServiceVersionKey.String(os.Getenv("SERVICE_VERSION")),
			semconv.DeploymentEnvironmentKey.String(os.Getenv("ENVIRONMENT")),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create resource: %w", err)
	}

	// Sampling configuration via OTEL_TRACES_SAMPLER environment variable
	// Default: parentbased_traceidratio with 10% sampling rate
	sampler := getSampler()

	// Create TracerProvider
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
		sdktrace.WithSampler(sampler),
	)

	// Register as global TracerProvider
	otel.SetTracerProvider(tp)

	// Register W3C TraceContext propagator (required for cross-service tracing)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	// Return shutdown function to flush spans on graceful shutdown
	return tp.Shutdown, nil
}

// getOTLPEndpoint returns the OTLP collector endpoint from environment
// Default: localhost:4317 (development)
func getOTLPEndpoint() string {
	endpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	if endpoint == "" {
		endpoint = "localhost:4317"
	}
	return endpoint
}

// getSampler configures trace sampling based on OTEL_TRACES_SAMPLER
// Supported values:
//   - "always_on": sample all traces (use for development only)
//   - "always_off": sample no traces
//   - "traceidratio": sample a fraction of traces (set OTEL_TRACES_SAMPLER_ARG=0.1 for 10%)
//   - "parentbased_traceidratio": respect parent sampling decision, else use traceidratio (default)
func getSampler() sdktrace.Sampler {
	samplerType := os.Getenv("OTEL_TRACES_SAMPLER")
	samplerArg := os.Getenv("OTEL_TRACES_SAMPLER_ARG")

	switch samplerType {
	case "always_on":
		return sdktrace.AlwaysSample()
	case "always_off":
		return sdktrace.NeverSample()
	case "traceidratio":
		ratio := parseSamplerArg(samplerArg, 0.1)
		return sdktrace.TraceIDRatioBased(ratio)
	case "parentbased_traceidratio", "":
		// Default: parent-based with 10% sampling for root spans
		ratio := parseSamplerArg(samplerArg, 0.1)
		return sdktrace.ParentBased(sdktrace.TraceIDRatioBased(ratio))
	default:
		// Fallback to default
		return sdktrace.ParentBased(sdktrace.TraceIDRatioBased(0.1))
	}
}

// parseSamplerArg parses the sampling ratio from OTEL_TRACES_SAMPLER_ARG
func parseSamplerArg(arg string, defaultRatio float64) float64 {
	if arg == "" {
		return defaultRatio
	}
	var ratio float64
	if _, err := fmt.Sscanf(arg, "%f", &ratio); err != nil {
		return defaultRatio
	}
	if ratio < 0 || ratio > 1 {
		return defaultRatio
	}
	return ratio
}
```

## HTTP Handler Instrumentation

Use the `otelhttp` middleware to automatically create spans for inbound HTTP requests. This middleware:

- Creates a span for each request with `http.method`, `http.route`, `http.status_code` attributes
- Extracts W3C TraceContext headers from incoming requests (parent span propagation)
- Injects trace context into the request `context.Context`

```go
package main

import (
	"net/http"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

func main() {
	// Initialize tracer (see TracerProvider Setup above)
	shutdown, err := observability.InitTracer(context.Background(), "my-service")
	if err != nil {
		log.Fatalf("failed to initialize tracer: %v", err)
	}
	defer shutdown(context.Background())

	// Wrap HTTP handler with otelhttp middleware
	mux := http.NewServeMux()
	mux.HandleFunc("/orders", handleOrders)

	// otelhttp.NewHandler creates spans for all inbound requests
	handler := otelhttp.NewHandler(mux, "my-service")

	http.ListenAndServe(":8080", handler)
}

func handleOrders(w http.ResponseWriter, r *http.Request) {
	// Trace context is available in r.Context()
	ctx := r.Context()

	// Business logic here — any child spans will be parented to the request span
	processOrder(ctx)

	w.WriteHeader(http.StatusOK)
}
```

## Outbound HTTP Call Instrumentation

For outbound HTTP calls, use `otelhttp.Transport` to automatically inject W3C TraceContext headers and create client spans.

```go
package client

import (
	"context"
	"net/http"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

// NewHTTPClient returns an HTTP client with OpenTelemetry instrumentation
func NewHTTPClient() *http.Client {
	return &http.Client{
		// otelhttp.Transport wraps the default transport
		// Injects traceparent header and creates a span for each outbound request
		Transport: otelhttp.NewTransport(http.DefaultTransport),
	}
}

// Example usage
func fetchInventory(ctx context.Context, productID string) error {
	client := NewHTTPClient()

	req, err := http.NewRequestWithContext(ctx, "GET", "http://inventory-service/products/"+productID, nil)
	if err != nil {
		return err
	}

	// otelhttp.Transport automatically injects W3C traceparent header
	// The downstream service will see this request as a child span
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// Handle response...
	return nil
}
```

## W3C TraceContext Header Propagation

OpenTelemetry uses the W3C TraceContext standard for propagating trace context across service boundaries. The `traceparent` header format is:

```
traceparent: 00-<trace-id>-<span-id>-<trace-flags>
```

Example:
```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

When using `otelhttp.NewHandler` (inbound) and `otelhttp.Transport` (outbound), this header is automatically:
- **Extracted** from incoming requests to continue existing traces
- **Injected** into outgoing requests to propagate trace context

Manual propagation (for non-HTTP boundaries like message queues):

```go
import (
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/propagation"
)

// Inject trace context into message headers
func publishMessage(ctx context.Context, msg Message) error {
	propagator := otel.GetTextMapPropagator()
	carrier := propagation.MapCarrier{}
	propagator.Inject(ctx, carrier)

	// Add carrier headers to message metadata
	msg.Headers = carrier
	return messageQueue.Publish(msg)
}

// Extract trace context from message headers
func consumeMessage(msg Message) context.Context {
	propagator := otel.GetTextMapPropagator()
	carrier := propagation.MapCarrier(msg.Headers)
	ctx := propagator.Extract(context.Background(), carrier)
	return ctx
}
```

## Trace-to-Log Correlation

To enable "Logs for this span" links in Grafana, inject the `trace_id` into structured log context. This allows Loki to correlate logs with traces.

### Integration with `slog` (Go 1.21+)

```go
package logging

import (
	"context"
	"log/slog"
	"os"

	"go.opentelemetry.io/otel/trace"
)

// NewLogger creates a structured logger with trace correlation support
func NewLogger() *slog.Logger {
	return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
}

// WithTraceContext adds trace_id and span_id to log context
// Call this in every handler to ensure logs are correlated with traces
func WithTraceContext(ctx context.Context, logger *slog.Logger) *slog.Logger {
	span := trace.SpanFromContext(ctx)
	if !span.SpanContext().IsValid() {
		return logger
	}

	return logger.With(
		slog.String("trace_id", span.SpanContext().TraceID().String()),
		slog.String("span_id", span.SpanContext().SpanID().String()),
	)
}

// Example usage in handler
func handleRequest(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	logger := logging.WithTraceContext(ctx, baseLogger)

	logger.Info("processing order",
		slog.String("order_id", orderID),
		slog.Int("item_count", len(order.Items)),
	)

	// All logs in this request will include trace_id
	// Grafana Tempo can link to these logs via the trace_id field
}
```

### Required Log Fields for Correlation

Ensure every log entry includes:
- `trace_id` — from `span.SpanContext().TraceID().String()`
- `span_id` — from `span.SpanContext().SpanID().String()` (optional, but recommended)
- `service` — service name (set at logger initialization)
- `timestamp` — ISO 8601 UTC (automatic with `slog`)

Grafana Tempo's trace-to-log correlation (configured in `tempo/values.yaml`) will query Loki for logs matching `{trace_id="<trace-id>"}`.

## Environment Variable Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `localhost:4317` | OTLP/gRPC collector endpoint |
| `OTEL_TRACES_SAMPLER` | `parentbased_traceidratio` | Sampling strategy (see `getSampler()`) |
| `OTEL_TRACES_SAMPLER_ARG` | `0.1` | Sampling ratio (0.0 to 1.0) for `traceidratio` samplers |
| `SERVICE_VERSION` | (none) | Service version (injected into trace resource) |
| `ENVIRONMENT` | (none) | Deployment environment (staging, production) |

### Recommended Sampling Configuration

| Environment | `OTEL_TRACES_SAMPLER` | `OTEL_TRACES_SAMPLER_ARG` | Rationale |
|-------------|------------------------|---------------------------|-----------|
| Development | `always_on` | (ignored) | Trace all requests for debugging |
| Staging | `parentbased_traceidratio` | `0.5` | 50% sampling to balance cost and visibility |
| Production | `parentbased_traceidratio` | `0.1` | 10% sampling to reduce overhead (default) |

## Testing Tracing Instrumentation

### Unit Tests: Verify Span Attributes

```go
package handlers_test

import (
	"context"
	"net/http/httptest"
	"testing"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
)

func TestHandlerCreatesSpan(t *testing.T) {
	// Arrange: in-memory span recorder
	spanRecorder := tracetest.NewSpanRecorder()
	tp := trace.NewTracerProvider(trace.WithSpanProcessor(spanRecorder))
	otel.SetTracerProvider(tp)

	req := httptest.NewRequest("GET", "/orders/123", nil)
	w := httptest.NewRecorder()

	// Act
	handler := otelhttp.NewHandler(http.HandlerFunc(handleOrders), "test-service")
	handler.ServeHTTP(w, req)

	// Assert
	spans := spanRecorder.Ended()
	if len(spans) == 0 {
		t.Fatal("expected at least one span")
	}

	span := spans[0]
	attrs := span.Attributes()
	assertAttribute(t, attrs, "http.method", "GET")
	assertAttribute(t, attrs, "http.route", "/orders/123")
	assertAttribute(t, attrs, "http.status_code", 200)
}
```

### Integration Tests: Verify Trace Propagation

```go
func TestTraceContextPropagation(t *testing.T) {
	// Start downstream service that echoes traceparent header
	downstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		traceparent := r.Header.Get("traceparent")
		w.Write([]byte(traceparent))
	}))
	defer downstream.Close()

	// Make request through instrumented client
	client := NewHTTPClient()
	ctx := context.Background()
	req, _ := http.NewRequestWithContext(ctx, "GET", downstream.URL, nil)

	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	traceparent := string(body)

	// Verify traceparent header format (W3C TraceContext)
	if !strings.HasPrefix(traceparent, "00-") {
		t.Errorf("expected traceparent header, got: %s", traceparent)
	}
}
```

## Common Issues

### "Traces not appearing in Grafana"

- Verify OTLP collector endpoint is reachable: `curl http://localhost:4317`
- Check sampling configuration — `always_off` or very low ratio will suppress traces
- Ensure `InitTracer()` is called at startup before handling requests
- Check OpenTelemetry Collector logs for export errors

### "Trace context not propagating to downstream services"

- Verify `otel.SetTextMapPropagator()` is called with `propagation.TraceContext{}`
- Ensure downstream service uses `otelhttp.NewHandler` to extract `traceparent` header
- Check that outbound HTTP client uses `otelhttp.Transport`
- For non-HTTP boundaries (gRPC, message queues), manually inject/extract trace context

### "Logs not correlated with traces in Grafana"

- Verify `trace_id` field is present in log output (must match exact field name)
- Check Grafana Tempo data source configuration: `tracesToLogs.filterByTraceID` must be `true`
- Ensure Loki has indexed the `trace_id` field (see Loki configuration)
- Verify log timestamp is within the trace-to-log search window (default: ±1 hour)

## See Also

- [Tempo Configuration](../tempo/values.yaml) — Grafana Tempo Helm chart configuration
- [Observability Pattern Rules](../../../../.opencode/rules/patterns/delivery/observability.md) — structured logging, metrics, alerting conventions
- [OpenTelemetry Go Documentation](https://opentelemetry.io/docs/instrumentation/go/)
- [W3C TraceContext Specification](https://www.w3.org/TR/trace-context/)
