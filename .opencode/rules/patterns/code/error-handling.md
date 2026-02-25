---
created-by-change: enhance-design-spec-skills-with-rules
last-validated: 2026-02-23
---

# Error Handling Pattern Rules

_A structured approach to representing, propagating, and surfacing errors so that failure paths are as explicit and readable as the happy path._

## Core Principle

Error handling is not an afterthought — it is part of the design. Errors must be typed, categorised, and propagated without losing context. Thrown exceptions are reserved for unrecoverable programmer errors. Expected failures travel as typed values up the call stack.

> "Error handling is important, but if it obscures logic, it's wrong." — Clean Code, Ch. 7

## Key Guidelines

### Use a Result Type for Expected Failures

All functions that can fail in expected ways return `Result<T, E>`. This makes the failure path visible in the type signature and forces callers to handle it.

```typescript
type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };

function ok<T>(value: T): Result<T, never> { return { ok: true, value }; }
function err<E>(error: E): Result<never, E> { return { ok: false, error }; }

// ✓ Good — failure is in the type
function findUser(id: string): Result<User, NotFoundError | DatabaseError> { ... }

// ✗ Avoid — caller cannot see failure modes without reading implementation
function findUser(id: string): User { ... } // throws on not-found?
```

### Categorise Errors

Use a discriminated union for the error taxonomy. At minimum, distinguish between:

- **Validation errors**: caller provided invalid input; do not retry
- **Not found errors**: entity does not exist; surface as 404
- **Conflict errors**: state precondition not met (e.g., duplicate); surface as 409
- **Infrastructure errors**: external system failure; may retry with backoff

```typescript
type AppError =
  | { kind: 'validation'; field: string; message: string }
  | { kind: 'not_found'; resource: string; id: string }
  | { kind: 'conflict'; message: string }
  | { kind: 'infrastructure'; cause: unknown; retryable: boolean };
```

### Fail Fast on Programmer Errors

Unrecoverable programmer errors (null where impossible, invariant violations) throw immediately. Do not attempt to recover or propagate them as Result values.

```typescript
// ✓ Good — assert the invariant, throw if violated
function getConfig(): Config {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL is required but not set');
  return parseConfig(raw);
}

// ✗ Avoid — propagating a programmer error as a recoverable Result
function getConfig(): Result<Config, AppError> {
  const raw = process.env.DATABASE_URL;
  if (!raw) return err({ kind: 'validation', field: 'DATABASE_URL', message: 'required' });
  return ok(parseConfig(raw));
}
```

### Preserve Error Context Across Boundaries

When catching errors from infrastructure (database, HTTP client, message queue), wrap them with context before propagating. Never swallow or log-and-discard.

```typescript
// ✓ Good — context preserved
async function fetchOrder(id: string): Promise<Result<Order, AppError>> {
  try {
    const row = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (!row) return err({ kind: 'not_found', resource: 'order', id });
    return ok(mapRow(row));
  } catch (cause) {
    return err({ kind: 'infrastructure', cause, retryable: true });
  }
}

// ✗ Avoid — context lost
async function fetchOrder(id: string): Promise<Order | null> {
  try {
    return await db.query('SELECT * FROM orders WHERE id = $1', [id]);
  } catch {
    return null; // caller cannot distinguish not-found from DB failure
  }
}
```

### Translate at Boundaries

At each layer boundary (service → handler, domain → infrastructure), translate internal error types into the appropriate representation for that layer. HTTP handlers translate `AppError` → HTTP status + body. Never leak domain error internals to the API surface.

```typescript
// ✓ Good — boundary translation
function toHttpResponse(error: AppError): { status: number; body: object } {
  switch (error.kind) {
    case 'validation': return { status: 400, body: { error: error.message, field: error.field } };
    case 'not_found':  return { status: 404, body: { error: `${error.resource} not found` } };
    case 'conflict':   return { status: 409, body: { error: error.message } };
    case 'infrastructure': return { status: 502, body: { error: 'upstream failure' } };
  }
}
```

### Never Silently Swallow Errors

Every `catch` block must either: (a) return/throw a typed error, or (b) log with full context and re-throw or return a typed error. Empty catch blocks are forbidden.

```typescript
// ✗ Forbidden
try {
  await sendEmail(payload);
} catch { /* ignore */ }

// ✓ Good
try {
  await sendEmail(payload);
} catch (cause) {
  logger.error('email delivery failed', { cause, payload });
  return err({ kind: 'infrastructure', cause, retryable: true });
}
```

## Common Issues

**"I have to unwrap Result in every caller — it's verbose"**
→ Introduce a `pipe` / `andThen` helper or use early-return patterns. Verbosity is intentional: it ensures failure paths are handled.

**"Should a 404 from a downstream API be `not_found` or `infrastructure`?"**
→ Depends on semantics. If the resource genuinely doesn't exist in your domain, map to `not_found`. If it's an unexpected gap (the resource _should_ exist), treat as `infrastructure` with `retryable: false`.

**"We're using an ORM that throws exceptions — how do we wrap it?"**
→ Create a thin repository wrapper that catches ORM exceptions and translates them to `Result<T, AppError>`. The domain layer never sees ORM exception types.

## See Also

- [Functions Pattern](./functions.md) — Result-returning functions vs. throwing functions
- [Testing Pattern](./testing.md) — testing error paths is as important as the happy path
- [Boundaries Pattern](../architecture/boundaries.md) — error translation at layer boundaries
- [Reliability Pattern](../operations/reliability.md) — retry strategy for `retryable: true` errors
- *Clean Code*, Robert C. Martin — Chapter 7: Error Handling
- *Clean Architecture*, Robert C. Martin — Chapter 20
