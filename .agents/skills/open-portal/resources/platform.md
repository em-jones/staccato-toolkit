# Open-Portal Platform Architecture

## Overview

The open-portal platform (OpenPort) is a plugin-based application bootstrap system. It provides:

- **Configuration management** — YAML-based config with environment overlays and Standard Schema validation
- **Dependency injection** — Awilix-based IoC container with scoped service containers per plugin
- **Plugin lifecycle** — Ordered startup/shutdown hooks for all registered plugins
- **Observability** — OpenTelemetry SDK integration (traces, metrics, logs)
- **Feature flags** — OpenFeature provider integration with NoopProvider fallback

## Platform Bootstrap Flow

### `init()` — Platform Initialization

```ts
import { init, type OpenPortApp } from "@op/platform";

const app: OpenPortApp = await init(options?: InitOptions);
```

`init()` performs three tasks synchronously before returning the `OpenPortApp` builder:

1. **OTel SDK initialization** — Dynamically imports `@opentelemetry/*` packages (guarded by `OPENPORT_SELF_INTROSPECTION`, defaults to enabled). If packages are not installed, warns and continues.

2. **Config loading** — Calls `loadRawConfig()` which:
   - Reads `openport.yaml` from `configDir` (default: `process.cwd()`)
   - Reads `openport.<env>.yaml` overlay (env from `options.env`, default: `OPENPORT_ENV` or `"local"`)
   - Deep-merges overlay onto base config
   - Interpolates `${ENV_VAR}` references from `process.env`
   - Returns `undefined` on failure (non-fatal — logs warning, uses defaults)

3. **ConfigService registration** — Constructs `ConfigServiceImpl` with the `server` subtree of merged config and registers it as `"configService"` in the root Awilix container.

### `OpenPortApp` Interface

| Property/Method          | Description                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `registerPlugin(plugin)` | Register a plugin (static `Plugin` object or `Promise<{default: Plugin}>`). Returns `this` for chaining.      |
| `start()`                | Run full startup: resolve dynamic imports → ensure feature flag providers → `preStart` → `onInit` → `onReady` |
| `stop()`                 | Graceful shutdown: runs `onDestroy` on all plugins in **reverse registration order**                          |
| `services`               | `ServerServices` — DI container accessor (available immediately after `init()`)                               |
| `config`                 | Raw merged config object (available immediately after `init()`)                                               |
| `configService`          | `ConfigServiceImpl` — register schemas, read typed config sections                                            |

### `start()` Lifecycle Phases

```
start() →
  1. Resolve pending dynamic imports + validate their configs
  2. EnsureServerFeatureFlagProvider (install NoopProvider if none registered)
  3. EnsureClientFeatureFlagProvider (install NoopProvider if none registered)
  4. For each plugin in registration order:
     a. preStart(services, config)  — infrastructure tasks (DB migrations, etc.)
     b. onInit(services, config)    — register services into DI container
     c. onReady(services, config)   — post-wiring tasks (seed data, register routes)
```

Each plugin gets its own **scoped** `ServerServices` container (Awilix child scope of root).

### `stop()` Lifecycle

```
stop() →
  For each plugin in REVERSE registration order:
    onDestroy(services)  — cleanup (close DB connections, stop workers, etc.)
```

Errors in `onDestroy` are caught and logged — they do not prevent other plugins from shutting down.

## Plugin System

### `BasePlugin` Type

```ts
interface BasePlugin {
  /** Unique plugin identifier */
  name: string;

  /** Override config section key (default: name) */
  configKey?: string;

  /** Plugin type for platform classification */
  type:
    | "data_store_provider"
    | "workflow"
    | "o11y"
    | "event_stream_provider"
    | "client_feature_flag_provider"
    | "server_feature_flag_provider"
    | "custom";

  /** Valibot (or any Standard Schema) for server config validation */
  serverConfig: StandardSchemaV1;

  /** Valibot schema for client config validation */
  clientConfig: StandardSchemaV1;

  /** Server-side service registrations [{ name, factory }] */
  serverServices: ServiceRegistration[];

  /** Client-side service registrations */
  clientServices: ServiceRegistration[];

  /** Event handler subscriptions */
  eventHandlers?: PluginEventHandlerRegistration[];

  /** Server lifecycle hooks */
  serverLifecycle: {
    preStart?(services: ServerServices, config: unknown): Promise<void>;
    onInit?(services: ServerServices, config: unknown): Promise<void>;
    onReady?(services: ServerServices, config: unknown): Promise<void>;
    onDestroy?(services: ServerServices): Promise<void>;
  };

  /** Client lifecycle hooks (placeholder) */
  clientLifecycle: {};
}
```

### Plugin Registration

Plugins can be registered in two ways:

```ts
// Static: resolved immediately, config validated at registerPlugin() time
openPort.registerPlugin(myPluginObject);

// Dynamic: resolved at start() time, config validated then
openPort.registerPlugin(import("@op-plugin/my-plugin"));
```

**Config validation**: When a plugin is registered, its `serverConfig` schema is registered with `ConfigService` under `plugin.configKey ?? plugin.name`. The config section is eagerly validated — if it fails, `registerPlugin()` throws.

