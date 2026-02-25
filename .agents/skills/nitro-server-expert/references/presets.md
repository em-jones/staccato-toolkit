# Nitro Deployment Presets

## How Presets Work

Presets are defined using `defineNitroPreset()` from `../_utils/preset.ts`. A preset is an object that configures:

- **`extends`** — Base preset to inherit from (`"base-worker"`, `"node-server"`, `"static"`)
- **`entry`** — Runtime entry point file (relative to presets directory, resolved via `presetsDir`)
- **`output`** — Output directory configuration (`dir`, `serverDir`, `publicDir`)
- **`exportConditions`** — Module resolution conditions (`"node"`, `"netlify"`, etc.)
- **`rollupConfig`** — Bundler output format and settings
- **`unenv`** — Environment compatibility shims
- **`hooks`** — Build lifecycle hooks (`build:before`, `compiled`, etc.)
- **`commands`** — Deploy/preview CLI commands
- **`minify`**, **`wasm`**, **`serveStatic`** — Feature toggles

The most important function is `defineNitroPreset(preset, meta?)` which:

1. Resolves relative entry paths against the presets directory
2. Attaches `_meta` to the preset object
3. Returns the configured preset ready for export

## Preset Categories

### Node.js-Based Presets

These presets extend `node-server` and run on standard Node.js:

| Preset           | Extends       | Notes                                                                   |
| ---------------- | ------------- | ----------------------------------------------------------------------- |
| `node-server`    | —             | Default production preset. Uses `srvx/node` server with cluster support |
| `digital-ocean`  | `node-server` | DigitalOcean App Platform                                               |
| `flight-control` | `node-server` | Flightcontrol deployment                                                |
| `alwaysdata`     | `node-server` | Alwaysdata hosting with rsync deploy command                            |

**Node.js runtime behavior** (`src/presets/node/runtime/node-cluster.ts`):

- Reads `NITRO_PORT` / `PORT` env vars (default: 3000)
- Reads `NITRO_HOST` / `HOST` env vars
- Supports TLS via `NITRO_SSL_CERT` and `NITRO_SSL_KEY`
- Uses `srvx/node` server with `exclusive: false` for cluster mode
- WebSocket support via `crossws/adapters/node` when `import.meta._websocket` is true
- Scheduled tasks via `startScheduleRunner` when `import.meta._tasks` is true
- Error trapping via `trapUnhandledErrors()`
- Imports `#nitro/virtual/polyfills` at module top

### Edge/Worker Presets

These presets extend `base-worker` and run on edge runtimes:

| Preset             | Extends       | Entry                                    | Notes                                |
| ------------------ | ------------- | ---------------------------------------- | ------------------------------------ |
| `cloudflare`       | `base-worker` | `./cloudflare/runtime/cloudflare-module` | Cloudflare Workers/Pages             |
| `cloudflare-pages` | `base-worker` | —                                        | Cloudflare Pages with ASSETS binding |
| `netlify-edge`     | `base-worker` | `./netlify/runtime/netlify-edge`         | Netlify Edge Functions               |
| `zephyr`           | `base-worker` | `./zephyr/runtime/server`                | Zephyr Cloud platform                |

**Cloudflare runtime** (`src/presets/cloudflare/runtime/_module-handler.ts`):

- Uses `createHandler(hooks)` factory pattern
- Exports: `fetch`, `scheduled`, `email`, `queue`, `tail`, `trace`
- Sets `globalThis.__env__` for environment access
- Augments requests with `cf-connecting-ip` header as `req.ip`
- Attaches Cloudflare context to `req.runtime.cloudflare`
- Delegates to `nitroApp.fetch(request)` for routing
- Supports WebSocket via `crossws/adapters/cloudflare`
- Static assets fallback via `env.ASSETS` binding

**Deno runtime** (`src/presets/deno/runtime/deno-server.ts`):

- Uses `srvx/deno` server
- WebSocket via `crossws/adapters/deno`
- TLS support via cert/key env vars
- Scheduled tasks via `startScheduleRunner`

**WinterJS runtime** (`src/presets/winterjs/runtime/winterjs.ts`):

- Uses `addEventListener("fetch", ...)` pattern (Service Worker API)
- Uses `toPlainHandler(nitroApp.h3App)` (not web handler, due to incomplete Web API)
- Includes polyfills for: `Headers.entries`, `URL.pathname`, `URL` constructor, `Response.body`
- Custom `toBuffer()` for ReadableStream conversion

**Zephyr runtime** (`src/presets/zephyr/runtime/server.ts`):

- Minimal: delegates to Cloudflare's `createHandler` with empty fetch hook
- Build-time: imports `zephyr-agent` and calls `uploadOutputToZephyr()` on `compiled` hook
- Adds Cloudflare unenv compatibility (`unenvCfExternals`, `unenvCfNodeCompat`)
- Skips deploy on build unless `__nitroDeploying__` or `zephyr.deployOnBuild` is set

### Serverless Presets

| Preset           | Extends  | Notes                                                                 |
| ---------------- | -------- | --------------------------------------------------------------------- |
| `netlify`        | —        | Netlify Functions (AWS Lambda-based), generates `server.mjs`          |
| `netlify-static` | `static` | Static site generation for Netlify                                    |
| `aws-amplify`    | —        | AWS Amplify with compute resources, routing rules, image optimization |

**Netlify preset** (`src/presets/netlify/preset.ts`):

- Three variants: `netlify` (functions), `netlifyEdge` (edge), `netlifyStatic` (static)
- Uses `unenvDeno` compatibility for edge variant
- Writes headers, redirects, and manifest files on `compiled` hook
- Generates Netlify function wrapper with `generateNetlifyFunction()`
- Sets `autoSubfolderIndex: false` to prevent trailing-slash redirects

### Static Preset

- `static` — Prerenders all routes to static files. No server runtime.
- Output: `.output/public` directory only

## Creating a Custom Preset

```ts
import { defineNitroPreset } from "nitro/presets";

const myPreset = defineNitroPreset(
  {
    extends: "node-server", // or "base-worker" or "static"
    entry: "./my-preset/runtime/server.ts",
    output: {
      dir: "{{ rootDir }}/dist",
      publicDir: "{{ rootDir }}/dist/public",
    },
    exportConditions: ["my-platform"],
    hooks: {
      "build:before": (nitro) => {
        // Modify nitro.options before build
      },
      compiled: async (nitro) => {
        // Post-build actions (deploy, generate manifests, etc.)
      },
    },
    commands: {
      preview: "node ./dist/server/index.mjs",
      deploy: "my-cli deploy ./dist",
    },
  },
  {
    name: "my-preset",
    stdName: "my-platform", // standard name for auto-detection
  },
);

export default [myPreset] as const;
```

## Preset Template Variables

Output paths support Mustache-style templates:

- `{{ rootDir }}` — Project root directory
- `{{ output.dir }}` — Output directory
- `{{ baseURL }}` — Base URL prefix

## Auto-Detection

When `preset` is not explicitly set, Nitro auto-detects the environment:

- `CF_PAGES` → `cloudflare_pages`
- `NETLIFY` → `netlify` or `netlify-edge`
- `VERCEL` → `vercel`
- `AWS_AMPLIFY` → `aws-amplify`
- `DENO_DEPLOYMENT_ID` → `deno`
- Known CI environments → corresponding preset
