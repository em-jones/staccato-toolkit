---
created-by-change: containerize-deployable-artifacts
last-validated: 2026-02-26
---

# Pattern: Container Base Image Selection

Standardized base image selection ensures consistent security posture, minimal attack surface, and predictable build behavior across all containerized artifacts.

## Core Principle

Production images MUST use minimal base images (distroless for Go, slim variants for Node.js) with pinned versions. Development images MUST use full base images with tooling for debugging and iteration. Never use `latest` tags in production. Always prefer official images from trusted registries. Base image selection is driven by language runtime requirements, security constraints, and operational needs.

## Setup

### Base image registry

All base images MUST come from trusted registries:

- **Google Container Registry (GCR)**: `gcr.io/distroless/*` (distroless images)
- **Docker Hub**: `docker.io/library/*` (official images: golang, node, alpine, etc.)
- **GitHub Container Registry (GHCR)**: `ghcr.io/*` (for internal or third-party images)

**Verification**:
```bash
# ✓ Good: Official image from Docker Hub
FROM golang:1.23-alpine

# ✓ Good: Distroless from GCR
FROM gcr.io/distroless/static:nonroot

# ✗ Avoid: Unverified third-party image
FROM randomuser/golang:latest
```

### Version pinning

Production images MUST pin specific versions. Development images MAY use stable tags.

```dockerfile
# ✓ Good: Pinned production base
FROM golang:1.23.5-alpine3.19

# ✓ Acceptable: Major version pin
FROM golang:1.23-alpine

# ✗ Avoid: Latest tag in production
FROM golang:latest
```

**Rationale**:
- Pinned versions ensure reproducible builds
- Major version pins allow patch updates while preventing breaking changes
- `latest` tag is unpredictable and can break builds without warning

## Key Guidelines

### Go services: Distroless for production, Alpine for development

**Production**:
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
CMD ["/app"]
```

**Development**:
```dockerfile
FROM golang:1.23-alpine
RUN apk add --no-cache bash curl git
WORKDIR /workspace
CMD ["go", "run", "main.go"]
```

**Key points**:
- Production: `gcr.io/distroless/static:nonroot` (~10MB, no shell, non-root by default)
- Development: `golang:1.23-alpine` (~300MB, full Go toolchain, shell, debugging tools)
- Builder stage: `golang:1.23-alpine` (same as dev for consistency)

### Node.js services: Slim for production, full for development

**Production**:
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
USER node
CMD ["node", "dist/index.js"]
```

**Development**:
```dockerfile
FROM node:22
WORKDIR /workspace
CMD ["yarn", "serve"]
```

**Key points**:
- Production: `node:22-slim` (~200MB, minimal OS utilities, no build tools)
- Development: `node:22` (~900MB, full build tools, debugging utilities)
- Builder stage: `node:22-alpine` (smaller, faster builds)

### Alpine vs. Debian-based images

| Criterion | Alpine | Debian (slim/bookworm) | Recommendation |
|-----------|--------|------------------------|----------------|
| Size | ~5MB base | ~50MB base | Alpine for size-sensitive workloads |
| Libc | musl | glibc | Debian if glibc compatibility required |
| Package manager | apk | apt | Alpine for simpler package installs |
| CVE exposure | Lower (fewer packages) | Higher (more packages) | Alpine for security |
| Compatibility | Some binaries fail (musl) | Broader compatibility | Debian if compatibility issues arise |

**Default recommendation**: Use Alpine for Go and Node.js unless compatibility issues arise.

**Example: Switching from Alpine to Debian**:
```dockerfile
# Alpine (default)
FROM golang:1.23-alpine

# Debian (if musl compatibility issues)
FROM golang:1.23-bookworm
```

### Distroless variants: static vs. base

| Variant | Use case | Libc | Size | User |
|---------|----------|------|------|------|
| `gcr.io/distroless/static:nonroot` | Statically-linked Go binaries (`CGO_ENABLED=0`) | None | ~2MB | 65532 (nonroot) |
| `gcr.io/distroless/base:nonroot` | Go binaries with CGO dependencies | glibc | ~20MB | 65532 (nonroot) |
| `gcr.io/distroless/static:latest` | Legacy; not recommended | None | ~2MB | 0 (root) |

**Selection criteria**:
- If `CGO_ENABLED=0` (default for most Go services): Use `static:nonroot`
- If CGO required (e.g., SQLite, some crypto libraries): Use `base:nonroot`
- Never use `:latest` tag without `:nonroot` suffix (runs as root, violates security policy)