### Plugin Config Reading

Within lifecycle hooks, plugins receive their validated config as the second argument:

```ts
async preStart(services, config) {
  // config is the result of configService.read(plugin.configKey ?? plugin.name)
  const dbPath = (config as CoreDatastoreConfig).db_path;
}
```

If a plugin has no `serverConfig`, config will be `undefined`.

## Dependency Injection

### Awilix Root Container

A single root Awilix container is created at module load time with:

- `tracer` — OpenTelemetry tracer (`asValue`)
- `rootLogger` — `PinoLogger` singleton

### ServerServices (Scoped Container)

Each plugin gets a **scoped** `ServerServices` instance — an Awilix child scope that:

1. Registers a `logger` (PinoLogger prefixed with `[plugin.name]`)
2. Registers a `meterBuilder` (OTel metrics builder scoped to plugin)
3. Iterates `plugin.serverServices` and registers each `{ name, factory }` as a singleton

```ts
class ServerServices {
  get<N extends ServiceName>(name: N): ServiceType<N>;
  has<N extends ServiceName>(name: N): boolean;
}
```

### ServiceRegistry (Module Augmentation)

Plugins extend the `ServiceRegistry` interface via TypeScript module augmentation:

```ts
// In a plugin's .d.ts or source file:
declare module "@op/platform/services" {
  interface ServiceRegistry {
    db: ReturnType<typeof createDb>;
    eventStream: EventStream;
  }
}
```

This enables type-safe service retrieval: `services.get("db")` returns the correct type.

### Pre-registered Services

| Name             | Type           | Registered By                                      |
| ---------------- | -------------- | -------------------------------------------------- |
| `tracer`         | Tracer         | Root container (module load)                       |
| `rootLogger`     | Logger         | Root container (module load)                       |
| `configService`  | ConfigService  | `init()` after config loading                      |
| `logger`         | Logger         | Per-plugin scope (PinoLogger with `[name]` prefix) |
| `meterBuilder`   | MeterBuilder   | Per-plugin scope                                   |
| `featureService` | FeatureService | Platform (after ensuring provider)                 |

## Config System

### Config Loading

Config files are loaded from the working directory (or `configDir`):

- `openport.yaml` — base configuration
- `openport.<env>.yaml` — environment overlay (merged on top)

Environment variable interpolation: `${VAR_NAME}` or `${VAR_NAME:default}` patterns are replaced with `process.env` values.

### ConfigService

```ts
interface ConfigService {
  registerSchema(key: string, schema: StandardSchemaV1): void;
  read<T>(key: string): T;
}
```

- `registerSchema()` — register a Valibot (or Standard Schema) for a config section
- `read()` — validate and return the typed config for a section (throws on validation failure)

### Server Config Tree

Only the `server` subtree of the loaded config is passed to `ConfigServiceImpl`. Plugin config sections live under `server.<configKey>`.

## Test Bootstrap Pattern

To instantiate the platform in integration tests:

```ts
import { init } from "@op/platform";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

describe("my-plugin integration", () => {
  let app: Awaited<ReturnType<typeof init>>;
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp("/tmp/openport-test-");

    // Write minimal config if the plugin reads config
    await writeFile(
      join(tmpDir, "openport.yaml"),
      `
server:
  my_plugin:
    some_setting: "test-value"
`,
    );

    app = await init({ configDir: tmpDir, env: "test" });

    // Register required plugins
    app.registerPlugin(import("@op-plugin/my-plugin"));

    await app.start();
  });

  afterAll(async () => {
    if (app) await app.stop();
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
  });

  it("should register and resolve my service", () => {
    const service = app.services.get("myService");
    expect(service).toBeDefined();
  });
});
```

### Test Isolation

- Each test suite gets a **fresh** `init()` call — no shared state between suites
- Use `mkdtemp` for isolated config directories and temp files
- Always call `stop()` in `afterAll` for cleanup
- Set `OPENPORT_SELF_INTROSPECTION=false` to skip OTel SDK init in tests (faster startup)

### Common Test Config

```yaml
# Minimal openport.yaml for tests
server:
  core_datastore:
    db_path: "./test.db"
```

## Key Files Reference

| Purpose                     | Path                                      |
| --------------------------- | ----------------------------------------- |
| Platform entry point        | `packages/platform/src/index.ts`          |
| `init()` implementation     | `packages/platform/src/init.server.ts`    |
| `OpenPortApp` type          | `packages/platform/src/init.server.ts`    |
| `BasePlugin` type           | `packages/platform/src/plugins/types.ts`  |
| `ServerServices` class      | `packages/platform/src/services.ts`       |
| `ServiceRegistry` interface | `packages/platform/src/services.ts`       |
| ConfigService interface     | `packages/platform/src/config/api.ts`     |
| ConfigService impl          | `packages/platform/src/config/service.ts` |
| Config loader               | `packages/platform/src/config/loader.ts`  |
| Root config schemas         | `packages/platform/src/config/schema.ts`  |
