# Structured Logging Guide

## Overview

This guide defines the platform standard for structured logging in Go services. All services MUST emit logs as JSON objects using Go's standard library `log/slog` or the `zerolog` package.

**Reference**: `openspec/changes/evaluate-observability-stack/specs/observability-logging/spec.md`

## Purpose

Structured logging enables:
- Machine-parseable log output for aggregation in Loki
- Consistent field names across all services
- Correlation of logs with distributed traces
- Efficient querying and filtering in Grafana

## Required Fields

Every log line MUST include the following fields:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `time` | string | Timestamp in RFC3339 format (UTC) | `2024-01-15T10:30:00Z` |
| `level` | string | Log level: `debug`, `info`, `warn`, `error` | `info` |
| `service` | string | Service name (set at startup) | `api-gateway` |
| `msg` | string | Human-readable message | `Request processed` |
| `trace_id` | string | OpenTelemetry trace ID (when trace context is active) | `4bf92f3577b34da6a3ce929d0e0e4736` |

### Optional Fields

Additional fields MAY be included for context:
- `environment` — deployment environment (`staging`, `production`)
- `version` — service version
- `user_id` — authenticated user ID (opaque identifier, not PII)
- `request_id` — request identifier
- `duration_ms` — operation duration in milliseconds
- `error` — error message (for `level="error"` logs)

## Log Levels

Use log levels according to the following guidelines:

| Level | When to Use | Examples |
|-------|-------------|----------|
| `debug` | Verbose diagnostic information; off in production by default | Variable values, intermediate state, detailed flow |
| `info` | Significant business events | Order placed, user registered, payment processed |
| `warn` | Unexpected but handled conditions | Retry attempt, fallback activated, deprecated API called |
| `error` | Unhandled failures requiring human attention | Database connection failed, external API timeout, panic recovered |

**Never log PII** (email addresses, full names, card numbers) in plaintext. Use opaque IDs and redact sensitive fields.

## Configuration

### Environment Variable

Log level SHALL be configurable via the `LOG_LEVEL` environment variable:

```bash
export LOG_LEVEL=info  # Valid values: debug, info, warn, error
```

Services MUST read this variable at startup and configure the logger accordingly.

### Service Name

The `service` field MUST be set at application startup and remain constant for the lifetime of the process. Use the service's canonical name (e.g., `api-gateway`, `order-service`, `payment-processor`).

## Implementation with `log/slog`

Go's standard library `log/slog` (Go 1.21+) provides structured logging with JSON output.

### Basic Setup

```go
package main

import (
    "context"
    "log/slog"
    "os"
)

func main() {
    // Read log level from environment
    logLevel := os.Getenv("LOG_LEVEL")
    if logLevel == "" {
        logLevel = "info"
    }
    
    var level slog.Level
    switch logLevel {
    case "debug":
        level = slog.LevelDebug
    case "info":
        level = slog.LevelInfo
    case "warn":
        level = slog.LevelWarn
    case "error":
        level = slog.LevelError
    default:
        level = slog.LevelInfo
    }
    
    // Create JSON handler with service name
    handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: level,
    })
    
    // Add service name to all logs
    logger := slog.New(handler).With(
        slog.String("service", "api-gateway"),
    )
    
    // Set as default logger
    slog.SetDefault(logger)
    
    // Example log
    slog.Info("Service started",
        slog.String("version", "1.2.3"),
        slog.String("environment", "production"),
    )
}
```

### Logging with Context

When a trace context is active, extract the trace ID and include it in logs:

```go
import (
    "context"
    "log/slog"
    "go.opentelemetry.io/otel/trace"
)

func LogWithTrace(ctx context.Context, msg string, args ...any) {
    // Extract trace ID from context
    span := trace.SpanFromContext(ctx)
    if span.SpanContext().IsValid() {
        traceID := span.SpanContext().TraceID().String()
        args = append(args, slog.String("trace_id", traceID))
    }
    
    slog.InfoContext(ctx, msg, args...)
}

// Usage
func HandleRequest(ctx context.Context) {
    LogWithTrace(ctx, "Processing request",
        slog.String("user_id", "usr_12345"),
        slog.Int("duration_ms", 42),
    )
}
```

### Helper Function for Trace Context

Create a reusable helper to automatically include trace IDs:

```go
package logging

import (
    "context"
    "log/slog"
    "go.opentelemetry.io/otel/trace"
)

// Logger wraps slog with trace context support
type Logger struct {
    *slog.Logger
}

func NewLogger(handler slog.Handler, service string) *Logger {
    logger := slog.New(handler).With(
        slog.String("service", service),
    )
    return &Logger{Logger: logger}
}

func (l *Logger) InfoContext(ctx context.Context, msg string, args ...any) {
    l.Logger.InfoContext(ctx, msg, l.withTrace(ctx, args)...)
}

func (l *Logger) ErrorContext(ctx context.Context, msg string, args ...any) {
    l.Logger.ErrorContext(ctx, msg, l.withTrace(ctx, args)...)
}

func (l *Logger) withTrace(ctx context.Context, args []any) []any {
    span := trace.SpanFromContext(ctx)
    if span.SpanContext().IsValid() {
        traceID := span.SpanContext().TraceID().String()
        return append(args, slog.String("trace_id", traceID))
    }
    return args
}
```

