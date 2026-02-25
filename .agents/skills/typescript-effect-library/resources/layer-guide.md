# Effect Layer & Dependency Injection Guide

## Core Concepts

| Concept     | Description                                                    |
| ----------- | -------------------------------------------------------------- |
| **Tag**     | Unique identifier for a service (key in the Context map)       |
| **Service** | Interface/object providing functionality                       |
| **Context** | Collection of services (map of Tag → Service)                  |
| **Layer**   | Blueprint for constructing services with dependency management |

## Effect.Service (Modern Approach)

```typescript
import { Effect, Layer } from "effect";

class Database extends Effect.Service("Database")<
  Database,
  {
    readonly query: (sql: string) => Effect.Effect<Row[], DatabaseError, never>;
  }
>() {
  // Live implementation
  static Live = Layer.effect(
    Database,
    Effect.gen(function* () {
      const config = yield* DatabaseConfig;
      const client = yield* Effect.acquireRelease(
        Effect.tryPromise(() => pg.connect(config.connectionString)),
        (client) => Effect.promise(() => client.end()),
      );
      return {
        query: (sql) => client.query(sql).pipe(Effect.mapError((e) => new DatabaseError(e))),
      };
    }),
  );

  // Test implementation
  static Test = Layer.succeed(Database, {
    query: () => Effect.succeed([]),
  });
}

// Direct method access (no yield* needed)
const result = yield * Database.query("SELECT 1");
```

## Context.Tag (Manual Approach)

```typescript
import { Context, Effect, Layer } from "effect";

// 1. Define the tag
class Database extends Context.Tag("Database")<
  Database,
  { readonly query: (sql: string) => Effect.Effect<Row[], DatabaseError, never> }
>() {}

// 2. Use in effects
const getUsers = Effect.gen(function* () {
  const db = yield* Database;
  return yield* db.query("SELECT * FROM users");
});
// Effect<Row[], DatabaseError, Database>

// 3. Create layer
const DatabaseLive = Layer.succeed(Database, {
  query: (sql) => Effect.tryPromise(() => pg.query(sql)),
});

// 4. Provide
Effect.runPromise(Effect.provide(getUsers, DatabaseLive));
```

## Layer Types and Composition

### Layer Signature

```
Layer<Out, Err, In>
  Out  — Service produced
  Err  — Error during construction
  In   — Dependencies needed
```

### Constructors

```typescript
// From a value (no deps, no errors)
Layer.succeed(Tag, service);
// Layer<Service, never, never>

// From an Effect (may have deps or errors)
Layer.effect(Tag, effectThatProducesService);
// Layer<Service, E, R>

// From a scoped Effect (with cleanup)
Layer.scoped(Tag, scopedEffect);
// Layer<Service, E, R>

// From a function
Layer.sync(Tag, () => service);
// Layer<Service, never, never>

// From a Promise
Layer.promise(Tag, () => promise);
// Layer<Service, unknown, never>
```

### Composition Operators

```typescript
// Merge — combine layers (union of outputs and inputs)
Layer.merge(layerA, layerB);
// Layer<A | B, ErrA | ErrB, InA | InB>

// Provide — satisfy one layer's deps with another
Layer.provide(layerA, layerB);
// Layer<A, ErrA, InA minus what B provides>

// Merge all
Layer.mergeAll(l1, l2, l3, l4);

// Map the output
Layer.map(layer, (service) => enhancedService);

// Map the error
Layer.mapError(layer, (e) => new WrapperError(e));

// To Effect (run layer construction)
Layer.toEffect(layer);
// Effect<Out, Err, In>
```

### Dependency Graph Example

```
Config (no deps)
  ↓
Logger (needs Config)
  ↓
Database (needs Config + Logger)
```

