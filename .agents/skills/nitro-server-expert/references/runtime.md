# Nitro Runtime Behavior

## Application Lifecycle

### `createNitro()`

The core factory function (`src/nitro.ts`) creates a Nitro instance:

```ts
const nitro = await createNitro(config, opts);
```

Lifecycle steps:

1. **Load options** — Merge config with defaults, resolve preset
2. **Create context** — Build Nitro object with hooks, VFS, routing, logger
3. **Register globally** — `registerNitroInstance(nitro)` stores on `globalThis`
4. **Init routing** — `initNitroRouting(nitro)` sets up route matching
5. **Scan & sync** — `scanAndSyncOptions(nitro)` scans plugins, tasks, modules
6. **Install modules** — `installModules(nitro)` runs module setup functions
7. **Setup auto-imports** — Creates `unimport` instance and `#imports` virtual module
8. **Scan handlers** — `scanHandlers(nitro)` populates route handlers from filesystem
9. **Sync routers** — `nitro.routing.sync()` finalizes route registration

### Nitro Object

```ts
interface Nitro {
  options: NitroOptions; // Resolved configuration
  hooks: Hookable; // Event hooks system
  vfs: Map<string, string>; // Virtual file system
  routing: RoutingInfo; // Route registration
  logger: ConsolaInstance; // Tagged logger
  scannedHandlers: Handler[]; // Filesystem-scanned handlers
  unimport?: Unimport; // Auto-import engine
  fetch: (req: Request) => Response; // Request handler (dev server attached)
  close: () => Promise<void>; // Shutdown hook
  updateConfig: (config) => void; // Hot config update
}
```

## Runtime APIs

### `useNitroApp()`

Returns the globally registered Nitro application instance. Available in all runtime code:

```ts
import { useNitroApp } from "nitro/app";

const nitroApp = useNitroApp();
// nitroApp.fetch — Main request handler
// nitroApp.h3App — Underlying H3 application
```

### `useNitroHooks()`

Returns the hooks instance for runtime hook registration:

```ts
import { useNitroHooks } from "nitro/app";

const hooks = useNitroHooks();
hooks.hook("cloudflare:scheduled", ({ controller, env, context }) => {
  // Handle scheduled task trigger
});
```

## Virtual Modules

Nitro uses virtual module namespaces prefixed with `#nitro/`:

| Virtual Module                 | Purpose                                                        |
| ------------------------------ | -------------------------------------------------------------- |
| `#nitro/virtual/polyfills`     | Runtime polyfills (imported by all preset entries)             |
| `#nitro/virtual/public-assets` | Public asset URL checking (`isPublicAssetURL`)                 |
| `#nitro/virtual/tasks`         | Task definitions (`tasks`, `scheduledTasks`)                   |
| `#nitro/runtime/task`          | Task runner (`runTask`, `runCronTasks`, `startScheduleRunner`) |
| `#nitro/runtime/error/hooks`   | Error handling (`trapUnhandledErrors`)                         |
| `#nitro/runtime/app`           | App utilities (`resolveWebsocketHooks`)                        |
| `#imports`                     | Auto-generated auto-import exports                             |
| `#nitro`                       | Backward compatibility alias for `#imports`                    |

## Tasks System

Tasks are background jobs that can be triggered manually or on a schedule.

### Dev Tasks Endpoint

Available at `/_nitro/tasks` (dev mode only):

- `GET /_nitro/tasks` — List all tasks and scheduled tasks
- `GET /_nitro/tasks/:name` — Execute a specific task (accepts JSON body or query params as payload)

### Task Runner

```ts
import { runTask } from "#nitro/runtime/task";

await runTask("db:migrate", {
  context: { waitUntil: promise },
  payload: {
    /* task arguments */
  },
});
```

### Scheduled Tasks

```ts
import { runCronTasks } from "#nitro/runtime/task";
import { startScheduleRunner } from "#nitro/runtime/task";

// Cloudflare scheduled handler
context.waitUntil(
  runCronTasks(controller.cron, {
    context: { cloudflare: { env, context } },
    payload: {},
  }),
);

// Node.js/Deno schedule runner
startScheduleRunner({ waitUntil: server.waitUntil });
```

