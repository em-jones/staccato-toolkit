# Effect Quick Reference

## Effect<A, E, R> — The Core Type

```
         A = Success type (what it produces)
         E = Error type (what it can fail with)
         R = Requirements (what it needs)
         ▼ ▼ ▼
Effect<number, Error, Database>
```

### Creation Matrix

| Scenario        | Function                            | Returns                             |
| --------------- | ----------------------------------- | ----------------------------------- |
| Pure value      | `Effect.succeed(a)`                 | `Effect<A, never, never>`           |
| Sync, no fail   | `Effect.sync(() => a)`              | `Effect<A, never, never>`           |
| Sync, can fail  | `Effect.try({ try, catch })`        | `Effect<A, E, never>`               |
| Async, no fail  | `Effect.promise(() => p)`           | `Effect<A, never, never>`           |
| Async, can fail | `Effect.tryPromise({ try, catch })` | `Effect<A, E, never>`               |
| Callback        | `Effect.async((resume) => ...)`     | `Effect<A, E, never>`               |
| Never           | `Effect.never`                      | `Effect<never, never, never>`       |
| From Either     | `Effect.either(either)`             | `Effect<A, E, never>`               |
| From Option     | `Effect.option(option)`             | `Effect<A, NoSuchElementException>` |
| Fail            | `Effect.fail(e)`                    | `Effect<never, E, never>`           |
| Die (defect)    | `Effect.die(defect)`                | `Effect<never, never, never>`       |

### Execution

| Need                               | Function                        |
| ---------------------------------- | ------------------------------- |
| Promise<A> (rejects on fail)       | `Effect.runPromise(effect)`     |
| Promise<Exit<A,E>> (never rejects) | `Effect.runPromiseExit(effect)` |
| Background fiber                   | `Effect.runFork(effect)`        |
| Sync result                        | `Effect.runSync(effect)`        |

### Composition

| Operation                           | Description                    |
| ----------------------------------- | ------------------------------ |
| `.pipe(Effect.map(f))`              | Transform success value        |
| `.pipe(Effect.flatMap(f))`          | Chain effects                  |
| `.pipe(Effect.tap(f))`              | Side effect, keep value        |
| `.pipe(Effect.as(b))`               | Replace value with constant    |
| `.pipe(Effect.andThen(b))`          | Sequence, discard first result |
| `.pipe(Effect.mapError(f))`         | Transform error                |
| `.pipe(Effect.catchAll(f))`         | Handle all errors              |
| `.pipe(Effect.catchTag("X", f))`    | Handle error by tag            |
| `.pipe(Effect.orElse(f))`           | Fallback on error              |
| `.pipe(Effect.retry(policy))`       | Retry on failure               |
| `.pipe(Effect.timeout(d))`          | Timeout with Option<A>         |
| `.pipe(Effect.timeoutFail(...))`    | Timeout with error             |
| `.pipe(Effect.withSpan("name"))`    | Add tracing span               |
| `.pipe(Effect.annotateLogs({...}))` | Add log annotations            |

### Effect.gen

```typescript
Effect.gen(function* () {
  const a = yield* effect1; // A
  const b = yield* effect2(a); // B
  return { a, b }; // Effect<{a,b}, E1|E2, R1|R2>
});
```

### Parallel Composition

```typescript
// All effects — short-circuit on first error
Effect.all([e1, e2, e3]);
Effect.all({ a: e1, b: e2 });

// All with options
Effect.all([e1, e2, e3], { concurrency: 2 });
Effect.all([e1, e2, e3], { concurrency: "unbounded" });
Effect.all([e1, e2, e3], { mode: "either" }); // collect all results
Effect.all([e1, e2, e3], { mode: "validate" }); // collect all errors

// forEach
Effect.forEach(items, fn, { concurrency: 4 });

// Race
Effect.race(e1, e2);
```

## Error Handling

### Defining Errors

```typescript
class NotFoundError extends Data.TaggedError("NotFoundError")<{ id: string }> {}
class NetworkError extends Data.TaggedError("NetworkError")<{ url: string }> {}
```

### Handling

```typescript
effect.pipe(Effect.catchAll((e) => ...))
effect.pipe(Effect.catchTag("NotFoundError", (e) => ...))
effect.pipe(Effect.catchTags({ NotFoundError: ..., NetworkError: ... }))
effect.pipe(Effect.sandbox)  // → Effect<A, Cause<E>, R>
effect.pipe(Effect.either)   // → Effect<Either<E, A>, never, R>
effect.pipe(Effect.option)   // → Effect<Option<A>, never, R>
```

### Retry

```typescript
effect.pipe(Effect.retry({ times: 3 }));
effect.pipe(Effect.retry(Schedule.exponential("100 millis")));
effect.pipe(Effect.retry(Schedule.fixed("1 second")));
effect.pipe(Effect.retry(Schedule.recurs(5)));
effect.pipe(Effect.retry({ while: (e) => e instanceof NetworkError }));
```

### Schedule Combinators

```typescript
Schedule.exponential("100ms").pipe(
  Schedule.jittered,
  Schedule.whileInput((e) => isTransient(e)),
  Schedule.compose(Schedule.elapsed),
  Schedule.andThen(Schedule.fixed("1m")),
);
```

