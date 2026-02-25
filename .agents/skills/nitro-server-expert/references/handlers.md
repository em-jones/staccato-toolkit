# Nitro Handlers

## Handler Definition

Every route handler exports a default function that receives an `event` object:

```ts
// routes/hello.ts
import { defineHandler } from "nitro";

export default defineHandler((event) => {
  return { message: "Hello World" };
});
```

### `defineHandler` vs plain export

| Approach                  | When to use                                                                   |
| ------------------------- | ----------------------------------------------------------------------------- |
| `defineHandler(fn)`       | Recommended — provides type inference for the event parameter and return type |
| Plain `export default fn` | Works but no type inference on `event`                                        |

### Handler Formats

```ts
// "web" format (default) — standard Fetch API
export default defineHandler((event) => {
  return new Response("Hello");
});

// "node" format — Node.js-specific APIs
export default defineHandler(
  (event) => {
    // Can use Node.js specific APIs
    // Will be converted to web-compatible handler
  },
  { format: "node" },
);
```

## Event Object

The `event` parameter is an `H3Event` instance with these key properties:

| Property               | Type                     | Description                                  |
| ---------------------- | ------------------------ | -------------------------------------------- |
| `event.req`            | `Request`                | The raw Fetch API Request object             |
| `event.url`            | `URL`                    | Parsed URL object                            |
| `event.context`        | `Object`                 | Request context (params, user data, etc.)    |
| `event.context.params` | `Record<string, string>` | Route parameters from `[param]` syntax       |
| `event.node`           | `Object?`                | Node.js-specific properties (when available) |

## Return Types

Handlers can return various types, each handled differently:

| Return Type         | Response                                  |
| ------------------- | ----------------------------------------- |
| `object/array`      | JSON with `application/json` content type |
| `string`            | Plain text with `text/plain` content type |
| `Response`          | Sent as-is with full control              |
| `ReadableStream`    | Streaming response                        |
| `null/undefined`    | 204 No Content                            |
| `Buffer/Uint8Array` | Binary response                           |
| Throws              | Caught by error handler                   |

## Cached Handlers

```ts
import { defineCachedHandler } from "nitro/cache";

export default defineCachedHandler(
  (event) => {
    return { data: "cached for 1 hour" };
  },
  {
    maxAge: 60 * 60,
    swr: true, // stale-while-revalidate
    getKey: (event) => event.url.pathname,
  },
);
```

### Cache Options

| Option        | Type       | Default | Description                                  |
| ------------- | ---------- | ------- | -------------------------------------------- |
| `maxAge`      | `number`   | 1       | Cache TTL in seconds                         |
| `swr`         | `boolean`  | true    | Serve stale while revalidating               |
| `staleMaxAge` | `number`   | 0       | Max age for stale responses (-1 = unlimited) |
| `getKey`      | `function` | auto    | Custom cache key generator                   |
| `base`        | `string`   | "cache" | Storage mount point                          |
| `name`        | `string`   | auto    | Cache group name                             |
| `varies`      | `string[]` | []      | Headers to vary cache on                     |
| `headersOnly` | `boolean`  | false   | Only handle conditional headers              |

### Cache Key Pattern

```
${base}:${group}:${name}:${getKey(...)}.json
```

Example: `cache:nitro/handlers:routes_api_users:default.json`

## Cached Functions

For caching non-handler functions:

```ts
import { defineCachedFunction } from "nitro/cache";

const getGitHubStars = defineCachedFunction(
  async (repo: string) => {
    const res = await fetch(`https://api.github.com/repos/${repo}`);
    const data = await res.json();
    return data.stargazers_count;
  },
  {
    maxAge: 60 * 60,
    name: "ghStars",
    getKey: (repo) => repo,
  },
);
```

### Edge Worker Consideration

For edge workers, pass `event` as first argument:

```ts
const cachedFn = defineCachedFunction(
  async (event: H3Event, arg: string) => {
    // ...
  },
  {
    getKey: (event, arg) => arg,
  },
);
```

## Route Rules for Caching

```ts
export default defineNitroConfig({
  routeRules: {
    "/blog/**": { swr: true }, // SWR with default maxAge
    "/api/**": { swr: 3600 }, // SWR with 1 hour maxAge
    "/static/**": { static: true }, // Static caching
    "/blog/**": { cache: { maxAge: 600 } }, // Full cache options
  },
});
```

## Error Handling in Handlers

```ts
import { defineHandler } from "nitro";
import { HTTPError } from "h3";

export default defineHandler((event) => {
  // Throw HTTP errors
  throw HTTPError.status(404, "Not found");
  throw HTTPError.status(401, "Unauthorized");

  // Or throw plain errors (caught by error handler)
  throw new Error("Something went wrong");
});
```

## Middleware Handlers

Middleware are handlers that don't return anything:

```ts
// middleware/auth.ts
export default defineHandler((event) => {
  const token = event.req.headers.get("authorization");
  if (token) {
    event.context.user = decodeToken(token);
  }
  // Don't return anything!
});
```

### Middleware Execution Order

1. Files in `middleware/` directory run in alphabetical order
2. Prefix with numbers for explicit ordering: `01.auth.ts`, `02.logger.ts`
3. Route-scoped middleware via `handlers` config runs before global middleware

## Handler Environment Filtering

```
routes/
  debug.dev.ts          # Dev only
  health.prod.ts        # Production only
  prerender.prerender.ts # Prerender only
```

Programmatic environment filtering:

```ts
export default defineNitroConfig({
  handlers: [
    {
      route: "/debug",
      handler: "./routes/debug.ts",
      env: ["dev"], // Only in development
    },
  ],
});
```

## Programmatic Handler Registration

```ts
export default defineNitroConfig({
  routes: {
    "/api/hello": "./server/routes/hello.ts",
    "/api/custom": {
      handler: "./server/routes/custom.ts",
      method: "POST",
      lazy: true,
    },
  },
  handlers: [
    {
      route: "/api/**",
      handler: "./server/middleware/auth.ts",
      middleware: true,
    },
  ],
});
```
