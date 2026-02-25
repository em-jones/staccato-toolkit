---
created-by-change: enhance-design-spec-skills-with-rules
last-validated: 2026-02-23
---

# Observability Pattern Rules

_Conventions for structured logging, distributed tracing, metrics naming, and alerting so that the system's internal state is inferable from external outputs._

## Core Principle

Observability is the ability to understand what a system is doing from its outputs alone, without deploying new code. The three pillars — logs, traces, and metrics — must be designed in from the start. An observable system reduces MTTR because engineers can ask arbitrary questions of the system without requiring code changes.

> "Observability means you can answer questions you didn't know you'd need to ask." — Observability Engineering

## Key Guidelines

### Structured Logging

All log output is JSON. Never use free-form string log messages that require regex parsing.

```typescript
// ✓ Good — structured, machine-parseable
logger.info('order.placed', {
  orderId: order.id,
  customerId: order.customerId,
  totalCents: order.totalCents,
  durationMs: timer.elapsed(),
});

// ✗ Avoid — unstructured, requires regex to extract fields
console.log(`Order ${order.id} placed for customer ${order.customerId} totalling $${order.total}`);
```

**Required fields on every log entry**:
- `timestamp` — ISO 8601 UTC (set by the logging framework, not application code)
- `level` — `debug` | `info` | `warn` | `error`
- `service` — service name (injected at startup)
- `environment` — `staging` | `production`
- `traceId` — from the active trace context (see below)
- `message` — the event name or brief description (stable, not interpolated)

**Log levels**:
- `debug` — verbose, off in production by default; enabled per-request via trace flag
- `info` — significant business events (order placed, user registered, payment processed)
- `warn` — unexpected but handled condition (retry attempt, fallback activated, deprecated API called)
- `error` — unhandled failure requiring human attention

Never log PII (email addresses, full names, card numbers) in plaintext. Log opaque IDs and redact sensitive fields.

### Distributed Tracing

Every inbound request generates a trace. Propagate the trace context (W3C `traceparent` header) to all downstream calls — HTTP, gRPC, and message consumers.

```typescript
// ✓ Good — trace context propagated to downstream HTTP call
async function fetchInventory(productId: string, ctx: TraceContext): Promise<Inventory> {
  const response = await httpClient.get(`/inventory/${productId}`, {
    headers: { traceparent: ctx.toHeader() },
  });
  return response.json();
}

// ✗ Avoid — trace context lost at service boundary
async function fetchInventory(productId: string): Promise<Inventory> {
  const response = await fetch(`/inventory/${productId}`);
  return response.json();
}
```

Instrument these span types at minimum:
- Inbound HTTP/gRPC requests
- Outbound HTTP/gRPC calls
- Database queries
- Message queue publish and consume operations

### Metrics Naming

Use the `{service}_{noun}_{verb}_{unit}` naming convention. Register metrics at startup, not inline.

```typescript
// ✓ Good — consistent naming, registered at startup
const httpRequestDurationMs = new Histogram({
  name: 'orders_http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
});

const ordersTotalCreated = new Counter({
  name: 'orders_order_created_total',
  help: 'Total number of orders created',
  labelNames: ['payment_method'],
});
```

**Mandatory metrics for every service**:
- Request rate (`_total` counter with `route`, `method`, `status_code` labels)
- Request latency (`_duration_ms` histogram by route)
- Error rate (`_errors_total` counter with `kind` label)
- Dependency health (`_dependency_up` gauge per dependency)

**For async consumers**: additionally track `_consumer_lag`, `_messages_processed_total`, `_messages_failed_total`.

### Alerting Conventions

Alerts fire on symptoms (user-facing impact), not causes (internal metrics). The on-call engineer needs to know _something is wrong_, not _why_ — that is investigation work.

**Golden Signals** (alert on these):
- **Latency**: P99 request duration > threshold for > 2 minutes
- **Error rate**: 5xx rate > 1% of traffic for > 1 minute
- **Traffic**: request rate drops > 50% below baseline (possible upstream failure or load balancer issue)
- **Saturation**: CPU or memory > 85% for > 5 minutes

Alert naming:
```
{service}-{symptom}-{severity}
orders-high-error-rate-p1
payments-high-latency-p2
inventory-low-traffic-p2
```

**Severity**:
- `P1` — customer-facing degradation, requires immediate response (< 15 min)
- `P2` — degraded but not broken, respond within business hours or next day
- `P3` — informational, review in next standup

Every alert must have a runbook link in its annotation.

### Health Endpoints

Every service exposes two health endpoints:

```
GET /health/live   → 200 OK  (process is alive; used by liveness probe)
GET /health/ready  → 200 OK  (service is ready to accept traffic; used by readiness probe)
                  → 503 Service Unavailable (if a required dependency is down)
```

The readiness endpoint checks database connectivity, cache connectivity, and any required upstream services. It does not check optional dependencies.

## Common Issues

**"Our logs are too noisy — we can't find relevant entries"**
→ Demote operational chatter to `debug`. Ensure `info` logs are meaningful business events only. Add a `context` field to group related log entries by a business entity ID (e.g., `orderId`).

**"We can't correlate logs across services"**
→ The `traceId` is missing or not being propagated. Verify that the `traceparent` header is forwarded in all outbound calls and extracted in all inbound request handlers.

**"Our dashboards show everything is fine but users are complaining"**
→ Dashboards are showing the wrong signals (averages instead of P99 percentiles, or internal metrics instead of user-facing ones). Switch to Golden Signals. P99 latency hides tail latency that affects real users.

## See Also

- [CI/CD Pattern](./ci-cd.md) — deployment event markers in metrics
- [Reliability Pattern](../operations/reliability.md) — retry and circuit breaker metrics
- [Async Messaging Pattern](../architecture/async-messaging.md) — consumer lag and DLQ alerting
- [Security Pattern](../operations/security.md) — PII handling in logs
- *Continuous Delivery*, Humble & Farley — Chapter 8
- *Observability Engineering*, Majors, Fong-Jones, Miranda
