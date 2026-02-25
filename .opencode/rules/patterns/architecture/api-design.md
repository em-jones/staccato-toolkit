---
created-by-change: enhance-design-spec-skills-with-rules
last-validated: 2026-02-23
---

# API Design Pattern Rules

_Conventions for HTTP and gRPC contract design: resource modelling, versioning, request/response shapes, and error responses._

## Core Principle

An API is a published contract. Once consumed, breaking changes impose coordination cost on all callers. Design for stability: use consistent resource models, explicit versioning, and structured error responses from the first version. Prefer boring predictability over clever expressiveness.

## Key Guidelines

### Resource Naming (REST)

- Use plural nouns for collections: `/users`, `/orders`, `/invoices`
- Use path parameters for resource identity: `/users/{userId}`
- Use query parameters for filtering, sorting, pagination: `/users?status=active&page=2`
- Use sub-resources for owned relationships: `/orders/{orderId}/items`
- Never use verbs in resource paths

```
✓ GET    /orders/{orderId}
✓ POST   /orders
✓ PATCH  /orders/{orderId}
✓ DELETE /orders/{orderId}
✓ GET    /orders/{orderId}/items

✗ POST   /createOrder
✗ GET    /getOrderById?id=123
✗ POST   /orders/cancel       ← use PATCH /orders/{id} with { status: 'cancelled' }
```

### HTTP Method Semantics

| Method | Semantics                         | Idempotent | Safe |
| ------ | --------------------------------- | ---------- | ---- |
| GET    | Read resource or collection       | Yes        | Yes  |
| POST   | Create resource or trigger action | No         | No   |
| PUT    | Full replacement of resource      | Yes        | No   |
| PATCH  | Partial update                    | No\*       | No   |
| DELETE | Remove resource                   | Yes        | No   |

Prefer `PATCH` over `PUT` for partial updates. Reserve `PUT` for full document replacement (e.g., configuration objects).

### Versioning Strategy

Version in the URL path: `/v1/orders`, `/v2/orders`. Do not version in headers or query parameters — path versioning is visible in logs, documentation, and proxies.

- **Never break v1 without a migration path.** Additive changes (new optional fields, new endpoints) are non-breaking and do not require a new version.
- **Create v2 when**: removing a field, changing a field's type or semantics, restructuring a resource.
- **Support the previous version** for at least one deprecation window (minimum 90 days) after launching the new version.

### Request and Response Shapes

**Requests**: accept `application/json`. For file uploads, accept `multipart/form-data`.

**Responses**: always return `application/json` with a consistent envelope:

```typescript
// Collection response
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 143,
    "totalPages": 8
  }
}

// Single resource response
{
  "data": { "id": "...", ... }
}
```

Do not return bare arrays at the top level — they cannot be extended without breaking changes.

**Timestamps**: ISO 8601 with UTC timezone (`2026-02-23T14:30:00Z`).
**IDs**: opaque strings (UUID v4). Never expose auto-increment integers — they leak enumeration vectors.
**Booleans**: explicit `true`/`false`, never `1`/`0` or `"yes"`/`"no"`.

### Error Response Shape

All error responses use a consistent structure:

```typescript
// Single error
{
  "error": {
    "code": "VALIDATION_ERROR",        // machine-readable, stable
    "message": "email is required",    // human-readable, may change
    "field": "email"                   // optional — for field-level errors
  }
}

// Multiple validation errors
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "request validation failed",
    "details": [
      { "field": "email", "message": "is required" },
      { "field": "password", "message": "must be at least 8 characters" }
    ]
  }
}
```

HTTP status codes map to error categories:

- `400` — validation error (client fix required)
- `401` — unauthenticated (missing or invalid credentials)
- `403` — unauthorised (authenticated but lacks permission)
- `404` — resource not found
- `409` — conflict (duplicate, stale update)
- `422` — unprocessable entity (valid JSON but semantically invalid)
- `429` — rate limit exceeded (include `Retry-After` header)
- `500` — internal server error (never expose internal details)
- `502`/`503` — upstream or service unavailable

### Pagination

Use cursor-based pagination for large or frequently-updated collections; offset-based for small, stable collections.

```
// Cursor-based (preferred for feeds, event logs)
GET /events?limit=50&after=cursor_abc123
→ { "data": [...], "pagination": { "nextCursor": "cursor_def456", "hasMore": true } }

// Offset-based (acceptable for admin tables)
GET /users?page=3&pageSize=20
→ { "data": [...], "pagination": { "page": 3, "pageSize": 20, "totalItems": 450 } }
```

### Idempotency Keys

`POST` endpoints that create resources or trigger financial operations must support an `Idempotency-Key` header. The server stores the response for the key and returns it on repeat requests without re-executing the operation.

```
POST /payments
Idempotency-Key: client-generated-uuid-v4
```

## Common Issues

**"We need to trigger an action, not a CRUD operation"**
→ Model the action as a resource creation. `POST /orders/{id}/cancellations` is cleaner than `POST /orders/{id}/cancel`. The cancellation is a first-class resource with its own ID and timestamp.

**"Our API returns different shapes depending on a query parameter"**
→ Avoid polymorphic response shapes. If two callers need fundamentally different projections, consider separate endpoints or use sparse fieldsets (`?fields=id,email`).

**"The client needs the response before we finish processing"**
→ Return `202 Accepted` with a job ID. The client polls `GET /jobs/{jobId}` or receives a webhook when processing completes.

## See Also

- [Boundaries Pattern](./boundaries.md) — DTOs separate API layer from domain
- [Error Handling Pattern](../code/error-handling.md) — error taxonomy maps to HTTP status codes
- [Security Pattern](../operations/security.md) — authentication, authorisation, input validation
- [Observability Pattern](../delivery/observability.md) — request tracing and latency metrics
- _Clean Architecture_, Robert C. Martin — Chapter 22
- Fielding REST dissertation: https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm
