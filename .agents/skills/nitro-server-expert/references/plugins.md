# Nitro Plugins

## Overview

Plugins extend Nitro's runtime behavior. They are **executed once** during server startup and receive the `nitroApp` context for registering lifecycle hooks.

## Defining Plugins

```ts
// plugins/my-plugin.ts
import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
  console.log("Plugin initialized", nitroApp);
});
```

### Key Rules

- Plugins run **synchronously** by filename order
- Plugin functions themselves must be **synchronous** (return `void`)
- Hooks registered by plugins can be async
- Auto-registered from `plugins/` directory

## Plugin Configuration

```ts
export default defineNitroConfig({
  plugins: ["my-plugins/hello.ts"], // Custom plugin paths
});
```

## The `nitroApp` Context

| Property       | Type                         | Description                |
| -------------- | ---------------------------- | -------------------------- |
| `hooks`        | `HookableCore`               | Lifecycle hook system      |
| `h3`           | `H3Core`                     | Underlying H3 application  |
| `fetch`        | `(req: Request) => Response` | Internal fetch handler     |
| `captureError` | `(error, context) => void`   | Programmatic error capture |

## Runtime Hooks

### Available Hooks

| Hook       | Signature                                   | Description                     |
| ---------- | ------------------------------------------- | ------------------------------- |
| `request`  | `(event: HTTPEvent) => void`                | Called at start of each request |
| `response` | `(res: Response, event: HTTPEvent) => void` | Called after response creation  |
| `error`    | `(error: Error, context) => void`           | Called when error is captured   |
| `close`    | `() => void`                                | Called on server shutdown       |

### Platform-Specific Hooks

Presets can extend hooks:

- `cloudflare:scheduled` — Cloudflare cron triggers
- `cloudflare:email` — Cloudflare email handling
- `cloudflare:queue` — Cloudflare queue processing
- `cloudflare:tail` — Cloudflare tail workers
- `cloudflare:trace` — Cloudflare distributed tracing

## Plugin Examples

### Error Monitoring

```ts
import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook("error", async (error, { event, tags }) => {
    console.error(`${event?.path} Error:`, error);
    // Send to monitoring service
    await sendToSentry(error, {
      path: event?.path,
      tags,
    });
  });
});
```

### Request Logging

```ts
import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook("request", (event) => {
    console.log(`→ ${event.method} ${event.path}`);
  });

  nitroApp.hooks.hook("response", (res, event) => {
    console.log(`← ${res.status} ${event.path} (${res.headers.get("content-length")}b)`);
  });
});
```

### Response Header Modification

```ts
import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook("response", (res, event) => {
    const { pathname } = new URL(event.req.url);
    if (pathname.endsWith(".css") || pathname.endsWith(".js")) {
      res.headers.set("Vary", "Origin");
    }
  });
});
```

### Graceful Shutdown

```ts
import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook("close", async () => {
    // Clean up resources
    await database.close();
    await cache.disconnect();
  });
});
```

### Hook Unregistration

```ts
import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
  const unregister = nitroApp.hooks.hook("request", (event) => {
    // ...
  });

  // Remove hook when needed
  unregister();
});
```

## Build-Time Hooks

Plugins can also register build-time hooks via the config:

```ts
export default defineNitroConfig({
  hooks: {
    "build:before": (nitro) => {
      // Before build starts
    },
    "build:done": (nitro) => {
      // After build completes
    },
    compiled: async (nitro) => {
      // After compilation
    },
    close: () => {
      // On shutdown
    },
  },
});
```

## Nitro Modules

Modules are more powerful than plugins — they can modify the build process:

```ts
export default defineNitroConfig({
  modules: [
    "./modules/my-module.ts",
    (nitro) => {
      nitro.hooks.hook("compiled", () => {
        // Post-build actions
      });
    },
  ],
});
```

### Module Structure

```ts
// modules/my-module.ts
export default defineNitroModule((nitro) => {
  // Modify config
  nitro.options.imports = nitro.options.imports || {};
  nitro.options.imports.dirs?.push("./my-utils");

  // Register hooks
  nitro.hooks.hook("build:before", () => {
    // Pre-build setup
  });
});
```