**Example**:
```dockerfile
# ✓ Good: Static binary with distroless
FROM gcr.io/distroless/static:nonroot
COPY --from=builder /build/app /app
CMD ["/app"]

# ✓ Good: CGO binary with distroless base
FROM gcr.io/distroless/base:nonroot
COPY --from=builder /build/app /app
CMD ["/app"]

# ✗ Avoid: Root user in distroless
FROM gcr.io/distroless/static:latest
USER 0  # Violates security policy
```

### Multi-arch support: amd64 and arm64

Production images SHOULD support both amd64 (x86_64) and arm64 (Apple Silicon, AWS Graviton) architectures.

**Build command**:
```bash
# ✓ Good: Multi-arch build
docker buildx build --platform linux/amd64,linux/arm64 -t myapp:1.0.0 .
```

**Containerfile (no changes needed)**:
```dockerfile
# Base images automatically pull correct architecture
FROM golang:1.23-alpine AS builder
# ... build steps ...
FROM gcr.io/distroless/static:nonroot
# ... runtime steps ...
```

**Key points**:
- Official images (golang, node, alpine, distroless) support multi-arch
- Use `docker buildx` to build for multiple platforms
- No Containerfile changes needed (base images are multi-arch manifests)

### Security: Non-root user enforcement

All production images MUST run as non-root user.

**Go services (distroless)**:
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

**Alpine-based images**:
```dockerfile
# ✓ Good: Create and use non-root user
FROM alpine:3.19
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
CMD ["/app"]
```

**Verification**:
```bash
# Check user in running container
docker run --rm myapp:1.0.0 id
# Expected: uid=65532(nonroot) gid=65532(nonroot) (distroless)
# Expected: uid=1000(node) gid=1000(node) (Node.js)
```

### Image size targets

| Artifact Type | Target Size (Production) | Acceptable Range |
|---------------|--------------------------|------------------|
| Go service | <30MB | 10-50MB |
| Go CLI | <20MB | 5-30MB |
| Node.js service | <300MB | 200-500MB |
| Node.js frontend | <500MB | 300-800MB |

**Verification**:
```bash
docker images myapp:1.0.0
# Check SIZE column
```

**If size exceeds target**:
- Verify multi-stage build is used
- Check that only necessary files are copied to final stage
- Use `docker history myapp:1.0.0` to identify large layers
- Consider switching to smaller base image (Alpine, distroless)

## Common Issues

**"exec format error" when running on ARM Mac**
→ The image was built for amd64 but you're running on arm64. Rebuild with `--platform=linux/arm64` or use multi-arch builds: `docker buildx build --platform linux/amd64,linux/arm64 -t app .`

**"cannot find package" or "module not found" at runtime (Go)**
→ Your binary is dynamically linked but you're using `distroless/static`. Either switch to `distroless/base:nonroot` (if CGO is required) or rebuild with `CGO_ENABLED=0` for static linking.

**"standard_init_linux.go: exec user process caused: no such file or directory"**
→ Binary was compiled for the wrong architecture or libc. Verify `GOOS=linux` and `CGO_ENABLED=0` (for distroless/static) or `CGO_ENABLED=1` (for distroless/base with glibc).

**"permission denied" when running as non-root**
→ File permissions in the image are incorrect. Ensure copied files are readable by non-root user: `COPY --chown=nonroot:nonroot --from=builder /build/app /app` (distroless) or `chown -R node:node /app` (Node.js).

**"Image pull rate limit exceeded"**
→ Docker Hub rate limits unauthenticated pulls. Either authenticate with Docker Hub (`docker login`) or use a mirror/cache registry.

**"Base image has critical CVEs"**
→ Update to latest patch version of the base image. For distroless, check [Google's release notes](https://github.com/GoogleContainerTools/distroless/releases). For official images, check Docker Hub for updated tags.

**"Alpine package not found (apk add fails)"**
→ Package name may differ from Debian/Ubuntu. Check [Alpine package search](https://pkgs.alpinelinux.org/packages). Example: `apt install netcat` → `apk add netcat-openbsd`.

## See Also

- [Distroless Usage Rules](../../technologies/distroless.md) - Detailed distroless image guidance
- [Docker Usage Rules](../../technologies/docker.md) - General Docker best practices
- [Container Images Pattern](../delivery/container-images.md) - Multi-stage build and Containerfile structure
- [Trivy Usage Rules](../../technologies/trivy.md) - Container image vulnerability scanning
- [Google Distroless GitHub](https://github.com/GoogleContainerTools/distroless) - Official distroless image repository
- [Docker Official Images](https://hub.docker.com/search?q=&type=image&image_filter=official) - Trusted base images
