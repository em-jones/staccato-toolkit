# Effect Error Handling Guide

## Error Hierarchy

```
Cause<E>
├── Fail(e)          — Expected/typed error (tracked in type)
├── Die(defect)      — Unexpected error (NOT tracked in type)
├── Interrupt        — Fiber was interrupted
├── Sequential(l, r) — Two causes in sequence
└── Parallel(l, r)   — Two causes in parallel
```

## Defining Typed Errors

### Data.TaggedError (Recommended)

```typescript
import { Data, Effect } from "effect";

class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly id: string;
}> {}

class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly url: string;
  readonly retryAfter?: number;
}> {}

class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string;
  readonly message: string;
}> {}

// Type inference works automatically
type AppError = NotFoundError | NetworkError | ValidationError;
```

### Why TaggedError?

- `_tag` property enables `catchTag` pattern matching
- Extends `Error` for stack traces
- Works with `Data.equals` for testing
- TypeScript narrows type in catch handlers

## Handling Errors

### By Tag (Preferred)

```typescript
program.pipe(
  Effect.catchTag("NotFoundError", (e) => Effect.succeed(defaultValue)),
  Effect.catchTag("NetworkError", (e) =>
    Effect.logError("Network error", e.url).pipe(Effect.andThen(Effect.fail(e))),
  ),
  Effect.catchTag("ValidationError", (e) => Effect.fail(new AppError({ field: e.field }))),
);
```

### All at Once

```typescript
program.pipe(
  Effect.catchTags({
    NotFoundError: (e) => ...,
    NetworkError: (e) => ...,
    ValidationError: (e) => ...,
  })
)
```

### Catch All

```typescript
program.pipe(
  Effect.catchAll((e) => {
    // e is the union of all error types
    if (e._tag === "NotFoundError") { ... }
    return Effect.fail(e)
  })
)
```

### Match (Exhaustive)

```typescript
program.pipe(
  Effect.match({
    onSuccess: (a) => console.log("Got:", a),
    onFailure: (e) => console.error("Failed:", e._tag),
  }),
);
```

## Sandbox — Unifying Error Channels

When you need to handle both expected errors AND unexpected defects uniformly:

```typescript
import { Effect, Cause } from "effect";

program.pipe(
  Effect.sandbox, // Effect<A, Cause<E>, R>
  Effect.catchAll((cause) => {
    if (Cause.isFailType(cause)) {
      // Expected error — handle business logic
      return Effect.logError("Business error:", cause.error);
    }
    if (Cause.isDieType(cause)) {
      // Unexpected defect — log and alert
      return Effect.logError("Defect:", cause.defect);
    }
    if (Cause.isInterruptType(cause)) {
      return Effect.logWarning("Interrupted");
    }
    // Sequential/Parallel — multiple errors
    const failures = Cause.failures(cause);
    return Effect.logError("Multiple failures:", failures);
  }),
);
```

## Error Accumulation

When running multiple effects in parallel and you want ALL errors, not just the first:

```typescript
// Mode: "either" — returns Either<E, A> for each
Effect.all([task1, task2, task3], { mode: "either" });
// Effect<Either<Error, Result>[], never, R>

// Mode: "validate" — returns all errors in failure channel
Effect.all([task1, task2, task3], { mode: "validate" });
// Effect<Result[], Error[], R>

// Use validate for form validation, batch operations
const results =
  yield *
  Effect.all(validations, { mode: "validate" }).pipe(
    Effect.catchAll((errors) => {
      // errors is Error[] — all validation failures
      return Effect.fail(new ValidationError(errors));
    }),
  );
```

## Retry Strategies

### Simple Retry

```typescript
// Retry 3 times immediately
effect.pipe(Effect.retry({ times: 3 }));

// Retry until condition
effect.pipe(Effect.retry({ until: (e) => e._tag === "RateLimitError" }));

// Retry while condition
effect.pipe(Effect.retry({ while: (e) => e instanceof NetworkError }));
```

### Schedule-Based Retry

```typescript
import { Schedule } from "effect";

// Fixed delay
effect.pipe(Effect.retry(Schedule.fixed("1 second")));

// Exponential backoff
effect.pipe(Effect.retry(Schedule.exponential("100 millis")));

// Exponential + jitter (recommended for production)
effect.pipe(
  Effect.retry(Schedule.exponential("100 millis").pipe(Schedule.jittered, Schedule.recurs(5))),
);

// Fibonacci backoff
effect.pipe(Effect.retry(Schedule.fibonacci("100 millis")));

// With elapsed time tracking
effect.pipe(
  Effect.retry(
    Schedule.exponential("100ms").pipe(
      Schedule.compose(Schedule.elapsed),
      Schedule.whileOutput(({ duration }) => duration < 30_000),
    ),
  ),
);
```

## Timeout Strategies

```typescript
import { Effect, Duration } from "effect";

// Returns Option<A> — None on timeout
effect.pipe(Effect.timeout("5 seconds"));

// Returns A or throws TimeoutError
effect.pipe(
  Effect.timeoutFail({
    duration: "5 seconds",
    onTimeout: () => new TimeoutError(),
  }),
);

// Timeout with fallback
effect.pipe(
  Effect.timeout("5 seconds"),
  Effect.flatMap(
    Option.match({
      onNone: () => Effect.succeed(defaultValue),
      onSome: (a) => Effect.succeed(a),
    }),
  ),
);
```

## Error Channel Transformations

```typescript
// Map error type
effect.pipe(Effect.mapError((e) => new WrapperError(e)));

// Flip success and error
effect.pipe(Effect.flip); // Effect<E, A, R>

// Absorb error into success as Either
effect.pipe(Effect.either); // Effect<Either<E, A>, never, R>

// Absorb error into success as Option
effect.pipe(Effect.option); // Effect<Option<A>, never, R>

// Provide default on error
effect.pipe(Effect.orElseSucceed(() => defaultValue));

// Retry or fallback
effect.pipe(
  Effect.retryOrElse(Schedule.recurs(3), (error, attempt) =>
    Effect.succeed(fallback(error, attempt)),
  ),
);
```

## Best Practices

1. **Always use `Data.TaggedError`** — enables `catchTag` pattern matching
2. **Never throw** — use `Effect.fail()` for expected errors
3. **Use `Effect.try({ try, catch })`** — convert exceptions to typed errors
4. **Prefer `catchTag` over `catchAll`** — more specific, compiler-checked
5. **Use `sandbox`** when you need to inspect defects
6. **Use `either`/`option`** when error handling is the caller's concern
7. **Use `validate` mode** for batch operations where all errors matter
8. **Add jitter to exponential backoff** — prevents thundering herd
9. **Log errors with context** — `Effect.logError("msg", cause)` includes full stack
10. **Don't swallow errors silently** — always log or re-raise
