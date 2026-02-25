---
created-by-change: enhance-design-spec-skills-with-rules
last-validated: 2026-02-23
---

# Reliability Pattern Rules

_Conventions for retry strategy, circuit breakers, exponential backoff, graceful degradation, and bulkheads for services that make remote calls or have SLA requirements._

## Core Principle

Every remote call will fail eventually. Design for failure from the start — not as an edge case. The goal is not to prevent failures but to contain their blast radius and recover quickly. Assume any dependency can be slow, unavailable, or returning garbage at any time.

> "Anything that can go wrong will go wrong. Design for it." — Release It!, Nygard

## Key Guidelines

### Timeouts: Set Them Everywhere

Every outbound call (HTTP, database query, cache, message publish) must have an explicit timeout. The default is "never" in most libraries — this is wrong.

```typescript
// ✓ Good — explicit timeouts at every layer
const httpClient = axios.create({
  timeout: 5000, // 5 seconds — fail fast, don't wait indefinitely
});

const dbPool = new Pool({
  connectionTimeoutMillis: 3000,
  idleTimeoutMillis: 10000,
  statement_timeout: 10000,
});

// ✗ Avoid — no timeout; one slow dependency blocks all threads
const response = await fetch('https://downstream-service/api/data');
```

**Timeout hierarchy**: set cascading timeouts so upstream timeouts are longer than downstream, leaving room for the downstream to respond before the upstream gives up:

```
Client → API Gateway (30s) → Service A (20s) → Service B (10s) → Database (5s)
```

### Retry with Exponential Backoff and Jitter

Retry only transient errors. Never retry on errors caused by bad input (400-level) or authorisation failures (401, 403).

```typescript
// ✓ Good — exponential backoff with jitter
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: { maxAttempts: number; baseDelayMs: number; maxDelayMs: number }
): Promise<T> {
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === options.maxAttempts || !isRetryable(error)) throw error;
      const delay = Math.min(
        options.baseDelayMs * 2 ** (attempt - 1) + Math.random() * 100, // jitter
        options.maxDelayMs
      );
      await sleep(delay);
    }
  }
  throw new Error('unreachable');
}

// Usage
await retryWithBackoff(() => emailService.send(message), {
  maxAttempts: 3,
  baseDelayMs: 200,
  maxDelayMs: 5000,
});
```

**Jitter** is mandatory. Without jitter, all clients retry at the same time, creating a thundering-herd problem that amplifies the original failure.

### Circuit Breakers

A circuit breaker prevents a service from repeatedly calling a dependency that is known to be failing. When the failure rate exceeds a threshold, the circuit opens and calls fail immediately (without hitting the dependency), giving it time to recover.

```
Closed → (failure rate > threshold) → Open → (after recovery window) → Half-Open → (success) → Closed
                                                                              ↓ (failure)
                                                                            Open
```

```typescript
// ✓ Good — circuit breaker wraps the downstream call
const circuitBreaker = new CircuitBreaker(inventoryService.checkStock, {
  timeout: 3000,
  errorThresholdPercentage: 50,  // open when 50% of calls fail
  resetTimeout: 30000,           // try again after 30 seconds
  fallback: () => ({ available: true }),  // degrade gracefully
});

const stock = await circuitBreaker.fire(productId);
```

Instrument circuit breaker state transitions as metrics (see [Observability Pattern](../delivery/observability.md)).

### Graceful Degradation

When a non-critical dependency is unavailable, serve a degraded but functional response rather than failing completely.

```typescript
// ✓ Good — graceful degradation with fallback
async function getProductWithRecommendations(productId: string): Promise<ProductPage> {
  const product = await productService.findById(productId);  // critical — must succeed

  let recommendations: Product[] = [];
  try {
    recommendations = await recommendationService.getFor(productId);  // non-critical
  } catch (error) {
    logger.warn('recommendation service unavailable, returning empty recommendations', { error, productId });
    // continue — page renders without recommendations
  }

  return { product, recommendations };
}
```

Classify dependencies as **critical** (failure → serve error) or **non-critical** (failure → degrade gracefully). Document this classification in `design.md`.

### Bulkheads

Isolate resources (connection pools, thread pools, semaphores) per dependency so that one slow dependency cannot consume all resources and starve others.

```typescript
// ✓ Good — separate connection pools per downstream service
const paymentDbPool = new Pool({ max: 10, connectionTimeoutMillis: 3000 });
const analyticsDbPool = new Pool({ max: 5, connectionTimeoutMillis: 1000 });

// A slow analytics query cannot starve payment DB connections
```

For HTTP services: use separate HTTP clients per downstream dependency with bounded concurrency limits.

### Idempotency in Retry Scenarios

Operations that may be retried must be idempotent. See [Async Messaging Pattern](../architecture/async-messaging.md) for message consumer idempotency. For HTTP APIs, support `Idempotency-Key` headers (see [API Design Pattern](../architecture/api-design.md)).

## Common Issues

**"Retries are making a failing downstream worse"**
→ Two causes: (1) no backoff — add exponential backoff with jitter; (2) no circuit breaker — when the failure rate is high, the circuit should open and stop retrying until the dependency recovers.

**"Our circuit breaker is in half-open state permanently"**
→ The `resetTimeout` is too short, or the single test request in half-open state is timing out before succeeding. Increase `resetTimeout` and verify the probe request has a longer timeout than the failure threshold.

**"We can't tell which downstream call caused the timeout"**
→ Instrument each outbound call with a span (see [Observability Pattern](../delivery/observability.md)). Each span captures the dependency name, URL, and duration. The trace shows exactly where time was spent.

**"Graceful degradation is serving stale data — users don't know"**
→ Add a `degraded: true` field to the response when a fallback is active. Client UI can show an appropriate warning. Always be honest about degraded state.

## See Also

- [Error Handling Pattern](../code/error-handling.md) — `retryable` flag on infrastructure errors
- [Async Messaging Pattern](../architecture/async-messaging.md) — idempotency and DLQ
- [Observability Pattern](../delivery/observability.md) — circuit breaker state metrics, dependency health gauges
- [Feature Flags Pattern](../delivery/feature-flags.md) — ops flags as application-level kill switches
- AWS Well-Architected Framework: Reliability Pillar
- *Release It!*, Nygard — Chapters 4–5 (Stability Patterns)
