---
created-by-change: containerize-deployable-artifacts
last-validated: 2026-02-26
---

# Pattern: Container Image Building

Multi-stage container builds with separate production and development configurations enable optimized production images and developer-friendly iteration workflows.

## Core Principle

All deployable artifacts SHALL have two Containerfiles: `Containerfile.prod` for production (multi-stage, distroless, minimal) and `Containerfile.dev` for development (hot-reload, volume mounts, tooling). Production images prioritize size and security; development images prioritize iteration speed. Never mix production and development logic in a single Containerfile.

## Setup

### Containerfile naming convention

Each artifact directory (e.g., `src/staccato-toolkit/server/`) contains:

- **`Containerfile.prod`**: Production multi-stage build
- **`Containerfile.dev`**: Development single-stage build with hot-reload support
- **`Dockerfile`** (optional): Symlink to `Containerfile.prod` for backwards compatibility

### Production Containerfile pattern (Go services)

```dockerfile
# Stage 1: Build
FROM golang:1.23-alpine AS builder
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o app .

# Stage 2: Runtime
FROM gcr.io/distroless/static:nonroot
COPY --from=builder /build/app /app
EXPOSE 8080
CMD ["/app"]
```

**Key characteristics**:

- Multi-stage: Builder stage with full toolchain, runtime stage with minimal base
- Static compilation: `CGO_ENABLED=0` for distroless compatibility
- Size optimization: `-ldflags="-s -w"` strips debug symbols
- Non-root execution: `distroless/static:nonroot` runs as UID 65532
- Minimal layers: Only compiled binary in final image

### Production Containerfile pattern (Node.js services)

```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /build
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false
COPY . .
RUN yarn build

# Stage 2: Runtime
FROM node:22-slim
WORKDIR /app
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/node_modules ./node_modules
COPY package.json ./
EXPOSE 7007
USER node
CMD ["node", "dist/index.js"]
```

**Key characteristics**:

- Multi-stage: Full Alpine image for build, slim image for runtime
- Production dependencies: `yarn install --production=false` in builder, copy `node_modules` to runtime
- Non-root execution: `USER node` (UID 1000)
- Minimal runtime: Only built artifacts and production dependencies

### Development Containerfile pattern (Go services)

```dockerfile
FROM golang:1.23-alpine
WORKDIR /workspace
RUN apk add --no-cache bash curl git
EXPOSE 8080
CMD ["sh", "-c", "go run main.go"]
```

**Key characteristics**:

- Single stage: Full development environment
- Volume mount support: `/workspace` is the mount point for source code
- Tooling included: bash, curl, git for debugging
- Hot-reload ready: Source changes on host trigger rebuild via volume mount

### Development Containerfile pattern (Node.js services)

```dockerfile
FROM node:22
WORKDIR /workspace
RUN npm install -g watchman
EXPOSE 7007 3000
CMD ["yarn", "serve"]
```

**Key characteristics**:

- Single stage: Full Node.js environment
- Hot-reload built-in: `yarn serve` provides HMR (Hot Module Replacement)
- Development server: Exposes both backend (7007) and frontend dev server (3000)
- Tooling included: Full Node.js image with build tools

## Key Guidelines

### Building: Separate prod and dev workflows

**Production build**:

```bash
# ✓ Good: Explicit production build
docker build -f Containerfile.prod -t myapp:1.0.0 .
```

**Development build**:

```bash
# ✓ Good: Development build with volume mount
docker build -f Containerfile.dev -t myapp:dev .
docker run -v $(pwd):/workspace -p 8080:8080 myapp:dev
```

```bash
# ✗ Avoid: Using production image for development
docker run -v $(pwd):/app myapp:1.0.0
# Fails: distroless has no shell, no tooling, read-only filesystem
```

### Multi-stage builds: Minimize final image size

**Production images** MUST use multi-stage builds to exclude build tools and source code from the final image.

```dockerfile
# ✓ Good: Multi-stage with minimal runtime
FROM golang:1.23-alpine AS builder
# ... build steps ...
FROM gcr.io/distroless/static:nonroot
COPY --from=builder /build/app /app
# Final image: ~10MB (binary only)
```

```dockerfile
# ✗ Avoid: Single-stage production image
FROM golang:1.23-alpine
COPY . .
RUN go build -o app .
CMD ["./app"]
# Final image: ~300MB (includes Go toolchain, source, build cache)
```

### Base image selection: Follow security and size principles

