# Effect Patterns — Complete Examples

## 1. Full Service with Layer, Observability, and Retry

```typescript
import { Effect, Layer, Context, Schedule, Data, Metric, Logger } from "effect";

// --- Typed Errors ---
class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  readonly id: string;
}> {}

class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly message: string;
  readonly cause: unknown;
}> {}

// --- Service Definition ---
class UserRepository extends Effect.Service("UserRepository")<
  UserRepository,
  {
    readonly findById: (
      id: string,
    ) => Effect.Effect<User, UserNotFoundError | DatabaseError, never>;
    readonly findAll: () => Effect.Effect<User[], DatabaseError, never>;
  }
>() {
  static Live = Layer.effect(
    UserRepository,
    Effect.gen(function* () {
      const config = yield* DatabaseConfig;
      const logger = yield* AppLogger;

      return {
        findById: (id: string) =>
          Effect.tryPromise({
            try: () => client.query("SELECT * FROM users WHERE id = $1", [id]),
            catch: (e) => new DatabaseError({ message: "Query failed", cause: e }),
          }).pipe(
            Effect.flatMap((result) =>
              result.rows.length === 0
                ? Effect.fail(new UserNotFoundError({ id }))
                : Effect.succeed(result.rows[0]),
            ),
            Effect.tap(() => logger.log(`Fetched user ${id}`)),
            Effect.retry(Schedule.exponential("100 millis").pipe(Schedule.recurs(3))),
            Effect.tagMetrics("operation", "user.findById"),
          ),

        findAll: () =>
          Effect.tryPromise({
            try: () => client.query("SELECT * FROM users"),
            catch: (e) => new DatabaseError({ message: "Query failed", cause: e }),
          }).pipe(
            Effect.map((result) => result.rows),
            Effect.tagMetrics("operation", "user.findAll"),
          ),
      };
    }),
  );

  static Test = Layer.succeed(UserRepository, {
    findById: (id) => Effect.succeed({ id, name: "Test User", email: "test@example.com" }),
    findAll: () => Effect.succeed([]),
  });
}

// --- Dependencies ---
class DatabaseConfig extends Context.Tag("DatabaseConfig")<
  DatabaseConfig,
  {
    readonly connectionString: string;
  }
>() {}

class AppLogger extends Context.Tag("AppLogger")<
  AppLogger,
  {
    readonly log: (message: string) => Effect.Effect<void>;
  }
>() {}

// --- Config Layer ---
const DatabaseConfigLive = Layer.effect(
  DatabaseConfig,
  Effect.gen(function* () {
    const connectionString = yield* Effect.processEnv("DATABASE_URL").pipe(
      Effect.mapError(() => new Error("DATABASE_URL not set")),
    );
    return { connectionString };
  }),
);

const AppLoggerLive = Layer.succeed(AppLogger, {
  log: (message: string) => Effect.log(message),
});

// --- Wire Everything Together ---
const AllLayers = Layer.mergeAll(DatabaseConfigLive, AppLoggerLive, UserRepository.Live);

// --- Application Entry Point ---
const app = Effect.gen(function* () {
  const repo = yield* UserRepository;
  const users = yield* repo.findAll();
  return users;
}).pipe(
  Effect.provide(AllLayers),
  Effect.withSpan("app.listUsers"),
  Metric.trackDuration(Metric.timer("app.listUsers.duration")),
);

Effect.runPromise(app).then(console.log);
```

## 2. HTTP Server with @effect/platform

```typescript
import { Effect, Layer, Context } from "effect";
import { HttpServer, HttpMiddleware } from "@effect/platform";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";

// Service
class UserService extends Effect.Service("UserService")<
  UserService,
  {
    readonly getUser: (id: string) => Effect.Effect<User, NotFoundError, never>;
  }
>() {}

// Schema for request validation
const UserParams = Schema.Struct({
  id: Schema.NumberFromString,
});

// HTTP Routes
const routes = HttpServer.router.empty.pipe(
  HttpServer.router.get("/users/:id", (request) =>
    Effect.gen(function* () {
      const params = yield* Schema.decodeUnknown(UserParams)(request.pathParams);
      const service = yield* UserService;
      const user = yield* service.getUser(String(params.id));
      return HttpServer.response.json(user);
    }).pipe(
      Effect.catchTag("NotFoundError", () =>
        HttpServer.response.json({ error: "Not found" }, { status: 404 }),
      ),
      Effect.catchTag("ParseError", () =>
        HttpServer.response.json({ error: "Invalid ID" }, { status: 400 }),
      ),
    ),
  ),
  HttpServer.middleware.logger,
);

// Server layer
const ServerLive = HttpServer.serve(routes).pipe(
  HttpServer.withLogAddress,
  Layer.provide(UserService.Live),
);

// Start
NodeRuntime.runMain(NodeHttpServer.layer(() => ({ port: 3000 })).pipe(Layer.provide(ServerLive)));
```

## 3. Stream Processing Pipeline

