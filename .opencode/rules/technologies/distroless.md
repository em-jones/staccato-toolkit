---
created-by-change: instrument-services-with-observability
last-validated: 2026-02-25
---

# Distroless Container Images Usage Rules

Distroless images are Google's minimal container base images that contain only the application runtime and its dependencies — no shell, package manager, or OS utilities. They reduce attack surface, eliminate CVE exposure from unused binaries, and enforce non-root execution by default.

## Core Principle

Distroless images are the standard runtime base for all production Go services. Multi-stage builds MUST use a full builder image (e.g., `golang:1.23-alpine`) for compilation and copy the static binary to a distroless runtime image. The `gcr.io/distroless/static:nonroot` variant is mandatory for statically-linked Go binaries. Running as root in distroless is prohibited.

## Setup

### Multi-stage Dockerfile pattern

All Go services use a two-stage build: compile in a full environment, run in distroless.

```dockerfile
# Stage 1: Build
FROM golang:1.23-alpine AS builder
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o app .

# Stage 2: Runtime
FROM gcr.io/distroless/static:nonroot
COPY --from=builder /build/app /app
EXPOSE 8080
CMD ["/app"]
```

**Key points**:
- Builder stage: Use `golang:1.23-alpine` (or latest stable Go version)
- Runtime stage: Use `gcr.io/distroless/static:nonroot` for CGO_ENABLED=0 binaries
- `COPY --from=builder`: Only the compiled binary moves to the runtime image
- `USER` directive: Not needed — `nonroot` variant defaults to UID 65532

### Available distroless variants

| Image | Use case | User | Notes |
|-------|----------|------|-------|
| `gcr.io/distroless/static:nonroot` | Statically-linked Go binaries (`CGO_ENABLED=0`) | 65532 (nonroot) | **Default for this platform** |
| `gcr.io/distroless/base:nonroot` | Go binaries with CGO dependencies | 65532 (nonroot) | Includes glibc; use only if CGO required |
| `gcr.io/distroless/static:latest` | Legacy; not recommended | 0 (root) | ✗ Avoid — running as root violates security policy |

**Selection criteria**:
- If `CGO_ENABLED=0` (default for most Go services): Use `static:nonroot`
- If CGO required (e.g., SQLite, some crypto libraries): Use `base:nonroot`
- Never use `:latest` tag without `:nonroot` suffix

## Key Guidelines

### Building: Ensure static compilation

Distroless `static` images have no libc. Your Go binary MUST be statically linked.

```dockerfile
# ✓ Good: Static binary with no external dependencies
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o app .
```

```dockerfile
# ✗ Avoid: CGO enabled without switching to base:nonroot
RUN CGO_ENABLED=1 go build -o app .
# This binary will fail at runtime: "not found" errors for libc
```

**Verification**:
```bash
# Check if binary is statically linked
ldd app
# Expected output: "not a dynamic executable" or "statically linked"
```

### Running: Non-root by default

The `nonroot` user (UID 65532, GID 65532) is the default user in distroless images. No `USER` directive is needed.

```dockerfile
# ✓ Good: Implicit nonroot user
FROM gcr.io/distroless/static:nonroot
COPY --from=builder /build/app /app
CMD ["/app"]
```

```dockerfile
# ✗ Avoid: Explicitly switching to root
FROM gcr.io/distroless/static:nonroot
USER 0
# Violates security policy; blocked by PodSecurityPolicy/Pod Security Standards
```

**File permissions**:
- Copied files inherit builder stage permissions
- Ensure binaries are executable: `RUN chmod +x /build/app` in builder stage if needed
- Distroless filesystem is read-only except `/tmp`

### Debugging: Use ephemeral containers

Distroless images have no shell (`/bin/sh` does not exist). Use `kubectl debug` with an ephemeral container for live debugging.

```bash
# ✓ Good: Attach ephemeral debug container
kubectl debug -it <pod-name> --image=busybox --target=<container-name>

# Inside the ephemeral container, inspect the target container's filesystem
ls /proc/1/root/
```

```bash
# ✗ Avoid: Attempting to exec into distroless container
kubectl exec -it <pod-name> -- /bin/sh
# Error: "OCI runtime exec failed: exec failed: unable to start container process: exec: \"/bin/sh\": stat /bin/sh: no such file or directory"
```

**Alternative debugging approaches**:
- Local testing: Use `docker run --entrypoint /bin/sh <builder-image>` on the builder stage
- Logs: Ensure services write structured logs to stdout/stderr for observability
- Metrics: Expose Prometheus `/metrics` endpoint for runtime state inspection

### Development: Use full images for local iteration

Distroless images are production-only. For local development with hot-reload or interactive debugging, use full images.

```dockerfile
# ✓ Good: Separate development Dockerfile
# Dockerfile.dev
FROM golang:1.23-alpine
WORKDIR /app
RUN apk add --no-cache bash curl
CMD ["go", "run", "main.go"]
```

```yaml
# ✓ Good: Compose override for development
# docker-compose.override.yml
services:
  app:
    build:
      dockerfile: Dockerfile.dev
    volumes:
      - .:/app
```

## Common Issues

**"exec format error" when running on ARM Mac**
→ The image was built for amd64 but you're running on arm64. Rebuild with `--platform=linux/arm64` or use multi-arch builds: `docker buildx build --platform linux/amd64,linux/arm64 -t app .`

**"no such file or directory" for /bin/sh or /bin/bash**
→ Expected behavior — distroless has no shell. Use `kubectl debug` with an ephemeral container for debugging, or test the binary in the builder stage before copying to distroless.

**"permission denied" when writing files at runtime**
→ Distroless runs as UID 65532 (nonroot). Ensure your app writes to `/tmp` (writable) or uses a mounted volume with correct ownership. Do not write to `/app` or other root-owned directories.

**"cannot find package" or "module not found" at runtime**
→ Your binary is dynamically linked but you're using `static:nonroot`. Either switch to `base:nonroot` (if CGO is required) or rebuild with `CGO_ENABLED=0` for static linking.

**"How do I install debugging tools?"**
→ You can't — that's the point of distroless. For one-off debugging, use `kubectl debug` with a sidecar container. For persistent debugging needs, use a non-distroless development image locally.

## See Also

- [OpenTelemetry Usage Rules](./opentelemetry.md) - Observability instrumentation for distroless services
- [Trivy Usage Rules](./trivy.md) - Scanning distroless images for CVEs
- [Google Distroless GitHub](https://github.com/GoogleContainerTools/distroless) - Official repository and image list
- [Kubernetes Ephemeral Containers](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/#ephemeral-container) - kubectl debug documentation
