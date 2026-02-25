# Skill: Containerization Patterns

**Description**: Guidance for agents implementing multi-stage Containerfiles with separate production and development configurations, base image selection, and container optimization.

**When to use**: When creating Containerfiles for deployable artifacts, implementing multi-stage builds, selecting base images, or configuring development containers with hot-reload.

---

## Quick Start

### I'm creating a production Containerfile for a Go service
1. Read `.opencode/rules/patterns/delivery/container-images.md` — Production Containerfile pattern (Go services)
2. Read `.opencode/rules/patterns/infrastructure/base-images.md` — Go services: Distroless for production
3. Use this template:
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
4. Verify image size: `docker build -f Containerfile.prod -t app:prod . && docker images app:prod`
   - Target: <30MB for Go services

### I'm creating a development Containerfile for a Go service
1. Read `.opencode/rules/patterns/development/hot-reload.md` — Go services: Use file watcher for rebuild + restart
2. Use this template:
   ```dockerfile
   FROM golang:1.23-alpine
   RUN apk add --no-cache bash curl git && \
       wget -qO- https://github.com/watchexec/watchexec/releases/download/v1.25.1/watchexec-1.25.1-x86_64-unknown-linux-musl.tar.xz | tar xJv && \
       mv watchexec-1.25.1-x86_64-unknown-linux-musl/watchexec /usr/local/bin/
   WORKDIR /workspace
   EXPOSE 8080
   CMD ["watchexec", "-r", "-e", "go", "--", "go", "run", "main.go"]
   ```
3. Run with volume mount: `docker run -v $(pwd):/workspace -p 8080:8080 app:dev`

### I'm creating a production Containerfile for a Node.js service
1. Read `.opencode/rules/patterns/delivery/container-images.md` — Production Containerfile pattern (Node.js services)
2. Read `.opencode/rules/patterns/infrastructure/base-images.md` — Node.js services: Slim for production
3. Use this template:
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
4. Verify image size: `docker build -f Containerfile.prod -t app:prod . && docker images app:prod`
   - Target: <300MB for Node.js services

### I'm creating a development Containerfile for a Node.js service
1. Read `.opencode/rules/patterns/development/hot-reload.md` — Node.js: Use built-in development servers
2. Use this template:
   ```dockerfile
   FROM node:22
   WORKDIR /workspace
   EXPOSE 7007 3000
   CMD ["yarn", "serve"]
   ```
3. Run with volume mount: `docker run -v $(pwd):/workspace -p 7007:7007 -p 3000:3000 app:dev`

### I need to select a base image
1. Read `.opencode/rules/patterns/infrastructure/base-images.md` for the selection matrix:
   - **Go production**: `gcr.io/distroless/static:nonroot`
   - **Go development**: `golang:1.23-alpine`
   - **Node.js production**: `node:22-slim`
   - **Node.js development**: `node:22`
2. Pin versions in production (e.g., `golang:1.23.5-alpine3.19`)
3. Verify non-root user: `docker run --rm app:prod id`

---

## Pattern Reference

### Multi-Stage Build Pattern (Production)

**Purpose**: Minimize final image size by separating build and runtime stages.

**Structure**:
1. **Stage 1 (builder)**: Full toolchain image
   - Install build dependencies
   - Download modules/packages
   - Compile binary or build artifacts
2. **Stage 2 (runtime)**: Minimal base image
   - Copy only compiled binary or built artifacts
   - Set non-root user
   - Define entrypoint

**Key principles**:
- Builder stage uses full image (golang:1.23-alpine, node:22-alpine)
- Runtime stage uses minimal image (distroless, slim)
- Only production artifacts move to runtime stage
- No source code, build tools, or dev dependencies in final image

**Benefits**:
- **Size reduction**: 90%+ smaller (Go: 300MB → 10MB, Node.js: 900MB → 200MB)
- **Security**: Reduced attack surface (no shell, no package manager, no build tools)
- **Performance**: Faster image pulls and container startup

### Single-Stage Build Pattern (Development)

**Purpose**: Enable rapid iteration with hot-reload and debugging tooling.

**Structure**:
1. **Single stage**: Full toolchain image
   - Install development tools (bash, curl, git, debuggers)
   - Configure volume mount point (`WORKDIR /workspace`)
   - Set up hot-reload mechanism (watchexec, yarn serve, etc.)
   - Expose development ports