## Dependency Injection

### Service Definition (Modern)

```typescript
class MyService extends Effect.Service("MyService")<MyService, {
  readonly doThing: () => Effect.Effect<Result, Error, never>
}>() {
  static Live = Layer.effect(MyService, ...)
  static Test = Layer.succeed(MyService, { doThing: () => Effect.succeed(...) })
}
```

### Service Definition (Manual)

```typescript
class MyService extends Context.Tag("MyService")<
  MyService,
  { readonly doThing: () => Effect.Effect<Result, Error, never> }
>() {}

const MyServiceLive = Layer.succeed(MyService, { doThing: ... })
```

### Layer Composition

```typescript
Layer.merge(layerA, layerB); // A | B
Layer.provide(layerA, layerB); // A, B provides A's deps
Layer.mergeAll(l1, l2, l3); // All merged
Effect.provide(effect, layer); // Run with layer
```

## Observability

### Logging

```typescript
Effect.log("msg");
Effect.logDebug("msg");
Effect.logInfo("msg");
Effect.logWarning("msg");
Effect.logError("msg");
Effect.logFatal("msg");
effect.pipe(Effect.annotateLogs({ key: "value" }));
effect.pipe(Logger.withMinimumLogLevel(LogLevel.Debug));
```

### Metrics

```typescript
const counter = Metric.counter("name")
const gauge = Metric.gauge("name")
const histogram = Metric.histogram("name", { boundaries: [...] })
const summary = Metric.summary("name", { maxAge, maxSize, error, quantiles })
const frequency = Metric.frequency("name")
const timer = Metric.timer("name")

yield* counter(Effect.succeed(1))
effect.pipe(Metric.trackDuration(timer))
counter.tagged("method", "GET")
```

### Tracing

```typescript
effect.pipe(Effect.withSpan("operation-name"));
Effect.annotateCurrentSpan("key", "value");
// Requires @effect/opentelemetry + NodeSdk.layer()
```

## Concurrency Primitives

| Primitive   | Use Case                              |
| ----------- | ------------------------------------- |
| `Fiber`     | Background execution, join, interrupt |
| `Queue`     | Bounded/unbounded message passing     |
| `PubSub`    | Broadcast to multiple subscribers     |
| `Semaphore` | Limit concurrent access               |
| `Deferred`  | One-time promise between fibers       |
| `Latch`     | Wait for a signal, then proceed       |

## Schema Quick Reference

```typescript
// Primitives
Schema.String, Schema.Number, Schema.Boolean, Schema.Null, Schema.Undefined
Schema.Literal("a", "b"), Schema.UniqueSymbol, Schema.TemplateLiteral(...)

// Structures
Schema.Struct({ name: Schema.String, age: Schema.Number })
Schema.Union(Schema.String, Schema.Number)
Schema.Tuple(Schema.String, Schema.Number)
Schema.Array(Schema.String)
Schema.Record({ key: Schema.String, value: Schema.Number })

// Transforms
Schema.NumberFromString      // string ↔ number
Schema.DateFromString        // string ↔ Date
Schema.BooleanFromString     // string ↔ boolean
Schema.parseJson()           // string ↔ any

// Filters
Schema.min(0), Schema.max(100), Schema.int(), Schema.positive(), Schema.negative()
Schema.pattern(/regex/), Schema.minLength(1), Schema.maxLength(255)

// Decode / Encode
Schema.decode(schema)(input)        // Effect<A, ParseError, never>
Schema.decodeSync(schema)(input)    // A | throws
Schema.encodeSync(schema)(value)    // I | throws

// Class
class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  name: Schema.NonEmptyString
}) {}
```

## State

```typescript
const ref = yield* Ref.make(0)
yield* Ref.set(ref, 42)
yield* Ref.update(ref, n => n + 1)
const val = yield* Ref.get(ref)

const syncRef = yield* Ref.synchronized(initial)
yield* syncRef.updateEffect((n) => Effect.succeed(n + 1))

const subRef = yield* SubscriptionRef.make(0)
yield* subRef.changes.pipe(Stream.runForEach(...))
```

## Resource Management

```typescript
// acquireUseRelease — try/finally pattern
Effect.acquireUseRelease(
  acquire, // Effect<Resource, E, R>
  use, // (resource) => Effect<A, E2, R2>
  release, // (resource, exit) => Effect<void, never, never>
);

// acquireRelease — returns scoped Effect
Effect.acquireRelease(acquire, release);
// Effect<Resource, E, R | Scope>
```

## Common Pipe Chains

```typescript
// Resilient operation
operation.pipe(
  Effect.retry(Schedule.exponential("100ms").pipe(Schedule.recurs(3))),
  Effect.timeout("30s"),
  Effect.catchAll((e) => Effect.logError("Failed", e)),
  Effect.withSpan("operation.name"),
);

// Observable operation
operation.pipe(
  Effect.tap(() => Effect.logDebug("Starting")),
  Metric.trackDuration(Metric.timer("operation.duration")),
  Effect.tap((result) => Effect.logInfo("Completed", result)),
  Effect.catchAll((e) => Effect.logError("Error", e)),
);
```