```typescript
class Config extends Context.Tag("Config")<Config, { readonly url: string }>() {}
class Logger extends Context.Tag("Logger")<
  Logger,
  { readonly log: (m: string) => Effect.Effect<void> }
>() {}
class Database extends Context.Tag("Database")<
  Database,
  { readonly query: (s: string) => Effect.Effect<Row[]> }
>() {}

// Config — no dependencies
const ConfigLive = Layer.succeed(Config, { url: "postgres://..." });

// Logger — depends on Config
const LoggerLive = Layer.effect(
  Logger,
  Effect.gen(function* () {
    const config = yield* Config;
    return { log: (m: string) => Effect.sync(() => console.log(`[${config.url}] ${m}`)) };
  }),
);
// Layer<Logger, never, Config>

// Database — depends on Config + Logger
const DatabaseLive = Layer.effect(
  Database,
  Effect.gen(function* () {
    const config = yield* Config;
    const logger = yield* Logger;
    return {
      query: (sql: string) =>
        Effect.gen(function* () {
          yield* logger.log(`Query: ${sql}`);
          return yield* Effect.tryPromise(() => pg.query(sql));
        }),
    };
  }),
);
// Layer<Database, never, Config | Logger>

// Wire up: Database needs Config + Logger, Logger needs Config
const allLayers = Layer.provideMerge(DatabaseLive, Layer.merge(ConfigLive, LoggerLive));
// Layer<Database | Config | Logger, never, never>

// Or provide everything at once
const app = Effect.provide(program, Layer.mergeAll(ConfigLive, LoggerLive, DatabaseLive));
```

## Avoiding Requirement Leakage

**BAD** — Leaking dependencies in service interface:

```typescript
class Database extends Context.Tag("Database")<
  Database,
  {
    // Don't do this — leaks Config and Logger into the interface
    readonly query: (sql: string) => Effect.Effect<Row[], never, Config | Logger>;
  }
>() {}
```

**GOOD** — Clean interface, deps managed by Layer:

```typescript
class Database extends Context.Tag("Database")<Database, {
  readonly query: (sql: string) => Effect.Effect<Row[], DatabaseError, never>
}>() {}

const DatabaseLive = Layer.effect(
  Database,
  Effect.gen(function* () {
    const config = yield* Config    // Deps resolved here
    const logger = yield* Logger    // Not leaked to interface
    return { query: (sql) => ... }
  })
)
```

## Testing Patterns

### Swapping Layers

```typescript
// Production
Effect.provide(program, Layer.mergeAll(ConfigLive, LoggerLive, DatabaseLive));

// Test
Effect.provide(program, Layer.mergeAll(ConfigTest, LoggerTest, DatabaseTest));
```

### Mocking with Effect.Service

```typescript
class Database extends Effect.Service("Database")<
  Database,
  {
    readonly query: (sql: string) => Effect.Effect<Row[], DatabaseError, never>;
  }
>() {
  static Test = Layer.succeed(Database, {
    query: (sql) => Effect.succeed(mockRows),
  });
}

// In test
Effect.provide(testProgram, Database.Test);
```

### Injecting Test Dependencies

```typescript
// Service with test default
class Database extends Effect.Service("Database")<
  Database,
  {
    readonly query: (sql: string) => Effect.Effect<Row[], DatabaseError, never>;
  }
>({
  // Default for testing — used if no layer is provided
  dependencies: Layer.succeed(Database, {
    query: () => Effect.succeed([]),
  }),
  // Live implementation
  effect: Effect.gen(function* () {
    // Production implementation
  }),
}) {}
```

## Memoization

Layers are **memoized by default**: if the same service is needed in multiple places, it's constructed only once.

```typescript
// Both effects share the same Database instance
const program = Effect.gen(function* () {
  const db1 = yield* Database;
  const db2 = yield* Database;
  // db1 === db2 (same reference)
});

// Disable memoization
const DatabaseFresh = Database.Live.pipe(Layer.fresh);
```

## Best Practices

1. **Use `Effect.Service`** over manual `Context.Tag` for simpler definitions
2. **Keep R = `never`** in service method signatures
3. **Name layers** with `Live`/`Test` suffix
4. **Use `Layer.effect`** when construction is effectful
5. **Use `Layer.scoped`** for resources needing cleanup
6. **Merge layers at the root** — `Layer.mergeAll(...)` at application entry
7. **Don't leak dependencies** — keep service interfaces clean
8. **Use `dependencies` option** in `Effect.Service` for test defaults
9. **Memoization is your friend** — shared services are constructed once
10. **Use `Layer.toEffect`** when you need to run layer construction as an effect
