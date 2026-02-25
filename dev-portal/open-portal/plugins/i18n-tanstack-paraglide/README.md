# @op-plugin/i18n-tanstack-paraglide

Paraglide JS i18n plugin for the OpenPort platform — compile-time typed message generation with TanStack Start integration.

## Overview

Paraglide JS is a compiler-based i18n library that generates typed message functions and runtime helpers at build time. This plugin integrates it into the OpenPort platform with:

- **Type-safe configuration** via the platform's config system (`@op/platform/i18n`)
- **Vite plugin** for automatic message compilation during builds
- **Middleware factory** for SSR locale detection
- **Zero runtime overhead** — messages are compiled to plain functions

## Architecture

```
@op/platform/i18n          → Interface types (I18nConfig, I18nStrategy)
@op-plugin/i18n-tanstack-paraglide  → Paraglide implementation
  ├── BasePlugin           → OpenPort platform plugin registration
  ├── Vite plugin          → Compile-time message generation
  └── Middleware factory   → SSR locale detection
```

## Installation

```bash
bun add @op-plugin/i18n-tanstack-paraglide
```

## Setup

### 1. Create a Paraglide project

```bash
npx @inlang/paraglide-js init
```

This creates a `project.inlang` directory and `messages/` folder.

### 2. Register the plugin

```ts
import { init } from "@op/platform";

const app = await init();
app.registerPlugin(import("@op-plugin/i18n-tanstack-paraglide"));
await app.start();
```

### 3. Configure in `openport.yaml`

```yaml
server:
  i18n:
    project: "./project.inlang"
    outdir: "./src/paraglide"
    strategy: ["url", "cookie", "baseLocale"]
    baseLocale: "en"
```

### 4. Add the Vite plugin to your app

```ts
// vite.config.ts
import { createParaglideVitePlugin } from "@op-plugin/i18n-tanstack-paraglide/vite-plugin";

export default defineConfig({
  plugins: [
    createParaglideVitePlugin({
      config: {
        project: "./project.inlang",
        outdir: "./src/paraglide",
        strategy: ["url", "cookie", "baseLocale"],
      },
    }),
    tanstackStart(),
  ],
});
```

### 5. Use generated messages

```ts
import { m } from "./paraglide/messages";

m.hello_world();
m.greeting({ name: "Ada" });
```

### 6. SSR middleware (optional)

For server-side locale detection in SSR apps:

```ts
import { createParaglideMiddleware } from "@op-plugin/i18n-tanstack-paraglide";

const handler = createParaglideMiddleware({
  outdir: "./src/paraglide",
});

export default {
  fetch(req: Request) {
    return handler(req, () => new Response("Not found"));
  },
};
```

## Configuration

| Option       | Type       | Default                           | Description                           |
| ------------ | ---------- | --------------------------------- | ------------------------------------- |
| `project`    | `string`   | _(required)_                      | Path to `project.inlang`              |
| `outdir`     | `string`   | _(required)_                      | Output directory for generated files  |
| `strategy`   | `string[]` | `["url", "cookie", "baseLocale"]` | Locale detection order (earlier wins) |
| `baseLocale` | `string`   | `"en"`                            | Fallback locale                       |
| `locales`    | `string[]` | _(inferred)_                      | Explicit locale list                  |

## Development

```bash
vp install    # Install dependencies
vp test       # Run tests
vp check      # Lint and type check
vp pack       # Build
vp dev        # Watch mode
```
