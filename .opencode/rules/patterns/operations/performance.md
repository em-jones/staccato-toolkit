---
created-by-change: enhance-design-spec-skills-with-rules
last-validated: 2026-02-23
---

# Performance Pattern Rules

_Conventions for caching strategy, batching, profiling, resource sizing, and latency budgets for capabilities with throughput or latency requirements._

## Core Principle

Optimise based on measurement, not intuition. Profile before optimising. Establish a latency budget at design time and measure against it in production. Premature optimisation introduces complexity without evidence of benefit.

> "Don't optimize prematurely. First make it work, then make it right, then — only if necessary — make it fast." — Clean Code (paraphrasing Knuth)

## Key Guidelines

### Define Latency Budgets at Design Time

Every capability with user-facing latency requirements defines a latency budget in its `design.md`:

```
Capability: Product search
P50 target:  80ms
P99 target: 400ms
Budget breakdown:
  - Input validation:   < 2ms
  - Cache lookup:       < 5ms (hit) / < 50ms (miss, including DB query)
  - ML ranking:        < 150ms (non-critical, degraded if exceeded)
  - Response serialisation: < 5ms
```

Measure against these targets continuously in production (see [Observability Pattern](../delivery/observability.md)).

### Caching Strategy

**Decide what to cache, not whether to cache.** Not all data benefits from caching; incorrect cache invalidation causes data consistency bugs.

| Data type                                         | Cache strategy                            | TTL guidance                  |
| ------------------------------------------------- | ----------------------------------------- | ----------------------------- |
| Reference data (product catalogue, configuration) | Application-level cache (Redis)           | Long (minutes to hours)       |
| User session data                                 | Redis / distributed cache                 | Session duration              |
| Expensive computations (aggregations, reports)    | Cache with explicit invalidation          | Until underlying data changes |
| Frequently-read, rarely-written entities          | Read-through cache with TTL               | Minutes                       |
| Real-time data (stock levels, live prices)        | Do not cache, or very short TTL (seconds) |                               |

```typescript
// ✓ Good — cache-aside pattern with explicit TTL
async function getProductCatalogue(): Promise<Product[]> {
  const cached = await redis.get("products:catalogue");
  if (cached) return JSON.parse(cached);

  const products = await productRepo.findAll();
  await redis.setex("products:catalogue", 300, JSON.stringify(products)); // 5-minute TTL
  return products;
}

// ✓ Good — invalidate on write
async function updateProduct(id: string, update: ProductUpdate): Promise<void> {
  await productRepo.update(id, update);
  await redis.del("products:catalogue"); // invalidate stale cache
}
```

**Cache stampede protection**: use a mutex or probabilistic early expiration to prevent multiple requests rebuilding the same cache entry simultaneously under load.

### Batching

Replace N+1 query patterns with batch operations. N+1 queries are the most common performance regression in relational systems.

```typescript
// ✗ Avoid — N+1: one query per order item
const orders = await orderRepo.findAll();
for (const order of orders) {
  order.customer = await customerRepo.findById(order.customerId); // N queries
}

// ✓ Good — batch fetch
const orders = await orderRepo.findAll();
const customerIds = [...new Set(orders.map((o) => o.customerId))];
const customers = await customerRepo.findByIds(customerIds); // 1 query
const customerMap = new Map(customers.map((c) => [c.id, c]));
for (const order of orders) {
  order.customer = customerMap.get(order.customerId);
}
```

For GraphQL APIs, use DataLoader to batch field resolution automatically.

### Database Query Optimisation

- Use `EXPLAIN ANALYZE` to inspect query plans before deploying schema changes or new queries that touch large tables.
- Queries touching more than 1% of a large table (> 100k rows) must use an index. Add the index before the code change (see [Data Modeling Pattern](../architecture/data-modeling.md)).
- Avoid `SELECT *` in production queries — fetch only the columns needed.
- Use keyset pagination (`WHERE id > $lastId LIMIT $n`) for large result sets; offset pagination degrades as `OFFSET` grows.

```sql
-- ✓ Good — keyset pagination
SELECT id, name, created_at FROM orders
WHERE created_at < $lastCreatedAt
ORDER BY created_at DESC
LIMIT 20;

-- ✗ Avoid — offset degrades on large tables
SELECT id, name, created_at FROM orders
ORDER BY created_at DESC
LIMIT 20 OFFSET 10000;
```

### Resource Sizing

Size compute (CPU, memory) based on measured load, not intuition. Use the following process:

1. Deploy with conservative defaults.
2. Run load tests targeting 2× expected peak traffic.
3. Measure CPU utilisation, memory usage, and GC pressure.
4. Size so that CPU utilisation is < 70% at peak and memory is < 80%.
5. Set Kubernetes resource requests = measured average; limits = 2× requests.

```yaml
# ✓ Good — measured sizing
resources:
  requests:
    cpu: "250m"
    memory: "256Mi"
  limits:
    cpu: "500m"
    memory: "512Mi"

# ✗ Avoid — guessed or unlimited
resources:
  requests:
    cpu: "2"
    memory: "4Gi"
  # no limits — one runaway process can starve the node
```

### Profiling Workflow

When a latency regression is observed in production:

1. Identify the slow trace in the distributed tracing system (look for P99 outliers).
2. Reproduce locally with the same data volume and query patterns.
3. Profile with CPU and heap profilers (`node --prof`, `pprof`, `py-spy`).
4. Identify the bottleneck: is it CPU-bound, I/O-bound, or lock-bound?
5. Address the bottleneck at its root; do not paper over it with a cache.

## Common Issues

**"Adding a cache fixed our latency — now our data is sometimes stale"**
→ Define the acceptable staleness window explicitly. If the data cannot be stale, caching is wrong here. If staleness is acceptable, set TTL accordingly and document the trade-off.

**"Our P99 is high but P50 is fine"**
→ P99 outliers are often caused by: lock contention, GC pauses, N+1 queries on large datasets, or slow dependency tail latency. Use distributed traces to find the pattern — P99 outliers will cluster around a specific span type.

**"We're running out of memory in production"**
→ Profile heap allocation. Common causes: in-memory caches growing without bounds (add size limits), large result sets fetched into memory (use streaming or pagination), memory leaks in event listeners.

## See Also

- [Observability Pattern](../delivery/observability.md) — latency histograms, P99 tracking
- [Data Modeling Pattern](../architecture/data-modeling.md) — indexing strategy
- [Reliability Pattern](./reliability.md) — timeouts prevent slow dependencies from blocking resources
- [Async Messaging Pattern](../architecture/async-messaging.md) — offload heavy work to background queues
- AWS Well-Architected Framework: Performance Efficiency Pillar
- _Designing Data-Intensive Applications_, Kleppmann — Chapter 1
