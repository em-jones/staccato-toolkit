# Effect Observability Guide

## Overview

Effect provides three pillars of observability out of the box:

1. **Logging** — Structured, contextual log messages
2. **Metrics** — Counters, gauges, histograms, summaries, frequency
3. **Tracing** — Distributed traces via OpenTelemetry

All three signals are automatically correlated through fiber IDs and span context.

## Logging

### Log Levels

```
TRACE < DEBUG < INFO < WARN < ERROR < FATAL < NONE
```

Default minimum level: **INFO** (DEBUG and TRACE are hidden)

### Basic Logging

```typescript
import { Effect, Logger, LogLevel } from "effect";

Effect.log("message"); // INFO
Effect.logDebug("message"); // DEBUG
Effect.logInfo("message"); // INFO
Effect.logWarning("message"); // WARN
Effect.logError("message"); // ERROR
Effect.logFatal("message"); // FATAL

// Log with causes (includes full error context)
Effect.log("operation failed", Cause.fail(new Error("details")));

// Log with annotations
Effect.log("user action", { userId: "123", action: "login" });
```

### Log Annotations

```typescript
// Add annotations to all logs within an effect
program.pipe(
  Effect.annotateLogs({
    requestId: "abc-123",
    userId: "456",
    endpoint: "/api/users",
  }),
);

// Scoped annotations (only for this effect and children)
program.pipe(Effect.withLogAnnotations({ requestId: "abc-123" }));

// Annotate with effect result
program.pipe(Effect.tap((result) => Effect.annotateLogs("result", result)));
```

### Log Spans

```typescript
// Measure time for a block of code
program.pipe(Effect.withSpan("operation-name"));

// Nested spans
Effect.gen(function* () {
  return yield* Effect.gen(function* () {
    return yield* childOperation.pipe(Effect.withSpan("child"));
  }).pipe(Effect.withSpan("parent"));
}).pipe(Effect.withSpan("root"));
```

### Logger Configuration

```typescript
// Set minimum log level globally
program.pipe(Logger.withMinimumLogLevel(LogLevel.Debug));

// Set per-effect
effect1.pipe(Logger.withMinimumLogLevel(LogLevel.Debug));
effect2.pipe(Logger.withMinimumLogLevel(LogLevel.Error));

// Built-in logger formats
Logger.stringLogger; // Default: key=value pairs
Logger.prettyLogger; // Human-readable with colors (dev)
Logger.logfmtLogger; // logfmt format
Logger.jsonLogger; // JSON structured (prod)
Logger.structuredLogger; // Structured object

// Combine loggers (log to multiple destinations)
Logger.zip(Logger.stringLogger, Logger.jsonLogger);

// Replace logger
Effect.provide(program, Logger.replace(Logger.defaultLogger, Logger.jsonLogger));

// Filter logs
Logger.filterLogs((logEntry) => logEntry.level >= LogLevel.Warn);
```

### Loading Log Level from Config

```typescript
import { Config, Logger, LogLevel } from "effect";

const logLevelConfig = Config.logLevel("LOG_LEVEL").pipe(Config.withDefault(LogLevel.Info));

const LogLevelLive = Layer.effect(
  Logger.defaultLogger,
  Effect.gen(function* () {
    const level = yield* logLevelConfig;
    return Logger.withMinimumLogLevel(level);
  }),
);
```

## Metrics

### Metric Types

| Type          | Direction      | Use Case                         |
| ------------- | -------------- | -------------------------------- |
| **Counter**   | Up/Down        | Request counts, error counts     |
| **Gauge**     | Fluctuates     | Memory usage, active connections |
| **Histogram** | Distribution   | Latency, response sizes          |
| **Summary**   | Sliding window | Percentiles (p50, p99)           |
| **Frequency** | Count distinct | Status codes, event types        |

### Creating Metrics

```typescript
import { Metric, Effect } from "effect";

// Counter
const requests = Metric.counter("http_requests_total", {
  description: "Total HTTP requests",
  // bigint: false (default)
  // incremental: false (can go down)
});

// Incremental counter (only goes up)
const errors = Metric.counter("errors_total", {
  description: "Total errors",
  incremental: true,
});

// Gauge
const activeConnections = Metric.gauge("active_connections", {
  description: "Current active connections",
});

// Histogram
const latency = Metric.histogram("http_duration_seconds", {
  description: "Request latency",
  boundaries: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// Summary (sliding window percentiles)
const responseSize = Metric.summary("response_size_bytes", {
  maxAge: "1 hour",
  maxSize: 1000,
  error: 0.01,
  quantiles: [0.5, 0.9, 0.95, 0.99],
});

// Frequency
const statusCodes = Metric.frequency("http_status_codes", {
  description: "HTTP response status codes",
});

// Timer (convenience for latency histograms)
const timer = Metric.timer("operation_duration_seconds");
```

### Using Metrics

