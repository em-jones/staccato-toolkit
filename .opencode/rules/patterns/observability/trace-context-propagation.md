# Trace Context Propagation Usage Rules

**Domain**: Distributed trace context correlation across service boundaries

**Adopted by**: adopt-tempo-tracing (see `.opencode/changes/adopt-tempo-tracing/design.md`)

---

## Overview

Trace context propagation ensures that a single user request traced across multiple services maintains the same trace ID, enabling end-to-end visibility. This rule documents how to propagate trace context for HTTP requests, async message queues, goroutines, and trust boundaries.

---

## HTTP Request Propagation

### Pattern: W3C Trace Context Header

Use the `traceparent` HTTP header for trace context propagation.

Format: `traceparent: 00-<trace-id>-<span-id>-<trace-flags>`

Example: `traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`

### HTTP Client (Outgoing Requests)

**Requirement**: Every HTTP client MUST inject the `traceparent` header from the current span context.

```go
// Using go-http-tracing middleware (standard)
func doHTTPRequest(ctx context.Context, url string) (*http.Response, error) {
    req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
    
    // traceparent header is automatically injected by OTel HTTP instrumentation
    // span context is extracted from ctx
    
    return http.DefaultClient.Do(req)
}
```

**OR manually inject if not using auto-instrumentation**:

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/propagation"
)

func doHTTPRequest(ctx context.Context, url string) (*http.Response, error) {
    req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
    
    // Manually inject trace context
    otel.GetTextMapPropagator().Inject(ctx, propagation.HeaderCarrier(req.Header))
    
    return http.DefaultClient.Do(req)
}
```

### HTTP Server (Incoming Requests)

**Requirement**: Every HTTP server MUST extract the `traceparent` header and create a child span.

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/propagation"
)

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    // Extract trace context from traceparent header
    ctx := otel.GetTextMapPropagator().Extract(r.Context(), propagation.HeaderCarrier(r.Header))
    
    // Create a child span with the extracted context
    ctx, span := h.tracer.Start(ctx, "service.handler_name")
    defer span.End()
    
    // Process request with ctx containing the propagated trace
    h.handleRequest(ctx, w, r)
}
```

**Note**: OTel HTTP instrumentation middleware (e.g., `otelhttp.NewHandler`) does this automatically.

---

## Async Message Queue Propagation

### Pattern: Message Headers

Propagate trace context through message metadata/headers when publishing and consuming messages.

### Kafka

#### Producer (Publishing)

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/propagation"
    "github.com/segmentio/kafka-go"
)

func (p *Producer) PublishOrder(ctx context.Context, order *Order) error {
    // Create a carrier from Kafka message headers
    msg := kafka.Message{
        Topic: "orders-created",
        Key:   []byte(order.ID),
        Value: mustMarshal(order),
        Headers: []kafka.Header{},
    }
    
    // Inject trace context into message headers
    carrier := otelkafka.NewProducerMessageCarrier(&msg)
    otel.GetTextMapPropagator().Inject(ctx, carrier)
    
    return p.writer.WriteMessages(ctx, msg)
}
```

#### Consumer (Consuming)

```go
func (c *Consumer) ConsumeOrders(ctx context.Context) {
    for msg := range c.reader.Messages(ctx) {
        // Extract trace context from message headers
        carrier := otelkafka.NewConsumerMessageCarrier(&msg)
        ctx := otel.GetTextMapPropagator().Extract(ctx, carrier)
        
        // Create a child span for this message
        ctx, span := c.tracer.Start(ctx, "order-processor.process_order")
        defer span.End()
        
        c.processOrder(ctx, msg)
    }
}
```

### RabbitMQ

#### Producer

```go
func (p *Publisher) PublishEvent(ctx context.Context, event *Event) error {
    // Create message headers
    headers := amqp.Table{}
    carrier := otelrabbit.NewProducerHeaderCarrier(headers)
    
    // Inject trace context
    otel.GetTextMapPropagator().Inject(ctx, carrier)
    
    return p.channel.PublishWithContext(
        ctx,
        p.exchange,
        event.Type,
        false,
        false,
        amqp.Publishing{
            Headers:     headers,
            Body:        mustMarshal(event),
            ContentType: "application/json",
        },
    )
}
```

#### Consumer

```go
func (c *Consumer) ConsumeEvents(ctx context.Context) {
    msgs, err := c.channel.Consume(c.queue, "", true, false, false, false, nil)
    for msg := range msgs {
        // Extract trace context from message headers
        carrier := otelrabbit.NewConsumerHeaderCarrier(msg.Headers)
        ctx := otel.GetTextMapPropagator().Extract(context.Background(), carrier)
        
        ctx, span := c.tracer.Start(ctx, "event-handler.process")
        defer span.End()
        
        c.handleEvent(ctx, msg)
    }
}
```

---

## Goroutine and Background Task Propagation

### Pattern: Pass Context.Context to Goroutines

Trace context is embedded in `context.Context`. Pass the context to child goroutines to maintain the trace.

```go
func (h *Handler) ProcessRequest(ctx context.Context, req *Request) {
    ctx, span := h.tracer.Start(ctx, "service.process_request")
    defer span.End()
    
    // Spawn child goroutine with ctx
    go h.asyncProcess(ctx, req)
}

