# Nitro Assets

Nitro supports two asset types: **public assets** (served to clients) and **server assets** (bundled for programmatic access).

## Public Assets

### Default Behavior

Files in `public/` are automatically served:

```
public/
  image.png     ← /image.png
  video.mp4     ← /video.mp4
  robots.txt    ← /robots.txt
```

### Production Behavior

- Copied to `.output/public/` during build
- Manifest with metadata embedded in server bundle
- Automatic `ETag` and `Last-Modified` headers
- Conditional request support (`If-None-Match`, `If-Modified-Since` → `304 Not Modified`)

### Custom Public Asset Directories

```ts
export default defineNitroConfig({
  publicAssets: [
    {
      dir: "public/build",
      baseURL: "build",
      maxAge: 3600, // Cache-Control: public, max-age=3600, immutable
    },
  ],
});
```

#### Options

| Option        | Type                | Default                         | Description                               |
| ------------- | ------------------- | ------------------------------- | ----------------------------------------- |
| `dir`         | `string`            | —                               | Directory path (relative to `rootDir`)    |
| `baseURL`     | `string`            | `/`                             | URL prefix for serving                    |
| `maxAge`      | `number`            | —                               | Cache max-age in seconds                  |
| `fallthrough` | `boolean`           | `true` (root), `false` (others) | Fall through to app handlers if not found |
| `ignore`      | `false \| string[]` | —                               | Override global ignore patterns           |

### Compressed Public Assets

Enable pre-compression during build:

```ts
export default defineNitroConfig({
  compressPublicAssets: {
    gzip: true,
    brotli: true,
    zstd: false,
  },
});
```

- Only compresses MIME types: text, JS, JSON, XML, WASM, fonts, SVG
- Minimum file size: 1KB
- Excludes `.map` files
- Serves compressed version when client sends matching `Accept-Encoding`

## Server Assets

### Default Behavior

Files in `assets/` are bundled into the server:

```
assets/
  data.json
  templates/
    welcome.html
```

Access via storage layer:

```ts
import { useStorage } from "nitro/storage";

export default defineHandler(async () => {
  const serverAssets = useStorage("assets:server");
  const keys = await serverAssets.getKeys();
  const data = await serverAssets.getItem("data.json");
  const template = await serverAssets.getItem("templates/welcome.html");
  return { keys, data, template };
});
```

### Development vs Production

| Environment | Behavior                                           |
| ----------- | -------------------------------------------------- |
| Development | Read directly from filesystem using `fs` driver    |
| Production  | Bundled as lazy imports with pre-computed metadata |

### Custom Server Assets

```ts
export default defineNitroConfig({
  serverAssets: [
    {
      baseName: "templates",
      dir: "./templates",
      pattern: "**/*", // Glob for inclusion
      ignore: ["**/*.bak"], // Exclusion patterns
    },
  ],
});
```

Access via `assets:<baseName>`:

```ts
const templates = useStorage("assets:templates");
const html = await templates.getItem("email.html");
```

### Asset Metadata

Server assets include metadata:

```ts
const meta = await useStorage("assets:server").getMeta("image.png");
// { type: "image/png", etag: "\"...\"", mtime: "2024-01-01T00:00:00.000Z" }

// Set response headers
const raw = await useStorage("assets:server").getItemRaw("image.png");
```

## Build Output Structure

```
.output/
  public/           ← Public assets
    image.png
    robots.txt
  server/
    index.mjs       ← Server entry
    chunks/
      raw/          ← Bundled server assets
        data.json
        templates/
          welcome.html
```