## Implementation with `zerolog`

Alternatively, use the `zerolog` package for high-performance structured logging:

```go
package main

import (
    "context"
    "os"
    "github.com/rs/zerolog"
    "github.com/rs/zerolog/log"
    "go.opentelemetry.io/otel/trace"
)

func main() {
    // Read log level from environment
    logLevel := os.Getenv("LOG_LEVEL")
    if logLevel == "" {
        logLevel = "info"
    }
    
    level, err := zerolog.ParseLevel(logLevel)
    if err != nil {
        level = zerolog.InfoLevel
    }
    
    // Configure global logger
    zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
    zerolog.SetGlobalLevel(level)
    
    log.Logger = log.Output(os.Stdout).With().
        Str("service", "api-gateway").
        Logger()
    
    // Example log
    log.Info().
        Str("version", "1.2.3").
        Str("environment", "production").
        Msg("Service started")
}

// Logging with trace context
func LogWithTrace(ctx context.Context) zerolog.Logger {
    logger := log.With().Logger()
    
    span := trace.SpanFromContext(ctx)
    if span.SpanContext().IsValid() {
        traceID := span.SpanContext().TraceID().String()
        logger = logger.With().Str("trace_id", traceID).Logger()
    }
    
    return logger
}

// Usage
func HandleRequest(ctx context.Context) {
    LogWithTrace(ctx).Info().
        Str("user_id", "usr_12345").
        Int("duration_ms", 42).
        Msg("Processing request")
}
```

## Example Log Output

### Info Log with Trace Context

```json
{
  "time": "2024-01-15T10:30:00Z",
  "level": "info",
  "service": "api-gateway",
  "msg": "Request processed",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "user_id": "usr_12345",
  "duration_ms": 42,
  "status_code": 200
}
```

### Error Log

```json
{
  "time": "2024-01-15T10:31:15Z",
  "level": "error",
  "service": "payment-processor",
  "msg": "Payment processing failed",
  "trace_id": "7ac8d2e944b54f1c8f9a3b2e1d0c5a6b",
  "user_id": "usr_67890",
  "payment_id": "pay_abc123",
  "error": "connection timeout to payment gateway",
  "retry_count": 3
}
```

### Debug Log (verbose)

```json
{
  "time": "2024-01-15T10:29:45Z",
  "level": "debug",
  "service": "order-service",
  "msg": "Validating order items",
  "trace_id": "2f5c8a3b7e1d4c9a6f0e8b3d5c2a1e4f",
  "order_id": "ord_xyz789",
  "item_count": 3,
  "total_cents": 4999
}
```

## Querying Logs in Grafana

With structured logs shipped to Loki, you can query using LogQL:

### Filter by Service
```logql
{service="api-gateway"}
```

### Filter by Log Level
```logql
{level="error"}
```

### Combine Filters
```logql
{service="payment-processor", level="error", environment="production"}
```

### Find Logs for a Specific Trace
```logql
{trace_id="4bf92f3577b34da6a3ce929d0e0e4736"}
```

### Extract and Count Errors by Service
```logql
sum by (service) (count_over_time({level="error"}[5m]))
```

## Testing

### Unit Tests

Verify that your logger includes all required fields:

```go
func TestLoggerRequiredFields(t *testing.T) {
    var buf bytes.Buffer
    handler := slog.NewJSONHandler(&buf, &slog.HandlerOptions{
        Level: slog.LevelInfo,
    })
    logger := slog.New(handler).With(
        slog.String("service", "test-service"),
    )
    
    logger.Info("Test message")
    
    var logEntry map[string]interface{}
    if err := json.Unmarshal(buf.Bytes(), &logEntry); err != nil {
        t.Fatalf("Failed to parse log output: %v", err)
    }
    
    // Verify required fields
    requiredFields := []string{"time", "level", "msg", "service"}
    for _, field := range requiredFields {
        if _, ok := logEntry[field]; !ok {
            t.Errorf("Missing required field: %s", field)
        }
    }
}
```

### Integration Tests

Verify that logs appear in Loki within the required 30-second latency:

1. Deploy test service with structured logging
2. Emit a log line with a unique identifier
3. Query Loki for the log line within 30 seconds
4. Verify all required fields are present and indexed

## Checklist

When implementing structured logging in a new service:

- [ ] Configure logger to output JSON format
- [ ] Set `service` field at startup (from service name)
- [ ] Read `LOG_LEVEL` from environment variable
- [ ] Include all required fields: `time`, `level`, `service`, `msg`
- [ ] Extract and include `trace_id` when trace context is active
- [ ] Use appropriate log levels (`debug`, `info`, `warn`, `error`)
- [ ] Avoid logging PII in plaintext
- [ ] Test that logs appear in Loki within 30 seconds
- [ ] Verify logs are queryable by `service`, `level`, and `trace_id` labels

## References

- Go `log/slog` documentation: https://pkg.go.dev/log/slog
- `zerolog` package: https://github.com/rs/zerolog
- OpenTelemetry Go: https://opentelemetry.io/docs/languages/go/
- Loki LogQL: https://grafana.com/docs/loki/latest/query/
- Platform observability patterns: `.opencode/rules/patterns/delivery/observability.md`