## Storage Layer

```ts
import { useStorage } from "nitro/storage";

const storage = useStorage("my-store"); // Named storage namespace
await storage.setItem("key", { data: "value" });
const value = await storage.getItem("key");
const keys = await storage.getKeys();
const meta = await storage.getMeta("key");
await storage.removeItem("key");
await storage.clear();
```

### Storage Configuration

```ts
export default defineNitroConfig({
  storage: {
    "my-store": { driver: "redis", url: "redis://localhost:6379" },
    cache: { driver: "fs", base: "./cache" },
  },
  devStorage: {
    "my-store": { driver: "fs", base: "./data/store" },
  },
});
```

## Database (Experimental)

Requires `experimental.database: true`:

```ts
import { useDatabase } from "nitro/database";

const db = useDatabase(); // Default database
const { rows } = await db.sql`SELECT * FROM users WHERE id = ${userId}`;
```

### Database Configuration

```ts
database: {
  default: { connector: "sqlite", options: { name: "db" } },
  analytics: { connector: "libsql", options: { url: "http://localhost:8080" } },
}
```

## WebSocket

Enable via config:

```ts
export default defineNitroConfig({
  features: { websocket: true },
});
```

Each preset uses `crossws` with the appropriate adapter:

- Node.js: `crossws/adapters/node`
- Deno: `crossws/adapters/deno`
- Cloudflare: `crossws/adapters/cloudflare`

WebSocket hooks are resolved via `resolveWebsocketHooks()` from `#nitro/runtime/app`.

## Error Handling

### Runtime Error Handler

Custom error handlers receive `(error, event, { defaultHandler })`:

```ts
export default defineNitroErrorHandler((error, event, { defaultHandler }) => {
  if (error.status !== 404) {
    console.error(error);
  }
  return new Response(`Error: ${error.message}`, { status: error.status || 500 });
});
```

### Default Error Handler

The default handler (`src/runtime/virtual/error-handler.ts`):

- Logs errors with status !== 404
- Returns response via `toResponse(error, event)`

### Development Error Display

In development, HTML error pages are shown for `Accept: text/html` requests. In production, errors are always JSON.

## Platform-Specific Runtime Patterns

### Cloudflare Workers

```ts
// Entry: createHandler({ fetch(request, env, context, url, extras) { ... } })
export default createHandler<Env>({
  fetch(cfRequest, env, context, url) {
    // Static assets fallback
    if (env.ASSETS && isPublicAssetURL(url.pathname)) {
      return env.ASSETS.fetch(cfRequest);
    }
    // WebSocket upgrade
    if (cfRequest.headers.get("upgrade") === "websocket") {
      return ws.handleUpgrade(cfRequest, env, context);
    }
    // Falls through to nitroApp.fetch()
  },
});
```

### Node.js Cluster

```ts
// Entry: src/presets/node/runtime/node-cluster.ts
const server = serve({
  port,
  hostname: host,
  tls: cert && key ? { cert, key } : undefined,
  node: { exclusive: false }, // Shared port for cluster
  fetch: nitroApp.fetch,
});
```

### Deno

```ts
// Entry: src/presets/deno/runtime/deno-server.ts
const server = serve({
  port,
  hostname: host,
  tls: cert && key ? { cert, key } : undefined,
  fetch: _fetch, // May be wrapped with WebSocket handler
});
```

## Compatibility & Node Shims

When `node: false` or targeting edge runtimes, Nitro uses [unenv](https://github.com/unjs/unenv) for Node.js API compatibility:

- `unenvCfExternals` — Cloudflare externals mapping
- `unenvCfNodeCompat` — Cloudflare Node.js compatibility shims
- `unenvDeno` — Deno compatibility shims

The compatibility resolver (`src/config/resolvers/compatibility.ts`) uses `compatx` for compatibility date resolution.

## Import Resolution

Auto-imports configuration (`src/config/resolvers/imports.ts`):

- Adds `utils/**/*` from each `scanDir` to auto-import directories
- Excludes `.git`, `buildDir`, and `node_modules` (except scan dirs within node_modules)
- Uses `unimport` for dynamic import generation