```typescript
import { Stream, Sink, Effect, Schedule, Chunk } from "effect";

// Ingest events from a source, process, and batch-write
const eventStream = Stream.repeat(
  Effect.tryPromise({
    try: () => fetchEvents(),
    catch: (e) => new FetchError(e),
  }),
  Schedule.spaced("5 seconds"),
).pipe(
  // Flatten array of events into individual elements
  Stream.flatMap((events) => Stream.fromIterable(events)),

  // Filter and transform
  Stream.filter((event) => event.type === "important"),
  Stream.map((event) => ({
    ...event,
    processedAt: new Date(),
    score: calculateScore(event),
  })),

  // Add observability
  Stream.tap((event) => Effect.logDebug("Processing event", event.id)),
  Metric.trackOccurrences(Metric.frequency("event.types")),

  // Batch into chunks of 100
  Stream.chunkN(100),

  // Write batches with retry
  Stream.mapEffect((batch) =>
    writeBatch(batch).pipe(
      Effect.retry(Schedule.exponential("200 millis")),
      Effect.timeout("30 seconds"),
      Effect.tap(() => Metric.counter("batches_written").pipe(Metric.apply(Effect.succeed(1)))),
    ),
  ),

  // Run forever
  Stream.runDrain,
);

Effect.runFork(eventStream);
```

## 4. Concurrent Worker Pool

```typescript
import { Effect, Queue, Fiber, Scope } from "effect";

class WorkerPool extends Effect.Service("WorkerPool")<
  WorkerPool,
  {
    readonly submit: (job: Job) => Effect.Effect<void, never, never>;
    readonly shutdown: Effect.Effect<void>;
  }
>() {
  static Live = (concurrency: number) =>
    Layer.scoped(
      WorkerPool,
      Effect.gen(function* () {
        const queue = yield* Queue.bounded<Job>(concurrency * 10);
        const scope = yield* Scope.make();

        // Start workers
        const workers = yield* Effect.all(
          Array.from({ length: concurrency }, (_, i) =>
            Effect.gen(function* () {
              while (true) {
                const job = yield* Queue.take(queue);
                yield* processJob(job).pipe(
                  Effect.retry(Schedule.recurs(3)),
                  Effect.catchAll((e) => Effect.logError("Job failed", e)),
                );
              }
            }).pipe(Effect.forkIn(scope), Effect.as(i)),
          ),
        );

        return WorkerPool.of({
          submit: (job) => Queue.offer(queue, job),
          shutdown: Effect.gen(function* () {
            yield* Queue.shutdown(queue);
            yield* Scope.close(scope, Exit.void);
          }),
        });
      }),
    );
}
```

## 5. Testing with TestClock

```typescript
import { Effect, TestClock, TestServices } from "effect";
import { describe, it, expect } from "vitest";

describe("ScheduledTask", () => {
  it("runs every hour", () =>
    Effect.gen(function* () {
      const counter = yield* Ref.make(0);

      const task = Effect.repeat(
        Ref.update(counter, (n) => n + 1),
        Schedule.spaced("1 hour"),
      );

      // Fork the task
      const fiber = yield* Effect.fork(task);

      // Advance time — no runs yet
      yield* TestClock.adjust("30 minutes");
      expect(yield* Ref.get(counter)).toBe(0);

      // Advance to trigger first run
      yield* TestClock.adjust("30 minutes");
      expect(yield* Ref.get(counter)).toBe(1);

      // Advance 3 more hours
      yield* TestClock.adjust("3 hours");
      expect(yield* Ref.get(counter)).toBe(4);

      yield* Fiber.interrupt(fiber);
    }).pipe(Effect.provide(TestServices.TestLive)));
});
```

## 6. Error Channel Operations

```typescript
import { Effect, Cause, Either, Option } from "effect";

// Sandbox: unify expected + unexpected errors into Cause
const sandboxed = program.pipe(Effect.sandbox);
// Effect<A, Cause<E>, R>

// Analyze the cause
sandboxed.pipe(
  Effect.catchAll((cause) => {
    if (Cause.isFailType(cause)) {
      // Expected error
      return Effect.logError("Expected:", cause.error);
    }
    if (Cause.isDieType(cause)) {
      // Unexpected defect
      return Effect.logError("Defect:", cause.defect);
    }
    if (Cause.isInterruptType(cause)) {
      return Effect.logError("Interrupted");
    }
    return Effect.fail(cause);
  }),
);

// Keep only expected errors, strip defects
program.pipe(
  Effect.stripSomeDefects((d) => (d instanceof TypeError ? Option.some(d) : Option.none())),
);

// Flip: turn success into failure and failure into success
program.pipe(Effect.flip); // Effect<E, A, R>

// Absorb: move expected errors into the success channel as Either
program.pipe(Effect.either); // Effect<Either<E, A>, never, R>
```

## 7. Batching (Request Deduplication)

```typescript
import { Effect, Request, RequestResolver, RequestBlock } from "effect";

// Define a request type
class GetUser extends Request.TaggedError("GetUser")<User, UserError, { readonly id: string }> {}

// Define the resolver (batches requests)
const UserResolver = RequestResolver.makeBatched(
  (requests: Array<GetUser & Request.Request<User, UserError>>) =>
    Effect.gen(function* () {
      const ids = requests.map((r) => r.id);
      const users = yield* Effect.tryPromise(() =>
        db.users.findMany({ where: { id: { in: ids } } }),
      );

      for (const req of requests) {
        const user = users.find((u) => u.id === req.id);
        if (user) Request.completeSuccess(req, user);
        else Request.completeError(req, new UserNotFoundError({ id: req.id }));
      }
    }),
).pipe(RequestResolver.batched("50 millis")); // Batch within 50ms window

// Use the request
const getUser = (id: string) => new GetUser({ id });

const program = Effect.all({
  user1: getUser("1"),
  user2: getUser("2"),
  user3: getUser("3"),
});
// All three requests are batched into a single DB query
```
