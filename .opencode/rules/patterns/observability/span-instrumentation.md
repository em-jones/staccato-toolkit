# Span Instrumentation Usage Rules

**Domain**: OpenTelemetry instrumentation for distributed tracing

**Adopted by**: adopt-tempo-tracing (see `.opencode/changes/adopt-tempo-tracing/design.md`)

---

## When to Instrument Spans

Instrument a span for:
- Every incoming HTTP request handler
- Every outgoing HTTP/RPC call
- Every database query or significant data operation
- Asynchronous message consumption (Kafka, RabbitMQ, etc.)
- Background job or goroutine execution
- Significant business logic checkpoints

## Span Naming Conventions

### Pattern

Use the format: `<service>.<operation>`

- **service**: Kebab-case service name (e.g., `user-api`, `auth-service`, `order-processor`)
- **operation**: Kebab-case operation (e.g., `get-user`, `validate-token`, `process-payment`)

### Examples

| Context | Span name | Notes |
|---------|-----------|-------|
| HTTP GET /users/:id | `user-api.get_user` | Service + operation |
| Database SELECT | `user-api.db.query` | Service + database operation |
| Kafka message processing | `order-processor.consume_order_event` | Service + message type |
| Internal RPC call | `auth-service.validate_token` | Service + RPC operation |
| Background job | `notification-service.send_email` | Service + job type |

### Span Name Cardinality

Span names MUST be **static and low-cardinality**:
- ✅ `user-api.get_user` (static)
- ❌ `user-api.get_user_123` (user ID makes it high-cardinality)
- ✅ `user-api.db.query` (static)
- ❌ `user-api.db.query_SELECT_*` (query varies)

**Why**: High-cardinality span names create excessive unique combinations in Tempo, reducing query performance and inflating storage costs.

---

## Span Attributes

### Cardinality Limits

- **Max attributes per span**: 32
- **Max attribute length**: 2048 characters
- **High-cardinality attributes**: Redact or omit

### Recommended Attributes

#### For HTTP Spans

| Attribute | Source | Example |
|-----------|--------|---------|
| `http.method` | HTTP method | `GET`, `POST` |
| `http.url` | Full URL (without query params) | `http://api.example.com/users/` |
| `http.target` | Path + query | `/users?role=admin` |
| `http.status_code` | HTTP response code | `200`, `404`, `500` |
| `http.request.header.*` | Request headers (when safe) | `http.request.header.user_agent` |

#### For Database Spans

| Attribute | Source | Example |
|-----------|--------|---------|
| `db.system` | Database type | `postgresql`, `mysql`, `dynamodb` |
| `db.name` | Database/schema name | `users_db` |
| `db.operation` | Operation type | `SELECT`, `INSERT`, `UPDATE` |
| `db.statement` | Query (only if safe—no user data) | `SELECT * FROM users WHERE active=true` |

#### For Message Queue Spans

| Attribute | Source | Example |
|-----------|--------|---------|
| `messaging.system` | Queue system | `kafka`, `rabbitmq` |
| `messaging.destination` | Topic/queue name | `orders-created` |
| `messaging.operation` | Operation | `consume`, `publish` |
| `messaging.message_id` | Message ID (if available) | `msg-123abc` |

#### Resource Attributes (Set at Tracer Init)

These are inherited by all spans from the tracer:

| Attribute | Source | Example |
|-----------|--------|---------|
| `service.name` | Service identifier | `user-api` |
| `service.version` | Service version | `1.2.3` |
| `service.namespace` | Namespace/group | `checkout` |
| `deployment.environment` | Environment | `production`, `staging` |
| `service.instance.id` | Pod/instance ID | `user-api-5c8d7f` |

---

## High-Cardinality Attribute Redaction

### Never Include

- User IDs, account IDs, customer IDs
- Request IDs, trace IDs, session IDs
- Email addresses, phone numbers
- API keys, tokens, secrets
- Database record IDs in span attributes (use semantic conventions instead)

### How to Redact

**Option 1**: Omit entirely
```go
// ❌ Don't do this
span.SetAttributes(attribute.String("user.id", userID))

// ✅ Do this instead (use logs if needed)
log.Info("user action", "user_id", userID)
```

**Option 2**: Hash or truncate (if necessary)
```go
// ✅ If you must record it, use first 8 chars only
span.SetAttribute("request.id", requestID[:8])
```

**Option 3**: Use predefined buckets
```go
// ✅ For cardinality control, bucket the value
status := "active"
if !user.Active {
    status = "inactive"
}
span.SetAttribute("user.status", status)
```

---

## Span Events

### When to Record

