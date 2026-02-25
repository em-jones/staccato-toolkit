---
name: typescript-effect-library
description: Expert guidance for building observable, expressive, and fault-tolerant TypeScript applications using the effect-ts/effect ecosystem. Covers Effect<A, E, R> type, error management, dependency injection via Layers, observability (logging, metrics, tracing), concurrency with Fibers, retry/scheduling, Schema validation, Streams, and Sinks.
compatibility: Requires TypeScript 5.4+ with strict mode. Use with bun/npm/pnpm/yarn.
---

# TypeScript Effect Library

This skill provides comprehensive guidance for building **observable, expressive, and fault-tolerant** TypeScript applications using the [effect-ts/effect](https://github.com/Effect-TS/effect) ecosystem.

## Core Philosophy

Effect's unique insight: use TypeScript's type system to track **errors** and **context**, not only **success** values. The `Effect<Success, Error, Requirements>` type makes failure modes and dependencies explicit at compile time.

```
         ┌─── Produces a value of type Success
         │       ┌─── Fails with an Error
         │       │      ┌─── Requires no dependencies
         ▼       ▼      ▼
Effect<number, Error, never>
```

## When to Use This Skill

ALWAYS use this skill when:

- Writing TypeScript code that imports from `"effect"` or `"@effect/*"`
- Designing error handling strategies with typed errors
- Building dependency injection with Tags and Layers
- Adding observability (logging, metrics, distributed tracing)
- Implementing concurrency with Fibers, Queues, PubSub
- Adding retry logic, scheduling, or fault tolerance
- Validating/transforming data with Effect Schema
- Building reactive data pipelines with Stream and Sink
- Managing resources with Scope
- Creating testable services with TestClock

## Quick Reference

### The Effect Type

```typescript
import { Effect } from "effect";

// Effect<Success, Error, Requirements>
type MyEffect = Effect.Effect<number, Error, never>;

// Type extraction
type A = Effect.Success<MyEffect>; // number
type E = Effect.Error<MyEffect>; // Error
type R = Effect.Context<MyEffect>; // never
```

### Creating Effects

```typescript
import { Effect, Either, Option } from "effect";

// Synchronous (no errors)
Effect.succeed(42); // Effect<number, never, never>
Effect.sync(() => Math.random()); // Effect<number, never, never>

// Synchronous (can fail)
Effect.try(() => JSON.parse(input)); // Effect<unknown, unknown, never>
Effect.try({
  // Effect<User, ParseError, never>
  try: () => JSON.parse(input),
  catch: (e) => new ParseError(e),
});

// Asynchronous (guaranteed success)
Effect.promise(() => fetch(url)); // Effect<Response, never, never>

// Asynchronous (can fail)
Effect.tryPromise(() => fetch(url)); // Effect<Response, unknown, never>

// From callback API
Effect.async<string, Error>((resume) => {
  fs.readFile("file.txt", (err, data) => {
    if (err) resume(Effect.fail(new Error(err.message)));
    else resume(Effect.succeed(data.toString()));
  });
  // Return cleanup effect for interruption
  return Effect.sync(() => console.log("cleaned up"));
});

// Never succeeds (e.g., server loop)
Effect.never; // Effect<never, never, never>

// From Either/Option
Effect.either(Either.right(42)); // Effect<number, never, never>
Effect.option(Option.some(42)); // Effect<number, NoSuchElementException, never>
```

### Effect.gen — Writing Sequential Code

```typescript
import { Effect } from "effect";

const program = Effect.gen(function* () {
  const user = yield* fetchUser(id);
  const posts = yield* fetchPosts(user.id);
  const stats = yield* computeStats(posts);
  return { user, posts, stats };
});
// Effect<{ user, posts, stats }, FetchError | StatsError, UserService | PostService>
```

### Running Effects

```typescript
import { Effect, Exit, Cause } from "effect";

// Returns Promise<A> (rejects on failure)
Effect.runPromise(program);

// Returns Promise<Exit<A, E>> (never rejects)
Effect.runPromiseExit(program);

// Runs in background, returns Fiber (for concurrent management)
const fiber = Effect.runFork(program);
yield * Fiber.join(fiber);
yield * Fiber.interrupt(fiber);

// Synchronous execution (only for effects with no async ops)
Effect.runSync(program);
Effect.runSyncExit(program);
```

## Error Management

### Two Types of Errors

| Type           | Also Known As                       | Tracked in Type   | Recovery               |
| -------------- | ----------------------------------- | ----------------- | ---------------------- |
| **Expected**   | failures, typed errors, recoverable | Yes (`E` channel) | `catchAll`, `catchTag` |
| **Unexpected** | defects, untyped errors, defects    | No (runtime only) | `catchAllDefect`       |

### Handling Expected Errors

```typescript
import { Effect, Cause } from "effect"

// Catch all errors
program.pipe(Effect.catchAll((e) => Effect.succeed(fallback)))

// Catch by tag (preferred for discriminated unions)
program.pipe(Effect.catchTag("NotFoundError", (e) => ...))
program.pipe(Effect.catchTags({
  NotFoundError: (e) => ...,
  NetworkError: (e) => ...,
}))

// Map errors
program.pipe(Effect.mapError((e) => new AppError(e)))
program.pipe(Effect.sandbox)  // E → Cause<E> (unifies expected + unexpected)

// Retry with schedule
program.pipe(Effect.retry(Schedule.exponential("100 millis")))
program.pipe(Effect.retry({ times: 3 }))
program.pipe(Effect.retry({ while: (e) => e instanceof NetworkError }))

// Timeout
program.pipe(Effect.timeout("5 seconds"))
program.pipe(Effect.timeoutFail({
  duration: "5 seconds",
  onTimeout: () => new TimeoutError()
}))

// Fallback
program.pipe(Effect.orElse(() => Effect.succeed(defaultValue)))
```

### Error Accumulation (Parallel Errors)

```typescript
import { Effect } from "effect";

// Collect all errors instead of short-circuiting
Effect.all([task1, task2, task3], { mode: "either" });
// Returns Effect<Either<A, E>[], never, never>

// Validate all, collect failures
Effect.all([task1, task2, task3], { mode: "validate" });
// Returns Effect<A[], E[], never> — succeeds with all A, fails with all E
```

### Defining Typed Errors

```typescript
import { Data, Effect } from "effect";

// Use Data.tagged for errors with _tag for catchTag
class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly id: string;
}> {}

class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly url: string;
  readonly cause: unknown;
}> {}

// Usage
const program: Effect.Effect<Data, NotFoundError | NetworkError, never> = Effect.fail(
  new NotFoundError({ id: "123" }),
);

program.pipe(
  Effect.catchTag("NotFoundError", (e) => Effect.succeed(defaultData)),
  Effect.catchTag("NetworkError", (e) => {
    Effect.logError("Network failed", e.url);
    return Effect.fail(e);
  }),
);
```

## Dependency Injection — Tags, Services & Layers

### Defining a Service

```typescript
import { Context, Effect, Layer } from "effect";

// 1. Define the service tag
class Database extends Context.Tag("Database")<
  Database,
  { readonly query: (sql: string) => Effect.Effect<Row[], DatabaseError, never> }
>() {}

// 2. Using the service in effects
const getUsers = Effect.gen(function* () {
  const db = yield* Database;
  return yield* db.query("SELECT * FROM users");
});
// Effect<Row[], DatabaseError, Database>

// 3. Create the live implementation layer
const DatabaseLive = Layer.succeed(Database, {
  query: (sql) =>
    Effect.tryPromise({
      try: () => client.query(sql),
      catch: (e) => new DatabaseError(e),
    }),
});

// 4. Create a test implementation
const DatabaseTest = Layer.succeed(Database, {
  query: (sql) => Effect.succeed([{ id: 1, name: "test" }]),
});

// 5. Provide the layer to run
Effect.runPromise(Effect.provide(getUsers, DatabaseLive));
```

### Effect.Service — Simplified Service Definition

```typescript
import { Effect, Layer } from "effect";

class Database extends Effect.Service("Database")<
  Database,
  {
    readonly query: (sql: string) => Effect.Effect<Row[], DatabaseError, never>;
  }
>() {
  // Live implementation as static property
  static Live = Layer.effect(
    Database,
    Effect.map(Config, (config) => ({
      query: (sql) => Effect.tryPromise(() => client.query(sql)),
    })),
  );

  // Test implementation
  static Test = Layer.succeed(Database, {
    query: () => Effect.succeed([]),
  });
}

// Access service directly (shorthand for yield* Database)
const result = yield * Database.query("SELECT 1");

// Provide layer
Effect.provide(program, Database.Live);
```

### Layers with Dependencies

```typescript
// Layer<Out, Err, In> — produces Out, may fail with Err, needs In
class Config extends Context.Tag("Config")<Config, { readonly dbUrl: string }>() {}
class Logger extends Context.Tag("Logger")<
  Logger,
  { readonly log: (msg: string) => Effect.Effect<void> }
>() {}

// Config has no deps
const ConfigLive = Layer.succeed(Config, { dbUrl: "postgres://..." });

// Logger depends on Config
const LoggerLive = Layer.effect(
  Logger,
  Effect.gen(function* () {
    const config = yield* Config;
    return { log: (msg) => Effect.sync(() => console.log(`[${config.dbUrl}] ${msg}`)) };
  }),
);
// Layer<Logger, never, Config>

// Database depends on Config + Logger
const DatabaseLive = Layer.effect(
  Database,
  Effect.gen(function* () {
    const config = yield* Config;
    const logger = yield* Logger;
    return {
      query: (sql) =>
        Effect.gen(function* () {
          yield* logger.log(`Executing: ${sql}`);
          return yield* Effect.tryPromise(() => pg.query(sql));
        }),
    };
  }),
);
// Layer<Database, never, Config | Logger>

// Combine layers
const allLayers = Layer.provide(DatabaseLive, Layer.merge(ConfigLive, LoggerLive));
// Or: ConfigLive.pipe(Layer.provideMerge(LoggerLive), Layer.provideMerge(DatabaseLive))

// Provide everything at once
Effect.provide(program, Layer.mergeAll(ConfigLive, LoggerLive, DatabaseLive));
```

### Layer Memoization

Layers are memoized by default — if multiple effects need the same service, it's constructed only once. Use `Layer.fresh` to disable memoization.

## Observability

### Logging

```typescript
import { Effect, Logger, LogLevel, Cause } from "effect";

// Log at different levels
Effect.log("info message"); // INFO (default)
Effect.logDebug("debug message"); // DEBUG (hidden by default)
Effect.logInfo("info message"); // INFO
Effect.logWarning("warning"); // WARN
Effect.logError("error"); // ERROR
Effect.logFatal("fatal"); // FATAL

// Log with causes (includes full error context)
Effect.log("operation failed", Cause.fail(new Error("details")));

// Add annotations to all logs in a scope
program.pipe(Effect.annotateLogs({ userId: "123", action: "login" }));

// Scoped annotations
program.pipe(Effect.withLogAnnotations({ requestId: "abc-123" }));

// Set minimum log level
program.pipe(Logger.withMinimumLogLevel(LogLevel.Debug));

// Built-in logger formats
Logger.stringLogger; // Default: timestamp=... level=INFO fiber=#0 message=...
Logger.prettyLogger; // Human-readable with colors
Logger.logfmtLogger; // logfmt key=value format
Logger.jsonLogger; // JSON structured logging
Logger.structuredLogger; // Structured object logging
```

### Metrics

```typescript
import { Metric, Effect } from "effect";

// Counter — cumulative value (up and down)
const requestCount = Metric.counter("http_requests_total", {
  description: "Total HTTP requests",
});
// Increment by effect result
const result = yield * requestCount(Effect.succeed(1));

// Incremental counter (only goes up)
const errorCount = Metric.counter("errors_total", {
  description: "Total errors",
  incremental: true,
});

// Gauge — value that fluctuates
const activeConnections = Metric.gauge("active_connections");
yield * activeConnections(Effect.succeed(42));

// Histogram — distribution of values
const latency = Metric.histogram("http_duration_seconds", {
  boundaries: [0.01, 0.05, 0.1, 0.5, 1, 5],
});
yield * latency(Effect.succeed(0.234));

// Summary — sliding window with percentiles
const responseSize = Metric.summary("response_size_bytes", {
  maxAge: "1 hour",
  maxSize: 1000,
  error: 0.01,
  quantiles: [0.5, 0.9, 0.99],
});

// Frequency — count occurrences of distinct values
const statusCodes = Metric.frequency("http_status_codes");
yield * statusCodes(Effect.succeed("200"));

// Tag metrics (like Prometheus labels)
const tagged = requestCount.tagged("method", "GET").tagged("path", "/users");

// Timer metric (histogram for duration)
const timer = Metric.timer("operation_duration");
const result = yield * program.pipe(Metric.trackDuration(timer));
```

### Distributed Tracing (OpenTelemetry)

```typescript
import { Effect } from "effect";
import { NodeSdk } from "@effect/opentelemetry";
import { ConsoleSpanExporter, BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";

// Add spans to effects
const program = Effect.sleep("100 millis").pipe(
  Effect.withSpan("database.query"),
  Effect.tap(() => Effect.annotateCurrentSpan("query", "SELECT * FROM users")),
);

// Set up OpenTelemetry SDK
const NodeSdkLive = NodeSdk.layer(() => ({
  resource: { serviceName: "my-app" },
  spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter()),
}));

// Run with tracing
Effect.runPromise(Effect.provide(program, NodeSdkLive));

// Nesting spans (parent-child)
const parent = Effect.gen(function* () {
  return yield* Effect.gen(function* () {
    return yield* Effect.sleep("50 millis").pipe(Effect.withSpan("child-operation"));
  }).pipe(Effect.withSpan("parent-operation"));
}).pipe(Effect.withSpan("root-operation"));
```

## Concurrency

### Concurrency Options

```typescript
import { Effect, Duration } from "effect";

// Sequential (default)
Effect.all([task1, task2, task3]);

// Bounded concurrency (max N simultaneous)
Effect.all([task1, task2, task3, task4, task5], { concurrency: 2 });

// Unbounded concurrency
Effect.all([task1, task2, task3], { concurrency: "unbounded" });

// Inherit from parent scope
Effect.all([task1, task2], { concurrency: "inherit" });

// forEach with concurrency
Effect.forEach(items, processItem, { concurrency: 4 });
```

### Fibers (Lightweight Threads)

```typescript
import { Effect, Fiber } from "effect"

// Fork — start effect in background
const fiber = yield* Effect.fork(program)

// Join — wait for result
const result = yield* Fiber.join(fiber)

// Interrupt — cancel execution
yield* Fiber.interrupt(fiber)

// Await — get Exit without propagating failure
const exit = yield* Fiber.await(fiber)

// Race two effects
Effect.race(task1, task2)        // First to complete wins
Effect.raceAll([t1, t2, t3])     // First of many
Effect.raceFirst([t1, t2])       // First to succeed or fail

// Race with custom handling
Effect.raceWith(left, right, (leftExit, rightFiber) => ...)
```

### Interruption

```typescript
import { Effect } from "effect";

// Handle interruption
program.pipe(Effect.onInterrupt(() => Effect.sync(() => cleanup())));

// Check if interrupted
yield * Effect.interruptible(program);
yield * Effect.uninterruptible(program);

// AbortSignal integration
Effect.promise((signal) => fetch(url, { signal }));
```

## Scheduling & Retry

```typescript
import { Effect, Schedule } from "effect";

// Retry policies
Effect.retry(program, Schedule.exponential("100 millis"));
Effect.retry(program, Schedule.fixed("1 second"));
Effect.retry(program, Schedule.recurs(3));
Effect.retry(program, { times: 5 });
Effect.retry(program, { while: (e) => e instanceof NetworkError });
Effect.retry(program, { until: (e) => e.code === 429 });

// Schedule combinators
Schedule.exponential("100 millis").pipe(
  Schedule.jittered, // Add random jitter
  Schedule.whileInput((e) => e instanceof NetworkError), // Only retry specific errors
  Schedule.compose(Schedule.elapsed), // Track total elapsed time
  Schedule.andThen(Schedule.fixed("1 minute")), // Chain schedules
);

// Repeat on success (vs retry on failure)
Effect.repeat(program, Schedule.spaced("1 minute"));
Effect.repeat(program, Schedule.cron("0 */6 * * *")); // Every 6 hours
```

## Resource Management

```typescript
import { Effect, Scope } from "effect";

// Scoped resource (auto-cleanup)
const connection = Effect.acquireRelease(
  Effect.tryPromise(() => connect()),
  (conn) => Effect.promise(() => conn.close()),
);
// Effect<Connection, Error, never> — but needs Scope

// Use with Effect.gen
Effect.gen(function* () {
  const conn = yield* Effect.acquireUseRelease(
    Effect.tryPromise(() => connect()),
    (conn) => Effect.promise(() => conn.query("SELECT 1")),
    (conn, exit) => Effect.promise(() => conn.close()),
  );
});

// Or with Scope
Effect.gen(function* () {
  const scope = yield* Scope.make();
  const conn = yield* connection.pipe(Scope.extend(scope));
  // conn will be closed when scope is closed
});
```

## Effect Schema

```typescript
import { Schema, Effect } from "effect";

// Define schemas
const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.NonEmptyString,
  email: Schema.String.pipe(Schema.pattern(/^.+@.+\..+$/)),
  createdAt: Schema.DateFromSelf,
});

// Decode (validate + transform)
const result = yield * Schema.decode(User)(input);
const sync = Schema.decodeSync(User)(input); // throws on failure
const promise = Schema.decodePromise(User)(input);

// Encode
const encoded = Schema.encodeSync(User)(user);

// Filters and refin
const PositiveInt = Schema.Number.pipe(Schema.positive(), Schema.int());
const Email = Schema.String.pipe(
  Schema.pattern(/^.+@.+\..+$/),
  Schema.annotations({
    description: "A valid email address",
  }),
);

// Transformations
const UserId = Schema.Number.pipe(
  Schema.brand("UserId"), // Nominal type
);

// Class-based schemas
class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  name: Schema.NonEmptyString,
  email: Schema.String,
}) {}

// JSON Schema generation
const jsonSchema = Schema.JSONSchema.make(User);

// Arbitrary generation (for fast-check)
const arb = Schema.Arbitrary.make(User);
```

## Streams & Sinks

```typescript
import { Stream, Sink, Effect, Chunk } from "effect";

// Create streams
Stream.fromIterable([1, 2, 3]);
Stream.fromEffect(Effect.succeed(42));
Stream.range(1, 100);
Stream.repeat(
  Effect.sync(() => Date.now()),
  Schedule.spaced("1 second"),
);

// Transform streams
stream.pipe(
  Stream.map((x) => x * 2),
  Stream.filter((x) => x > 10),
  Stream.take(10),
  Stream.drop(5),
  Stream.chunkN(3),
);

// Consume streams
yield * stream.pipe(Stream.runCollect); // Chunk<A>
yield * stream.pipe(Stream.run(Sink.sum)); // Sum of numbers
yield * stream.pipe(Stream.forEach(handler)); // Process each element

// Merge streams
Stream.merge(stream1, stream2);
Stream.mergeAll([s1, s2, s3], { concurrency: 2 });

// Backpressure with queues
const queue = yield * Queue.bounded<number>(100);
yield * Queue.offer(queue, 42);
const value = yield * Queue.take(queue);
```

## State Management

```typescript
import { Effect, Ref, SubscriptionRef } from "effect";

// Ref — mutable reference
const count = yield * Ref.make(0);
yield * Ref.update(count, (n) => n + 1);
const value = yield * Ref.get(count);

// SynchronizedRef — atomic updates
const ref = yield * Ref.synchronized(initial);
yield * ref.updateEffect((n) => Effect.succeed(n + 1));

// SubscriptionRef — reactive updates
const ref = yield * SubscriptionRef.make(0);
// Subscribe to changes
yield * ref.changes.pipe(Stream.runForEach((value) => Effect.log(`Changed to ${value}`)));
yield * ref.set(42); // Triggers subscriber
```

## Configuration

```typescript
import { Config, Effect, Layer } from "effect";

// Define config
const config = Config.all({
  host: Config.string("DB_HOST").pipe(Config.withDefault("localhost")),
  port: Config.number("DB_PORT").pipe(Config.withDefault(5432)),
  retries: Config.integer("RETRY_COUNT").pipe(Config.withDefault(3)),
});

// Load config
const ConfigLive = Layer.effect(
  Config,
  Effect.gen(function* () {
    const cfg = yield* config;
    return cfg;
  }),
);

// Nested config
const dbConfig = Config.nested(
  "DB",
  Config.all({
    host: Config.string("HOST"),
    port: Config.number("PORT"),
  }),
);
// Reads DB_HOST and DB_PORT
```

## Code Style Guidelines

1. **Use `Effect.gen`** for sequential effectful code — avoids callback hell
2. **Prefer `pipe`** for data-last composition: `program.pipe(Effect.retry(...), Effect.timeout(...))`
3. **Use `Data.TaggedError`** for typed errors — enables `catchTag` pattern matching
4. **Keep R = `never`** in service interfaces — manage dependencies via Layers, not function signatures
5. **Use `Effect.Service`** for simpler service definitions over manual `Context.Tag`
6. **Name layers with `Live`/`Test` suffix** — `DatabaseLive`, `DatabaseTest`
7. **Use `Effect.log*`** over `console.log` — integrates with tracing and structured logging
8. **Prefer `Effect.tryPromise`** over `Effect.promise` when the operation can fail
9. **Use `Schema`** for all boundary validation (API inputs, DB results, config)
10. **Use `Chunk`** instead of arrays in Stream pipelines for performance

## Common Packages

| Package                    | Purpose                                                  |
| -------------------------- | -------------------------------------------------------- |
| `effect`                   | Core library — Effect, Stream, Sink, Layer, Schema, etc. |
| `@effect/opentelemetry`    | OpenTelemetry integration for tracing and metrics        |
| `@effect/platform`         | Platform abstractions (HTTP, FileSystem, KeyValueStore)  |
| `@effect/platform-node`    | Node.js platform implementation                          |
| `@effect/platform-browser` | Browser platform implementation                          |
| `@effect/rpc`              | RPC framework built on Effect                            |
| `@effect/sql`              | SQL database integration                                 |
| `@effect/cluster`          | Distributed clustering and workflows                     |

## Anti-Patterns to Avoid

1. **Don't leak dependencies** — Service methods should have `R = never`; use Layers for deps
2. **Don't mix Promise and Effect** — Convert Promise code to Effect at boundaries
3. **Don't use `console.log`** — Use `Effect.log*` for structured, traceable logging
4. **Don't catch all errors with try/catch** — Use typed errors with `catchTag`
5. **Don't create services without Tags** — Always use `Context.Tag` or `Effect.Service`
6. **Don't ignore the Requirements channel** — Let the compiler tell you what's missing
7. **Don't use `Effect.runSync`** for async effects — Use `runPromise` or `runFork`
