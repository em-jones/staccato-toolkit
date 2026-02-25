---
created-by-change: enhance-design-spec-skills-with-rules
last-validated: 2026-02-23
---

# Async Messaging Pattern Rules

_Conventions for message channels, routing, transformation, idempotency, and dead-letter handling in queue, event bus, and pub/sub systems._

## Core Principle

Asynchronous messaging decouples producers from consumers in time and space. The contract between them is the message schema. Treat message schemas with the same discipline as API contracts: version them, make changes additive, and never remove fields without a deprecation window. Every consumer must be idempotent.

> "Messaging decouples the sender from the receiver and provides a layer of indirection that makes systems more flexible." — Enterprise Integration Patterns, Hohpe & Woolf

## Key Guidelines

### Message Schema Design

Messages are immutable records of intent or fact. Include a schema version field and an event timestamp in every message.

```typescript
// ✓ Good — versioned, self-describing message
interface OrderPlacedEvent {
  schemaVersion: 1;
  messageId: string; // UUID — for deduplication
  occurredAt: string; // ISO 8601 UTC
  orderId: string;
  customerId: string;
  totalCents: number;
  items: Array<{ productId: string; quantity: number; unitPriceCents: number }>;
}

// ✗ Avoid — no version, no message ID, no timestamp
interface OrderPlaced {
  orderId: string;
  total: number;
}
```

**Schema evolution rules** (same as API versioning):

- Adding optional fields: non-breaking — no version bump needed
- Removing fields, renaming fields, or changing field types: breaking — bump `schemaVersion`, maintain both versions during transition

### Channel Naming

Use a consistent naming scheme across all message channels:

```
{domain}.{entity}.{event-type}       # domain events
{service}.{operation}.{result}       # command results
{service}.{resource}.dead-letter     # DLQ

Examples:
  orders.order.placed
  orders.order.cancelled
  payments.charge.succeeded
  payments.charge.failed
  orders.order.placed.dead-letter
```

### Idempotency

Every consumer must be idempotent: processing the same message twice must produce the same outcome as processing it once. Use the `messageId` field for deduplication.

```typescript
// ✓ Good — idempotent consumer with deduplication store
async function handleOrderPlaced(event: OrderPlacedEvent): Promise<void> {
  const alreadyProcessed = await deduplicationStore.exists(event.messageId);
  if (alreadyProcessed) return;

  await fulfillmentService.createFulfillment(event.orderId);
  await deduplicationStore.record(event.messageId, { ttl: "7d" });
}

// ✗ Avoid — non-idempotent: duplicate message creates duplicate fulfilment
async function handleOrderPlaced(event: OrderPlacedEvent): Promise<void> {
  await fulfillmentService.createFulfillment(event.orderId);
}
```

Deduplication store options: Redis with TTL, DynamoDB conditional write, or a database `processed_messages` table with a unique constraint on `message_id`.

### At-Least-Once Delivery and Transactional Outbox

Message brokers (SQS, Kafka, RabbitMQ) guarantee at-least-once delivery. Combined with idempotent consumers, this is safe. For critical events that must not be lost, use the **transactional outbox pattern**:

1. Write the event to an `outbox` table in the same database transaction as the domain change.
2. A background relay reads the outbox and publishes to the broker.
3. Delete or mark the outbox record after confirmed publish.

```sql
-- Outbox table
CREATE TABLE outbox (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel      TEXT NOT NULL,
  payload      JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);
```

### Dead-Letter Queues

Every consumer queue must have a corresponding dead-letter queue (DLQ). Configure the broker to route messages that fail processing after N retries to the DLQ.

- **Alert** when any message lands in a DLQ (P2 alert).
- **Never silently drop** messages from a DLQ. Messages in the DLQ represent either data bugs or processing bugs — both require investigation.
- DLQ messages must be replayable after the underlying issue is fixed.

### Consumer Error Handling

```typescript
// ✓ Good — transient errors retry; permanent errors go to DLQ
async function handleMessage(raw: SQSMessage): Promise<void> {
  try {
    const event = parseEvent(raw.body); // validate schema
    await processEvent(event);
    await ack(raw);
  } catch (error) {
    if (isTransient(error)) {
      // Do not ack — broker will retry
      logger.warn("transient error processing message, will retry", {
        error,
        messageId: raw.MessageId,
      });
      throw error;
    } else {
      // Permanent error — ack to prevent infinite loop, log for investigation
      logger.error("permanent error processing message, routing to DLQ", {
        error,
        messageId: raw.MessageId,
      });
      await ack(raw); // broker's maxReceiveCount + DLQ will handle the copy
    }
  }
}
```

### Backpressure and Concurrency

Set explicit concurrency limits on consumers. Unbounded concurrency starves downstream dependencies.

```typescript
// ✓ Good — bounded concurrency
const consumer = new SQSConsumer({
  queueUrl: ORDER_QUEUE_URL,
  batchSize: 10,
  concurrency: 5, // process at most 5 messages in parallel
  handler: handleMessage,
});
```

## Common Issues

**"Messages arrive out of order — our consumer breaks"**
→ Design consumers to tolerate out-of-order delivery. Use event timestamps (`occurredAt`) rather than arrival order for sequencing. If strict ordering is required, partition by a key (e.g., `orderId`) and use a partition-ordered queue (Kafka) or a sequential processing pattern per entity ID.

**"We changed the message schema and old consumers break"**
→ Use the expand-contract pattern: publish both old and new schema versions simultaneously during the transition window. Consumers migrate to the new schema, then remove support for the old one.

**"The DLQ is growing — we don't know why"**
→ Add structured logging in the consumer that records the `messageId`, `schemaVersion`, and error details. Parse a sample from the DLQ to identify whether it's a schema bug, a missing resource (ordering issue), or an infrastructure fault.

## See Also

- [Data Modeling Pattern](./data-modeling.md) — outbox table schema, event schema versioning
- [Error Handling Pattern](../code/error-handling.md) — transient vs. permanent error classification
- [Reliability Pattern](../operations/reliability.md) — retry strategy and backoff
- [Observability Pattern](../delivery/observability.md) — DLQ alerting, consumer lag metrics
- _Enterprise Integration Patterns_, Hohpe & Woolf — Chapters 3–10
- _Designing Data-Intensive Applications_, Kleppmann — Chapter 11