| Artifact Type   | Production Base                    | Development Base     | Rationale                                                        |
| --------------- | ---------------------------------- | -------------------- | ---------------------------------------------------------------- |
| Go service      | `gcr.io/distroless/static:nonroot` | `golang:1.23-alpine` | Distroless for minimal attack surface; Alpine for full toolchain |
| Node.js service | `node:22-slim`                     | `node:22`            | Slim for smaller size; full image for build tools and debugging  |
| CLI tool        | `gcr.io/distroless/static:nonroot` | `golang:1.23-alpine` | Same as Go service                                               |

**Selection criteria**:

- Production: Prefer distroless (Go) or slim (Node.js) for minimal size and security
- Development: Prefer full images with tooling for debugging and iteration
- Never use `latest` tags in production; pin specific versions

### Volume mounts: Enable hot-reload in development

Development Containerfiles MUST document the expected volume mount point.

```dockerfile
# ✓ Good: Documented mount point
FROM golang:1.23-alpine
WORKDIR /workspace  # ← Mount source here
CMD ["go", "run", "main.go"]
```

**Usage**:

```bash
# ✓ Good: Mount source to documented location
docker run -v $(pwd):/workspace -p 8080:8080 myapp:dev
```

```bash
# ✗ Avoid: Mounting to arbitrary location
docker run -v $(pwd):/app myapp:dev
# Fails: Containerfile expects /workspace, not /app
```

### Optimization: Use build flags and layer caching

**Go services**:

```dockerfile
# ✓ Good: Optimized build with flags
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o app .
# -s: Strip symbol table
# -w: Strip DWARF debugging info
# Result: ~50% smaller binary
```

**Node.js services**:

```dockerfile
# ✓ Good: Separate dependency and source layers
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .  # ← Source changes don't invalidate dependency cache
RUN yarn build
```

```dockerfile
# ✗ Avoid: Copying everything before install
COPY . .
RUN yarn install  # ← Cache invalidated on any source change
RUN yarn build
```

### Security: Run as non-root user

**Go services** (distroless):

```dockerfile
# ✓ Good: Implicit non-root via distroless
FROM gcr.io/distroless/static:nonroot
# Runs as UID 65532 by default
```

**Node.js services**:

```dockerfile
# ✓ Good: Explicit non-root user
FROM node:22-slim
USER node  # ← UID 1000
CMD ["node", "dist/index.js"]
```

```dockerfile
# ✗ Avoid: Running as root
FROM node:22-slim
# No USER directive → runs as root (UID 0)
CMD ["node", "dist/index.js"]
```

### Documentation: Include build commands in README

Each artifact directory MUST document build and run commands in its README.

**Example README section**:

```markdown
## Container Builds

### Production

\`\`\`bash
docker build -f Containerfile.prod -t staccato-server:1.0.0 .
docker run -p 8080:8080 staccato-server:1.0.0
\`\`\`

### Development (hot-reload)

\`\`\`bash
docker build -f Containerfile.dev -t staccato-server:dev .
docker run -v $(pwd):/workspace -p 8080:8080 staccato-server:dev
\`\`\`
```

## Common Issues

**"exec format error" when running on ARM Mac**
→ The image was built for amd64 but you're running on arm64. Rebuild with `--platform=linux/arm64` or use multi-arch builds: `docker buildx build --platform linux/amd64,linux/arm64 -t app .`

**"no such file or directory" for /bin/sh in production image**
→ Expected behavior for distroless images — they have no shell. Use `kubectl debug` with an ephemeral container for debugging, or test in the builder stage before copying to distroless.

**"permission denied" when writing files at runtime**
→ Distroless runs as UID 65532 (nonroot). Ensure your app writes to `/tmp` (writable) or uses a mounted volume with correct ownership. Do not write to `/app` or other root-owned directories.

**Development container doesn't reflect source changes**
→ Verify volume mount is correct (`-v $(pwd):/workspace`) and matches the `WORKDIR` in the Containerfile. For Node.js, ensure `yarn serve` or watch tool is configured correctly.

**Production image is too large (>100MB for Go, >500MB for Node.js)**
→ Verify multi-stage build is used. Check that only the compiled binary (Go) or built artifacts (Node.js) are copied to the final stage. Use `docker history <image>` to identify large layers.

**"cannot find package" or "module not found" at runtime (Go)**
→ Your binary is dynamically linked but you're using `distroless/static`. Either switch to `distroless/base:nonroot` (if CGO is required) or rebuild with `CGO_ENABLED=0` for static linking.

## See Also

- [Distroless Usage Rules](../../technologies/distroless.md) - Minimal base images for Go services
- [Docker Usage Rules](../../technologies/docker.md) - General Docker best practices
- [Hot-Reload Pattern](../development/hot-reload.md) - Development container hot-reload strategies
- [Base Images Pattern](../infrastructure/base-images.md) - Base image selection criteria
- [Trivy Usage Rules](../../technologies/trivy.md) - Container image vulnerability scanning
