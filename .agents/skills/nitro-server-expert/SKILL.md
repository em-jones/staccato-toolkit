---
name: nitro-server-expert
description: Expert guide for building Nitro server applications. Use when implementing Nitro handlers, configuring presets, setting up routing, working with middleware, tasks, storage, database, WebSocket, or deploying to any supported platform (Cloudflare, Deno, Node.js, Netlify, Zephyr, AWS Amplify, etc.). Covers filesystem routing, route rules, code splitting, presets, hooks, and runtime behavior.
license: MIT
metadata:
  author: platform-architect
  version: "1.1.0"
  domain: framework
  triggers: Nitro, nitrojs, nitro server, defineHandler, defineNitroConfig, nitro preset, nitro routing, nitro middleware, nitro deploy, cloudflare workers, deno deploy, edge functions, server-side rendering, SSR, file-based routing
  role: specialist
  scope: implementation
  output-format: code
  related-skills: vite-plus, typescript-advanced-types, opentelemetry
---

# Nitro Server Expert

Expert-level guidance for building, configuring, and deploying Nitro server applications. Nitro is a universal server framework that compiles to any JavaScript runtime — Node.js, Deno, Cloudflare Workers, WinterJS, and more — via a **preset system**.

## Core Architecture

Nitro follows these key principles:

1. **Preset-based deployment** — A single codebase deploys anywhere via presets. Each preset configures the bundler, runtime entry point, output paths, and platform-specific hooks.
2. **File-based routing** — Files in `routes/` and `api/` directories automatically become HTTP endpoints. Route patterns use `[param]` for dynamic segments and `[...slug]` for catch-all.
3. **Code splitting per route** — Each route handler becomes a separate chunk loaded on-demand. No runtime router needed.
4. **H3-powered handlers** — Built on [h3](https://h3.dev), a minimal HTTP framework. Handlers receive an `H3Event` object.
5. **Virtual modules** — Uses `#nitro/` and `#imports` virtual module namespaces for runtime APIs.
6. **Hook-based lifecycle** — Build lifecycle uses [hookable](https://github.com/unjs/hookable) with hooks like `build:before`, `compiled`, `close`.

## Quick Start

### Creating a Nitro Server

```ts
// nitro.config.ts
import { defineNitroConfig } from "nitro/config";

export default defineNitroConfig({
  preset: "node-server", // auto-detected in most environments
  serverDir: "./server",
  imports: {
    dirs: ["./utils"],
  },
});
```

### Writing a Handler

```ts
// routes/api/hello.ts
import { defineHandler } from "nitro";

export default defineHandler((event) => {
  return { message: `Hello ${event.url.pathname}!` };
});
```

### Method-specific handlers

```ts
// routes/users.get.ts — GET only
export default defineHandler(async (event) => {
  return { users: [] };
});

// routes/users.post.ts — POST only
export default defineHandler(async (event) => {
  const body = await event.req.json();
  return { created: true, body };
});
```

## Reference Guide

Load detailed guidance based on context:

| Topic              | Reference                     | Load When                                                                             |
| ------------------ | ----------------------------- | ------------------------------------------------------------------------------------- |
| Handlers           | `references/handlers.md`      | Writing event handlers, cached handlers, middleware, error handling                   |
| Deployment Presets | `references/presets.md`       | Deploying to Cloudflare, Deno, Node.js, Netlify, Zephyr, AWS Amplify, or any platform |
| Routing            | `references/routing.md`       | File-based routing, dynamic routes, middleware, route rules, code splitting           |
| Configuration      | `references/configuration.md` | nitro.config.ts options, build settings, output dirs, experimental features           |
| Runtime Behavior   | `references/runtime.md`       | nitroApp lifecycle, hooks, tasks, storage, database, WebSocket, virtual modules       |
| Plugins            | `references/plugins.md`       | Creating plugins, runtime hooks, error monitoring, lifecycle extension                |
| Assets             | `references/assets.md`        | Public assets, server assets, compression, custom asset directories                   |
| Deployment         | `references/deployment.md`    | Platform-specific deployment, environment variables, production checklist             |
| Testing            | `references/testing.md`       | Testing Nitro handlers, dev vs prod testing, Vitest integration                       |

## Key Imports

| Import                                               | Purpose                               |
| ---------------------------------------------------- | ------------------------------------- |
| `import { defineHandler } from "nitro"`              | Typed handler factory                 |
| `import { defineHandler } from "nitro/h3"`           | H3-specific handler with event typing |
| `import { defineNitroConfig } from "nitro/config"`   | Config factory                        |
| `import { useStorage } from "nitro/storage"`         | Key-value storage access              |
| `import { useDatabase } from "nitro/database"`       | Database connector (experimental)     |
| `import { useNitroApp } from "nitro/app"`            | Runtime nitro app instance            |
| `import { useNitroHooks } from "nitro/app"`          | Runtime hooks access                  |
| `import { defineCachedHandler } from "nitro/cache"`  | Cached handler factory                |
| `import { defineCachedFunction } from "nitro/cache"` | Cached function factory               |
| `import { definePlugin } from "nitro"`               | Plugin factory                        |
| `import { defineTask } from "nitro/task"`            | Task definition factory               |

## Handler Return Types

Handlers can return:

- **Plain objects** → serialized as JSON with `application/json`
- **Strings** → sent as `text/plain`
- **`Response` objects** → sent as-is (full control)
- **`ReadableStream`** → streaming responses
- **`null`/`undefined`** → 204 No Content
- **Throws** → caught by error handler

## Environment Variables

| Variable             | Purpose                     |
| -------------------- | --------------------------- |
| `NITRO_PRESET`       | Override deployment preset  |
| `NITRO_PORT`         | Server port (default: 3000) |
| `NITRO_HOST`         | Server host                 |
| `NITRO_SSL_CERT`     | TLS certificate             |
| `NITRO_SSL_KEY`      | TLS private key             |
| `NITRO_APP_BASE_URL` | Application base URL        |
| `DEBUG`              | Enable debug mode           |

## Constraints

### MUST DO

- Use `defineHandler()` for type inference on handlers
- Place API routes in `api/` or `routes/` directories under `serverDir`
- Use `event.url` for URL access (standard `URL` object)
- Use `event.context.params` for route parameters
- Use `event.req` for the raw `Request` object
- Prefix middleware filenames with numbers for execution order control (e.g., `01.auth.ts`)
- Protect OpenAPI routes if enabled in production
- Pass `event` as first arg to `defineCachedFunction` in edge workers

### MUST NOT DO

- Return values from middleware (it will short-circuit the request)
- Import directly from `nitro` subpaths not documented in the public API
- Use `process.env` for runtime config — use `useRuntimeConfig()` instead
- Assume Node.js APIs are available — check preset compatibility
- Hardcode deployment-specific logic — use presets and hooks
- Return non-serializable data (Symbols, Maps, Sets) from cached functions

## Common Patterns

### Database handler

```ts
import { defineHandler } from "nitro";
import { useDatabase } from "nitro/database";

export default defineHandler(async () => {
  const db = useDatabase();
  const { rows } = await db.sql`SELECT * FROM users`;
  return { rows };
});
```

### Storage handler

```ts
import { defineHandler } from "nitro/h3";
import { useStorage } from "nitro/storage";

export default defineHandler(async (event) => {
  const storage = useStorage("my-store");
  await storage.setItem("key", { data: "value" });
  return await storage.getItem("key");
});
```

### Cached handler

```ts
import { defineCachedHandler } from "nitro/cache";

export default defineCachedHandler(
  (event) => {
    return { data: "cached for 1 hour" };
  },
  { maxAge: 60 * 60, swr: true },
);
```

### WebSocket (preset runtime)

```ts
// In nitro.config.ts
export default defineNitroConfig({
  features: { websocket: true },
});
```

### Custom error handler

```ts
// nitro.config.ts
export default defineNitroConfig({
  errorHandler: "~/error",
});

// error.ts
export default defineNitroErrorHandler((error, event) => {
  return new Response(`[custom] ${error.message}`, { status: error.status || 500 });
});
```

### Plugin with error monitoring

```ts
// plugins/monitoring.ts
import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook("error", async (error, { event, tags }) => {
    console.error(`${event?.path} Error:`, error);
  });

  nitroApp.hooks.hook("close", async () => {
    // Cleanup resources
  });
});
```

### Task definition

```ts
// tasks/db/migrate.ts
export default defineTask({
  meta: { name: "db:migrate", description: "Run database migrations" },
  run({ payload, context }) {
    console.log("Running DB migration...");
    return { result: "Success" };
  },
});
```