func (h *Handler) asyncProcess(ctx context.Context, req *Request) {
    // This span is a child of the parent because ctx carries the trace
    ctx, span := h.tracer.Start(ctx, "service.async_process")
    defer span.End()
    
    // Do work...
}
```

### Pattern: Context Snapshot for Scheduled Tasks

If a task is scheduled for later execution, capture the context at schedule time (not execution time):

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/baggage"
)

func (s *Scheduler) EnqueueTask(ctx context.Context, task *Task) {
    // Capture trace context at schedule time
    traceContext := otel.GetTextMapPropagator()
    
    // Store context snapshot in the task
    carriers := make(map[string]string)
    traceContext.Inject(ctx, propagation.MapCarrier(carriers))
    task.TraceContext = carriers
    
    s.queue.Push(task)
}

func (s *Scheduler) ExecuteTask(task *Task) {
    // Restore trace context at execution time
    ctx := context.Background()
    traceContext := otel.GetTextMapPropagator()
    ctx = traceContext.Extract(ctx, propagation.MapCarrier(task.TraceContext))
    
    // Now task execution continues the trace
    ctx, span := s.tracer.Start(ctx, "scheduler.execute_task")
    defer span.End()
}
```

---

## Baggage Propagation for Metadata

### When to Use Baggage

Use baggage to propagate metadata (not transaction data) across trace boundaries:
- Tenant ID
- Feature flags
- User context
- Request routing hints

**Do NOT use baggage for**:
- User IDs, session IDs (use logs/events instead)
- Large payloads (baggage is propagated in headers)
- Sensitive data (baggage is not encrypted)

### Baggage Size Limits

- **Max baggage pairs**: 256 per trace
- **Max pair size**: Variable (recommended < 4KB total)

Exceeding limits may cause headers to exceed size restrictions; baggage is dropped silently.

### Setting Baggage

```go
import (
    "go.opentelemetry.io/otel/baggage"
)

func (h *Handler) ProcessRequest(ctx context.Context) {
    // Set tenant ID in baggage
    tenantID := extractTenant(ctx)
    b, _ := baggage.Parse("tenant.id=" + tenantID)
    ctx = baggage.ContextWithBaggage(ctx, b)
    
    ctx, span := h.tracer.Start(ctx, "service.process")
    defer span.End()
    
    // Baggage is automatically propagated to child spans and downstream services
    h.callDownstream(ctx)
}
```

### Reading Baggage

```go
func (h *Handler) ProcessDownstream(ctx context.Context) {
    b := baggage.FromContext(ctx)
    tenantID := b.Member("tenant.id").Value()
    
    // Use tenantID for scoped query, logging, etc.
}
```

### Baggage Propagation in Headers

Baggage is automatically propagated in the `W3C-Baggage` header (HTTP) or message headers (async). OTel propagators handle this.

---

## Trace Context Stripping at Trust Boundaries

### Pattern: External Services

Do **NOT** propagate trace context to external (third-party) services. Create a new root span for external calls.