**Key principles**:
- Use full base image with tooling
- Document volume mount point in WORKDIR
- Include hot-reload tool or entrypoint
- Expose all necessary ports (API, dev server, debugger)

**Benefits**:
- **Fast iteration**: Source changes reflected without rebuild
- **Debugging**: Full toolchain and shell available
- **Consistency**: Same environment across all developers

### Base Image Selection Pattern

**Decision tree**:

```
Is this a production image?
├─ Yes → Go service?
│  ├─ Yes → CGO enabled?
│  │  ├─ Yes → gcr.io/distroless/base:nonroot
│  │  └─ No → gcr.io/distroless/static:nonroot
│  └─ No → Node.js service?
│     └─ Yes → node:22-slim
│
└─ No (development) → Go service?
   ├─ Yes → golang:1.23-alpine
   └─ No → Node.js service?
      └─ Yes → node:22
```

**Key selection criteria**:
- **Production**: Minimal size, no shell, non-root user
- **Development**: Full toolchain, debugging tools, shell
- **Security**: Non-root user, pinned versions, trusted registry
- **Compatibility**: Alpine (musl) vs. Debian (glibc)

### Hot-Reload Pattern (Development)

**Go services** (compiled language):
1. Install file watcher (watchexec or air)
2. Watch `*.go` files for changes
3. Rebuild and restart on change
4. Restart time: ~1-3 seconds

**Node.js services** (interpreted language):
1. Use built-in development server (`yarn serve`, `npm run dev`)
2. HMR (Hot Module Replacement) via webpack/vite
3. Backend: Module cache invalidation
4. Frontend: Websocket-based reload
5. Reload time: <1 second

**Key principles**:
- Volume mount source code to `/workspace`
- Exclude build artifacts from watch (tmp/, dist/, node_modules/)
- Expose all development ports
- Document hot-reload mechanism in README

### Optimization Pattern (Production)

**Go services**:
- Static compilation: `CGO_ENABLED=0 GOOS=linux`
- Strip symbols: `-ldflags="-s -w"`
- Multi-stage: Builder → Distroless
- Result: ~10-30MB final image

**Node.js services**:
- Separate dependency layer: `COPY package.json yarn.lock` before `COPY . .`
- Production dependencies only: `--production=true` in runtime stage
- Multi-stage: Builder (full) → Runtime (slim)
- Result: ~200-300MB final image

**Key principles**:
- Layer caching: Dependencies before source code
- Minimize layers: Combine RUN commands where logical
- Exclude unnecessary files: Use `.dockerignore`
- Pin versions: Avoid `latest` tags

### Security Pattern (Production)

**Non-root user enforcement**:
- **Distroless**: Implicit non-root (UID 65532) via `:nonroot` tag
- **Node.js**: Explicit `USER node` (UID 1000)
- **Alpine**: Create user with `adduser -S appuser` and `USER appuser`

**Verification**:
```bash
docker run --rm app:prod id
# Expected: uid=65532(nonroot) or uid=1000(node)
```

**Key principles**:
- Never run as root (UID 0) in production
- Use official base images from trusted registries
- Pin specific versions (not `latest`)
- Scan images for CVEs with Trivy

---

## Implementation Checklist

### Creating a new Containerfile

**Production (`Containerfile.prod`)**:
- [ ] Multi-stage build (builder + runtime)
- [ ] Minimal runtime base image (distroless, slim)
- [ ] Non-root user (implicit or explicit)
- [ ] Pinned base image versions
- [ ] Optimization flags (Go: `-ldflags="-s -w"`, Node.js: `--production`)
- [ ] Exposed ports documented
- [ ] Image size within target (<30MB Go, <300MB Node.js)

**Development (`Containerfile.dev`)**:
- [ ] Single-stage build with full toolchain
- [ ] Volume mount point documented (`WORKDIR /workspace`)
- [ ] Hot-reload mechanism configured (watchexec, yarn serve)
- [ ] Development tools installed (bash, curl, git)
- [ ] All development ports exposed
- [ ] README documents build and run commands

### Testing Containerfiles

**Production image**:
```bash
# Build
docker build -f Containerfile.prod -t app:prod .

# Check size
docker images app:prod

# Verify non-root user
docker run --rm app:prod id

# Test startup
docker run -p 8080:8080 app:prod
curl http://localhost:8080/healthz
```

