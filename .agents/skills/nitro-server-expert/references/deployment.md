# Nitro Deployment Guide

## Environment Variables

| Variable             | Purpose                    | Default       |
| -------------------- | -------------------------- | ------------- |
| `NITRO_PRESET`       | Override deployment preset | Auto-detected |
| `NITRO_PORT`         | Server port                | 3000          |
| `NITRO_HOST`         | Server host                | —             |
| `NITRO_SSL_CERT`     | TLS certificate            | —             |
| `NITRO_SSL_KEY`      | TLS private key            | —             |
| `NITRO_APP_BASE_URL` | Application base URL       | `/`           |
| `DEBUG`              | Enable debug mode          | false         |

## Build Output

```
.output/
  public/          ← Static assets (if prerendered or served)
  server/
    index.mjs      ← Server entry point
    chunks/        ← Route handlers and shared code
```

## Deployment Commands

After building, Nitro provides hints for deployment:

```bash
# Preview the build
node .output/server/index.mjs

# Or use preset-specific commands
nitro preview
nitro deploy
```

## Platform-Specific Notes

### Node.js

```bash
# Build
nitro build

# Run
node .output/server/index.mjs
```

- Supports clustering via `node_cluster` preset
- WebSocket support via `crossws`
- TLS via `NITRO_SSL_CERT`/`NITRO_SSL_KEY`

### Cloudflare Workers

```bash
NITRO_PRESET=cloudflare_module nitro build
```

- Generates Wrangler-compatible output
- Auto-generates cron triggers for scheduled tasks
- Static assets via `ASSETS` binding
- WebSocket support via Cloudflare's native API

### Deno Deploy

```bash
NITRO_PRESET=deno_server nitro build
```

- Uses `srvx/deno` server
- Supports TLS
- WebSocket via `crossws/adapters/deno`

### AWS Amplify

```bash
NITRO_PRESET=aws-amplify nitro build
```

- Generates deployment manifest
- Supports compute resources, routing rules, image optimization
- Generates `.amplify/` directory structure

### Vercel

```bash
NITRO_PRESET=vercel nitro build
```

- Generates Vercel-compatible output
- Native cron job integration
- ISR support via `future.nativeSWR`

### Netlify

```bash
NITRO_PRESET=netlify nitro build
```

- Generates Netlify functions
- Edge functions support via `netlify-edge` preset
- Static site generation via `netlify-static` preset

## Preset Auto-Detection

Nitro automatically detects the environment when `NITRO_PRESET` is not set:

| Environment Variable | Detected Preset             |
| -------------------- | --------------------------- |
| `CF_PAGES`           | `cloudflare_pages`          |
| `NETLIFY`            | `netlify` or `netlify-edge` |
| `VERCEL`             | `vercel`                    |
| `AWS_AMPLIFY`        | `aws-amplify`               |
| `DENO_DEPLOYMENT_ID` | `deno`                      |
| None                 | `node_server` (production)  |

## Production Checklist

- [ ] Set `NITRO_PRESET` explicitly for predictable builds
- [ ] Configure `runtimeConfig` for environment-specific values
- [ ] Set up proper error monitoring (via plugins)
- [ ] Configure caching strategy (route rules or `defineCachedHandler`)
- [ ] Set up health check endpoint
- [ ] Configure proper CORS headers if needed
- [ ] Set up monitoring for scheduled tasks
- [ ] Test with `nitro preview` before deploying