```go
func (c *PaymentClient) ChargeCard(ctx context.Context, card *Card, amount float64) (string, error) {
    // ❌ Don't propagate the current trace context
    // req, _ := http.NewRequestWithContext(ctx, "POST", externalPaymentURL, ...)
    
    // ✅ Create a new context (new root span) for external call
    externalCtx := context.Background()
    req, _ := http.NewRequestWithContext(externalCtx, "POST", externalPaymentURL, ...)
    
    // Make the external call; it will create its own trace
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        // Record the error in the parent span but don't leak trace context
        return "", err
    }
    
    return extractChargeID(resp), nil
}
```

### Why?

1. **Data minimization**: External services shouldn't know your internal trace IDs
2. **Isolation**: External service tracing is separate from your platform
3. **Security**: Prevents information leakage about internal architecture
4. **Autonomy**: External services control their own tracing

### Recording External Call Spans

Record the external call in your trace (in the parent span's context) but don't share trace context:

```go
func (c *PaymentClient) ChargeCard(ctx context.Context, card *Card, amount float64) (string, error) {
    ctx, span := c.tracer.Start(ctx, "payment-client.charge_card")
    defer span.End()
    
    // Create new context for external call (no trace context)
    externalCtx := context.Background()
    req, _ := http.NewRequestWithContext(externalCtx, "POST", externalPaymentURL, ...)
    
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        span.RecordError(err)
        return "", err
    }
    
    // Span still recorded in your trace, but external call is isolated
    return extractChargeID(resp), nil
}
```

---

## Implementation Checklist

- [ ] HTTP clients inject `traceparent` header for outgoing requests
- [ ] HTTP servers extract `traceparent` header for incoming requests
- [ ] Kafka producers inject trace context in message headers
- [ ] Kafka consumers extract trace context from message headers
- [ ] RabbitMQ producers and consumers propagate context via headers
- [ ] Goroutines receive `context.Context` with trace context
- [ ] Scheduled tasks capture context at schedule time, not execution time
- [ ] Baggage used sparingly (tenant ID, flags only)
- [ ] External service calls use new context (no trace propagation)
- [ ] All services use OTel semantic conventions for context propagation

---

## Examples

### Complete Request Flow (HTTP → Kafka → Goroutine)

```go
// API Handler (HTTP)
func (h *Handler) CreateOrder(w http.ResponseWriter, r *http.Request) {
    // Trace context extracted from HTTP traceparent header
    ctx, span := h.tracer.Start(r.Context(), "api.create_order")
    defer span.End()
    
    order := parseRequest(r)
    
    // Publish event to Kafka with trace context in message headers
    if err := h.publisher.PublishOrderCreated(ctx, order); err != nil {
        span.RecordError(err)
        http.Error(w, "failed to create", 500)
        return
    }
    
    w.WriteHeader(200)
}

// Kafka Producer
func (p *Producer) PublishOrderCreated(ctx context.Context, order *Order) error {
    msg := kafka.Message{Topic: "order-events", Value: ...}
    carrier := otelkafka.NewProducerMessageCarrier(&msg)
    otel.GetTextMapPropagator().Inject(ctx, carrier)
    return p.writer.WriteMessages(ctx, msg)
}

// Kafka Consumer
func (c *Consumer) ProcessOrders(ctx context.Context) {
    for msg := range c.reader.Messages(ctx) {
        carrier := otelkafka.NewConsumerMessageCarrier(&msg)
        ctx := otel.GetTextMapPropagator().Extract(ctx, carrier)
        
        ctx, span := c.tracer.Start(ctx, "order-processor.process")
        defer span.End()
        
        // Spawn async task with trace context
        go c.asyncNotify(ctx, msg)
    }
}

// Async Goroutine
func (c *Consumer) asyncNotify(ctx context.Context, msg kafka.Message) {
    ctx, span := c.tracer.Start(ctx, "order-processor.notify_user")
    defer span.End()
    
    // Trace continues: API → Kafka → Consumer → Async, all same trace ID
}
```

---

## Related

- **Design**: `openspec/changes/adopt-tempo-tracing/design.md`
- **Specification**: `openspec/changes/adopt-tempo-tracing/specs/trace-context-propagation/spec.md`
- **OTel Propagation**: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