**Development image**:
```bash
# Build
docker build -f Containerfile.dev -t app:dev .

# Run with volume mount
docker run -v $(pwd):/workspace -p 8080:8080 app:dev

# Edit source file
echo "// test change" >> main.go

# Verify hot-reload triggered (check logs)
docker logs <container-id>
```

---

## Common Patterns by Artifact Type

### Go CLI Tool

**Production**:
```dockerfile
FROM golang:1.23-alpine AS builder
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o cli .

FROM gcr.io/distroless/static:nonroot
COPY --from=builder /build/cli /cli
CMD ["/cli"]
```

**Development**:
```dockerfile
FROM golang:1.23-alpine
RUN apk add --no-cache bash curl git
WORKDIR /workspace
CMD ["/bin/sh"]
```

### Go HTTP Server

**Production**: Same as CLI, but expose port and set CMD to server binary

**Development**:
```dockerfile
FROM golang:1.23-alpine
RUN apk add --no-cache bash curl git && \
    wget -qO- https://github.com/watchexec/watchexec/releases/download/v1.25.1/watchexec-1.25.1-x86_64-unknown-linux-musl.tar.xz | tar xJv && \
    mv watchexec-1.25.1-x86_64-unknown-linux-musl/watchexec /usr/local/bin/
WORKDIR /workspace
EXPOSE 8080
CMD ["watchexec", "-r", "-e", "go", "--", "go", "run", "main.go"]
```

### Node.js Backend (Backstage, Express, etc.)

**Production**:
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /build
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false
COPY . .
RUN yarn build

FROM node:22-slim
WORKDIR /app
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/node_modules ./node_modules
COPY package.json ./
EXPOSE 7007
USER node
CMD ["node", "dist/index.js"]
```

**Development**:
```dockerfile
FROM node:22
WORKDIR /workspace
EXPOSE 7007 3000
CMD ["yarn", "serve"]
```

---

## Troubleshooting

### Production image is too large
**Symptom**: Image exceeds size targets (>50MB Go, >500MB Node.js)

**Diagnosis**:
```bash
docker history app:prod
# Identify large layers
```

**Solutions**:
- Verify multi-stage build is used
- Check that only necessary files are copied to runtime stage
- Use `.dockerignore` to exclude build artifacts
- Switch to smaller base image (Alpine, distroless)

### "exec format error" when running container
**Symptom**: Container fails to start with "exec format error"

**Cause**: Binary compiled for wrong architecture (amd64 vs. arm64)

**Solution**:
```bash
# Build for correct architecture
docker buildx build --platform linux/amd64 -f Containerfile.prod -t app:prod .
# Or for multi-arch:
docker buildx build --platform linux/amd64,linux/arm64 -f Containerfile.prod -t app:prod .
```

### Hot-reload not working in development container
**Symptom**: Source changes don't trigger rebuild/reload

**Diagnosis**:
```bash
# Verify volume mount
docker inspect <container-id> | grep Mounts -A 10

# Check if watch tool is running
docker exec <container-id> ps aux | grep watchexec
```

**Solutions**:
- Verify volume mount path matches WORKDIR (`-v $(pwd):/workspace`)
- Check that watch tool is installed and running
- Exclude build artifacts from watch (tmp/, dist/)
- For Node.js, verify HMR is enabled in bundler config

### "permission denied" when writing files
**Symptom**: Container can't write to filesystem

**Cause**: Non-root user doesn't have write permissions

**Solution**:
- Write to `/tmp` (writable in distroless)
- Use mounted volume with correct permissions
- For development, run with `--user $(id -u):$(id -g)`

### "cannot find package" at runtime (Go)
**Symptom**: Binary fails with "cannot find package" or "module not found"

**Cause**: Binary is dynamically linked but using distroless/static

**Solution**:
- Rebuild with `CGO_ENABLED=0` for static linking
- Or switch to `gcr.io/distroless/base:nonroot` (includes glibc)

---

## See Also

- [Container Images Pattern](../../rules/patterns/delivery/container-images.md) - Multi-stage build patterns and Containerfile structure
- [Hot-Reload Pattern](../../rules/patterns/development/hot-reload.md) - Development container hot-reload strategies
- [Base Images Pattern](../../rules/patterns/infrastructure/base-images.md) - Base image selection criteria
- [Distroless Usage Rules](../../rules/technologies/distroless.md) - Minimal base images for Go services
- [Docker Usage Rules](../../rules/technologies/docker.md) - General Docker best practices
- [Trivy Usage Rules](../../rules/technologies/trivy.md) - Container image vulnerability scanning
