# Nitro Configuration

## Config File

Configuration lives in `nitro.config.ts` (or passed directly to `createNitro()`):

```ts
import { defineNitroConfig } from "nitro/config";

export default defineNitroConfig({
  // ... options
});
```

## Core Options

### `preset`

- **Type**: `string`
- **Default**: Auto-detected (production: `node_server`, dev: `nitro_dev`)
- Override with `NITRO_PRESET` env var

### `debug`

- **Type**: `boolean`
- **Default**: `false` (or `true` when `DEBUG` env var is set)

### `logLevel`

- **Type**: `number`
- **Default**: `3` (or `1` in test environments)
- Uses [consola](https://github.com/unjs/consola) log levels

### `runtimeConfig`

- **Type**: `object`
- Server runtime config. `nitro` namespace is reserved.
- Values can be overridden via env vars with `NITRO_` prefix

### `compatibilityDate`

- **Type**: `string` (`YYYY-MM-DD`)
- Opt into latest preset features. Defaults to `"latest"` behavior

### `static`

- **Type**: `boolean`
- **Default**: `false`
- Enable static site generation (prerenders all routes)

## Feature Flags

### `features`

```ts
features: {
  runtimeHooks: true,  // Auto-detected if plugins exist
  websocket: false,    // Enable WebSocket support
}
```

### `experimental`

```ts
experimental: {
  openAPI: false,              // OpenAPI/Scalar/Swagger endpoints
  typescriptBundlerResolution: false,
  asyncContext: false,         // Native async context for useRequest()
  sourcemapMinify: true,
  envExpansion: false,         // Env var expansion in runtime config
  database: false,             // Database connector support
  tasks: false,                // Task/scheduled job support
}
```

### `openAPI`

Top-level OpenAPI configuration:

```ts
openAPI: {
  meta: { title: "My API", description: "...", version: "1.0" },
  production: "runtime",  // or "prerender" to enable in production
  route: "/_openapi.json",
  ui: {
    scalar: { route: "/_scalar", theme: "purple" },
    swagger: { route: "/_swagger" },
  },
}
```

## Storage & Database

### `storage`

```ts
storage: {
  redis: { driver: "redis", url: "redis://localhost:6379" },
  // Additional storage backends...
}
```

### `devStorage`

Storage overrides for development mode:

```ts
devStorage: {
  redis: { driver: "fs", base: "./data/redis" },
}
```

### `database`

Requires `experimental.database: true`:

```ts
database: {
  default: { connector: "sqlite", options: { name: "db" } },
}
```

### `devDatabase`

Database overrides for development:

```ts
devDatabase: {
  default: { connector: "sqlite", options: { name: "db-dev" } },
}
```

## Rendering

### `renderer`

```ts
renderer: {
  handler: "~/renderer",  // Path to render entry (exports event handler)
  static: false,
  template: "<html>...</html>",
}
```

## Static Assets

### `serveStatic`

- **Type**: `boolean | 'node' | 'deno' | 'inline'`
- Serve `public/` assets in production

### `publicAssets`

```ts
publicAssets: [
  {
    baseURL: "images",
    dir: "public/images",
    maxAge: 60 * 60 * 24 * 7, // 7 days Cache-Control
  },
];
```

### `compressPublicAssets`

```ts
compressPublicAssets: {
  gzip: false,
  brotli: false,
  zstd: false,
}
```

### `serverAssets`

```ts
serverAssets: [{ baseName: "templates", dir: "./templates" }];
```

### `noPublicDir`

- **Type**: `boolean`
- **Default**: `false`
- Disables `.output/public` directory creation

## Modules & Plugins

### `modules`

```ts
modules: [
  "./modules/my-module.ts",
  (nitro) => {
    nitro.hooks.hook("compiled", () => {
      /* ... */
    });
  },
];
```

### `plugins`

```ts
plugins: ["~/plugins/my-plugin.ts"];
```

Auto-registers files in `plugins/` directory.

## Tasks

### `tasks`

```ts
tasks: {
  "db:migrate": {
    handler: "./tasks/db-migrate",
    description: "Run database migrations",
  },
}
```

### `scheduledTasks`

```ts
scheduledTasks: {
  "0 * * * *": "cleanup:temp",
  "*/5 * * * *": ["health:check", "metrics:collect"],
}
```

## Auto-Imports

### `imports`

```ts
imports: {
  dirs: ["./utils"],  // Auto-import directories
  // See unimport for full options
}
```

Set to `false` to disable. When enabled, creates `#imports` virtual module.

## Virtual Modules

### `virtual`

```ts
virtual: {
  "#config": `export default { version: "1.0.0" }`,
  "#dynamic": () => generateDynamicContent(),
}
```

## Build Options

### `builder`

- **Type**: `"rollup" | "rolldown" | "vite"`
- **Default**: Auto-detected

### `rollupConfig` / `rolldownConfig`

Additional bundler configuration.

### `minify`

- **Type**: `boolean`
- **Default**: `false`

### `inlineDynamicImports`

- **Type**: `boolean`
- **Default**: `false`
- Bundle everything into a single file

### `sourcemap`

- **Type**: `boolean`
- **Default**: `false`

### `node`

- **Type**: `boolean`
- **Default**: `true`
- Set to `false` for non-Node.js targets (triggers unenv shims)

### `wasm`

```ts
wasm: { lazy: false, esmImport: true }
```

### `unenv`

Environment compatibility presets.

### `alias`

Path aliases for module resolution.

### `exportConditions`

Custom export conditions for module resolution.

### `noExternals`

- **Type**: `boolean`
- **Default**: `false`
- Bundle all dependencies

### `traceDeps`

Additional dependencies to trace and include.

## Directory Options

| Option             | Default               | Description                                      |
| ------------------ | --------------------- | ------------------------------------------------ |
| `rootDir`          | Current dir           | Project main directory                           |
| `serverDir`        | `false`               | Server dir for scanning (`"./server"` or `"./"`) |
| `scanDirs`         | `[sourceDir]`         | Directories to scan for routes, plugins, etc.    |
| `apiDir`           | `"api"`               | Directory name for API routes                    |
| `routesDir`        | `"routes"`            | Directory name for general routes                |
| `buildDir`         | `node_modules/.nitro` | Temporary build files                            |
| `workspaceDir`     | Auto-detected         | Monorepo workspace root                          |
| `output.dir`       | `.output`             | Production output root                           |
| `output.serverDir` | `.output/server`      | Server bundle output                             |
| `output.publicDir` | `.output/public`      | Static assets output                             |

## Routing Options

| Option         | Default  | Description                                      |
| -------------- | -------- | ------------------------------------------------ |
| `baseURL`      | `/`      | Server's main base URL                           |
| `apiBaseURL`   | `/api`   | API route prefix                                 |
| `handlers`     | `[]`     | Programmatic handler registration                |
| `routes`       | `{}`     | Inline route-to-handler mapping                  |
| `routeRules`   | `{}`     | Route-level rules (cache, redirect, proxy, etc.) |
| `errorHandler` | Built-in | Custom error handler path                        |
| `ignore`       | `[]`     | Glob patterns to ignore during scanning          |

## Prerender

```ts
prerender: {
  autoSubfolderIndex: true,   // /about → about/index.html vs about.html
  concurrency: 1,
  interval: 0,
  failOnError: false,
  crawlLinks: false,          // Crawl <a> tags in HTML pages
  ignore: [],
  routes: [],
  retry: 3,
  retryDelay: 500,
}
```

## Dev Server

```ts
devServer: {
  port: 3000,
  hostname: "localhost",
  watch: ["./server/plugins"],
}
```

### `devProxy`

```ts
devProxy: {
  "/proxy/test": "http://localhost:3001",
  "/proxy/example": { target: "https://example.com", changeOrigin: true },
}
```

## Hooks

```ts
hooks: {
  "build:before": (nitro) => { /* Before build starts */ },
  "build:done": (nitro) => { /* After build completes */ },
  "compiled": async (nitro) => { /* After compilation */ },
  "close": () => { /* On shutdown */ },
}
```

## Commands

```ts
commands: {
  preview: "node ./server/index.mjs",
  deploy: "my-cli deploy ./.output",
}
```

Presets fill these automatically.

## Logging

```ts
logging: {
  compressedSizes: true,   // Report compressed bundle sizes
  buildSuccess: true,      // Show build success message
}
```
