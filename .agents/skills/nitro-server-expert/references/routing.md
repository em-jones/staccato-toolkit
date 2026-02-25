# Nitro Routing

## File-Based Routing

Nitro scans directories for handler files and automatically maps them to HTTP routes.

### Directory Structure

```
server/
  api/           ← API routes (prefixed with apiBaseURL, default: /api)
  routes/        ← General routes
  middleware/    ← Global middleware (auto-registered, run on every request)
  plugins/       ← Nitro plugins (run on initialization)
  utils/         ← Auto-imported utilities (when imports.enabled)
  tasks/         ← Background task handlers
```

### Route Mapping

| File                         | Route                            |
| ---------------------------- | -------------------------------- |
| `routes/hello.ts`            | `GET /hello`                     |
| `routes/hello.get.ts`        | `GET /hello` (method-specific)   |
| `routes/hello.post.ts`       | `POST /hello`                    |
| `routes/users/[id].ts`       | `GET /users/:id`                 |
| `routes/users/[id]/posts.ts` | `GET /users/:id/posts`           |
| `routes/[...slug].ts`        | Catch-all route                  |
| `routes/api/test.ts`         | `GET /api/test`                  |
| `routes/(admin)/users.ts`    | `GET /users` (group, not in URL) |

### Route Parameter Extraction

Route parameters are available via `event.context.params`:

```ts
// routes/users/[id].ts
export default defineHandler((event) => {
  const { id } = event.context.params; // "123" from /users/123
  return { userId: id };
});
```

### Catch-All Routes

```ts
// routes/docs/[...slug].ts
export default defineHandler((event) => {
  const { slug } = event.context.params; // "guide/intro" from /docs/guide/intro
});
```

### Method Suffixes

Supported method suffixes: `.get`, `.post`, `.put`, `.delete`, `.patch`, `.head`, `.options`, `.connect`, `.trace`

### Environment-Specific Handlers

Append `.dev`, `.prod`, or `.prerender` to the filename:

```
routes/debug.dev.ts       ← Only in development
routes/health.prod.ts     ← Only in production
routes/pre prerender.ts   ← Only during prerendering
```

Suffix order: `[name].[method].[env].ts`

### Route Groups

Directories wrapped in parentheses are for organization only and don't affect the URL:

```
routes/
  (auth)/
    login.ts    ← /login
    logout.ts   ← /logout
  (public)/
    about.ts    ← /about
```

### Ignoring Files

Use glob patterns in the `ignore` config:

```ts
export default defineNitroConfig({
  ignore: [
    "routes/_legacy/**", // Ignore _legacy directory
    "routes/_*.ts", // Ignore files starting with _
  ],
});
```

## Programmatic Routing

### `routes` Config

Map route patterns to handlers:

```ts
export default defineNitroConfig({
  routes: {
    "/api/hello": "./server/routes/hello.ts",
    "/api/custom": {
      handler: "./server/routes/custom.ts",
      method: "POST",
      lazy: true, // Lazy-load the handler
      format: "web", // or "node" for Node.js-specific handlers
      env: ["dev", "prod"], // Environments to include
    },
  },
});
```

### `handlers` Config

Register handlers with middleware support:

```ts
export default defineNitroConfig({
  handlers: [
    {
      route: "/api/**",
      handler: "./server/middleware/api-auth.ts",
      middleware: true, // Runs before route handlers
    },
    {
      route: "/health",
      handler: "./server/handlers/health.ts",
      method: "GET",
    },
  ],
});
```

## Middleware

### Global Middleware

Files in `middleware/` run on every request:

```ts
// middleware/auth.ts
export default defineHandler((event) => {
  // Modify event context
  event.context.user = { name: "Nitro" };
  // Don't return anything! Returning short-circuits the request.
});
```

### Execution Order

Middleware runs in directory listing order. Control order with numeric prefixes:

```
middleware/
  01.logger.ts   ← First
  02.auth.ts     ← Second
  03.cors.ts     ← Third
```

**Important**: File names sort as strings, so `10.ts` comes before `2.ts`. Use `01`, `02`, etc. for 10+ files.

### Route-Scoped Middleware

```ts
export default defineNitroConfig({
  handlers: [
    {
      route: "/api/**",
      handler: "./server/middleware/api-auth.ts",
      middleware: true,
    },
  ],
});
```

## Route Rules

Route rules apply transformations at the top level for matched patterns:

```ts
export default defineNitroConfig({
  routeRules: {
    // Caching
    "/blog/**": { swr: true }, // Stale-while-revalidate
    "/blog/**": { swr: 600 }, // SWR with 10min TTL
    "/blog/**": { static: true }, // Static caching
    "/api/data/**": { cache: { maxAge: 60, swr: true } },

    // Headers
    "/assets/**": { headers: { "cache-control": "s-maxage=0" } },
    "/api/v1/**": { cors: true, headers: { "access-control-allow-methods": "GET" } },

    // Redirects
    "/old-page": { redirect: "/new-page" }, // 307
    "/legacy": { redirect: { to: "https://example.com", status: 308 } },
    "/old-blog/**": { redirect: "https://blog.example.com/**" }, // Wildcard

    // Proxy
    "/api/proxy/**": { proxy: "https://api.example.com" },
    "/cdn/**": { proxy: "https://cdn.jsdelivr.net/**" },

    // Auth
    "/admin/**": { basicAuth: { username: "admin", password: "secret" } },

    // Prerender
    "/about": { prerender: true },

    // Disable rules
    "/admin/public/**": { basicAuth: false },
    "/api/cached/no-cache": { cache: false, swr: false },
  },
});
```

### Rule Merging

Rules merge from least specific to most specific. More specific rules override less specific ones. Use `false` to disable inherited rules.

## Code Splitting

Nitro creates a separate chunk for each route handler:

- `_routes/<path>.mjs` — Route handler chunks
- `_tasks/<name>.mjs` — Task handler chunks
- `_libs/<package>.mjs` — Shared library chunks (node_modules)
- `_build/<name>.mjs` — Build-time code chunks
- `_virtual/<name>.mjs` — Virtual module chunks
- `_wasm/<name>.mjs` — WASM module chunks
- `_chunks/<name>.mjs` — Fallback chunks

Chunks are loaded on-demand. The first request to `/api/users` loads only the users chunk, not posts or other routes.

To bundle everything into a single file, set `inlineDynamicImports: true`.