Record a span event for:
- **Exceptions**: When an error occurs during span execution
- **Checkpoints**: Major progress milestones in long operations
- **Warnings**: Non-fatal issues that may indicate problems
- **Important state changes**: Retries, fallbacks, circuit breaker trips

### Event Format

```go
// Exception event
span.RecordError(err, trace.WithAttributes(
    attribute.String("exception.type", reflect.TypeOf(err).String()),
))

// Checkpoint event
span.AddEvent("cache_check_complete", trace.WithAttributes(
    attribute.String("cache.hit", "true"),
))
```

### Recommended Event Names

| Event | When | Attributes |
|-------|------|-----------|
| `exception` | Error occurs | `exception.type`, `exception.message` |
| `retry` | Operation retried | `retry.count`, `retry.reason` |
| `circuit_breaker_open` | Circuit breaker triggered | `circuit_breaker.name` |
| `fallback_activated` | Fallback strategy used | `fallback.name` |
| `cache_hit` | Cache lookup succeeds | `cache.name`, `cache.ttl_remaining` |
| `cache_miss` | Cache lookup fails | `cache.name` |

---

## Semantic Convention Compliance

Use OpenTelemetry semantic conventions: https://opentelemetry.io/docs/specs/semconv/

Common conventions:
- **HTTP**: `http.method`, `http.status_code`, `http.url`
- **Database**: `db.system`, `db.operation`, `db.name`
- **RPC**: `rpc.system`, `rpc.service`, `rpc.method`
- **Exceptions**: `exception.type`, `exception.message`, `exception.stacktrace`

**Why**: Semantic conventions ensure consistency across services and enable better tooling and analysis in Tempo.

---

## Attribute Validation & Enforcement

### Code Review

Pull request reviewers MUST check for:
- ✅ Span names are static (no user IDs, dynamic data)
- ✅ Max 32 attributes per span
- ✅ No high-cardinality attributes (user IDs, request IDs, etc.)
- ✅ Resource attributes set at tracer init, not per-span

### Linting (Future)

A linter rule will auto-detect:
- Span names containing non-alphanumeric characters (except `.`, `-`, `_`)
- Attribute keys matching patterns: `*id`, `*_id`, `user_*`, `request_*`

---

## Examples

### Correct Span Instrumentation

```go
func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
    ctx, span := h.tracer.Start(r.Context(), "user-api.get_user")
    defer span.End()

    // Semantic HTTP attributes
    span.SetAttributes(
        attribute.String("http.method", r.Method),
        attribute.String("http.url", r.URL.Path),
        attribute.String("http.target", r.RequestURI),
    )

    userID := r.PathValue("id")
    // ❌ Don't add user ID as attribute
    // span.SetAttribute("user.id", userID)

    user, err := h.db.GetUser(ctx, userID)
    if err != nil {
        span.RecordError(err)
        span.SetAttribute("http.status_code", 500)
        http.Error(w, "Internal error", 500)
        return
    }

    span.SetAttribute("http.status_code", 200)
    json.NewEncoder(w).Encode(user)
}
```

### Resource Attributes at Tracer Init

```go
func initTracer(ctx context.Context) (*sdktrace.TracerProvider, error) {
    res := resource.NewWithAttributes(
        context.Background(),
        semconv.ServiceNameKey.String("user-api"),
        semconv.ServiceVersionKey.String(os.Getenv("SERVICE_VERSION")),
        semconv.DeploymentEnvironmentKey.String(os.Getenv("ENV")),
    )

    bsp := sdktrace.NewBatchSpanProcessor(otlpTraceExporter)
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithResource(res),
        sdktrace.WithSpanProcessor(bsp),
    )

    return tp, nil
}
```

---

## Troubleshooting

### Issue: Too many attributes, traces incomplete in Tempo

**Cause**: Exceeding the 32-attribute limit causes attributes to be dropped.

**Solution**: Audit span instrumentation, remove low-value attributes, use logs for detailed data.

### Issue: Span cardinality explosion, query slowdowns

**Cause**: High-cardinality span names or attributes (user IDs, request IDs).

**Solution**: Use redaction strategy from above; validate span names are static.

### Issue: Sensitive data (PII) in trace attributes

**Cause**: Accidentally including user IDs, emails, tokens.

**Solution**: Implement attribute validation in code review and use linting rule (when available) to detect `*id` patterns.

---

## Related

- **Design**: `openspec/changes/adopt-tempo-tracing/design.md`
- **Specification**: `openspec/changes/adopt-tempo-tracing/specs/span-instrumentation/spec.md`
- **OTel Semantic Conventions**: https://opentelemetry.io/docs/specs/semconv/