```typescript
// Counter — apply to an effect (increments by effect result)
const count = yield * requests(Effect.succeed(1));

// Counter with constant increment
const taskCount = Metric.counter("tasks_total").pipe(Metric.withConstantInput(1));
yield * taskCount(Effect.succeed("any value")); // Always +1

// Gauge — set current value
yield * activeConnections(Effect.succeed(42));

// Histogram — record a value
yield * latency(Effect.succeed(0.234));

// Summary — record a value
yield * responseSize(Effect.succeed(1024));

// Frequency — record a distinct value
yield * statusCodes(Effect.succeed("200"));

// Timer — track duration of an effect
const result = yield * program.pipe(Metric.trackDuration(timer));

// Track occurrences (frequency of string values)
yield * program.pipe(Metric.trackOccurrences(statusCodes));
```

### Tagging Metrics

```typescript
// Tag a specific metric
const getRequest = requests.tagged("method", "GET");
const postRequest = requests.tagged("method", "POST");

// Tag multiple
const tagged = requests.tagged("method", "GET").tagged("path", "/users");

// Tag all metrics in an effect
program.pipe(Metric.tagged("service", "user-api"));

// Tag from context
program.pipe(Metric.taggedWithLabels({ method: "GET", path: "/users" }));
```

### Getting Metric Values

```typescript
// Get current counter value
const state = yield * Metric.value(requests);
console.log(state.count);

// Get gauge value
const gaugeState = yield * Metric.value(activeConnections);
console.log(gaugeState.value);

// Get histogram snapshot
const histState = yield * Metric.value(latency);
console.log(histState.buckets);
```

## Distributed Tracing

### Setup

```bash
npm install @effect/opentelemetry
npm install @opentelemetry/sdk-trace-base @opentelemetry/sdk-trace-node
npm install @opentelemetry/sdk-metrics
```

### Console Tracing

```typescript
import { Effect } from "effect";
import { NodeSdk } from "@effect/opentelemetry";
import { ConsoleSpanExporter, BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";

const NodeSdkLive = NodeSdk.layer(() => ({
  resource: { serviceName: "my-app" },
  spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter()),
}));

const program = Effect.sleep("100 millis").pipe(Effect.withSpan("my-operation"));

Effect.runPromise(Effect.provide(program, NodeSdkLive));
```

### Span Annotations

```typescript
// Add key-value annotations
program.pipe(
  Effect.withSpan("db.query"),
  Effect.tap(() => Effect.annotateCurrentSpan("query", "SELECT * FROM users")),
  Effect.tap(() => Effect.annotateCurrentSpan("rows", 42)),
);

// Multiple annotations at once
Effect.annotateCurrentSpans({ query: "SELECT 1", database: "users" });
```

### Nested Spans

```typescript
const program = Effect.gen(function* () {
  return yield* Effect.gen(function* () {
    const data = yield* fetchData();
    return yield* process(data).pipe(Effect.withSpan("process"));
  }).pipe(Effect.withSpan("pipeline"));
}).pipe(Effect.withSpan("request"));
```

### Logs as Span Events

Logs within a span are automatically converted to span events in OpenTelemetry.

```typescript
Effect.gen(function* () {
  yield* Effect.logInfo("Starting operation");
  yield* doWork();
  yield* Effect.logInfo("Completed operation");
}).pipe(Effect.withSpan("operation"));
// Both log messages appear as events in the span
```

### Sentry Integration

```typescript
import { SentrySdk } from "@effect/opentelemetry";

const SentryLive = SentrySdk.layer({
  dsn: process.env.SENTRY_DSN,
  environment: "production",
  tracesSampleRate: 1.0,
});

Effect.provide(program, SentryLive);
```

## Correlation

All three signals are correlated through:

1. **Fiber ID** — Each log entry includes the executing fiber ID
2. **Span context** — Logs within a span include span metadata
3. **Trace ID** — Distributed traces link operations across services

```typescript
// All logs in this effect include span context
program.pipe(
  Effect.withSpan("operation"),
  Effect.tap(() => Effect.logInfo("Step 1")), // Includes span name
  Effect.tap(() => Effect.logInfo("Step 2")), // Includes span name
  Metric.trackDuration(Metric.timer("operation.duration")),
);
```

## Best Practices

1. **Use `Effect.log*`** over `console.log` — integrates with tracing
2. **Use `jsonLogger`** in production for structured log ingestion
3. **Use `prettyLogger`** in development for readability
4. **Tag metrics** with dimensions (method, path, status) for filtering
5. **Use histograms** for latency, not averages
6. **Use summaries** for SLA monitoring (p99, p95)
7. **Add span annotations** for query details, IDs, and context
8. **Set appropriate sample rates** — 100% in dev, 1-10% in prod
9. **Load log level from config** — change verbosity without redeploy
10. **Name spans hierarchically** — `http.get`, `db.query`, `cache.get`
