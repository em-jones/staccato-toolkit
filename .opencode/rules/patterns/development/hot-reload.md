---
created-by-change: containerize-deployable-artifacts
last-validated: 2026-02-26
---

# Pattern: Hot-Reload Development in Containers

Hot-reload enables rapid iteration by automatically reflecting source code changes inside running containers without manual rebuilds or restarts.

## Core Principle

Development containers MUST support hot-reload through volume mounts and appropriate watch mechanisms. Source code is mounted from the host into the container at a documented location. Changes trigger automatic rebuild (compiled languages) or module reload (interpreted languages) without stopping the container. Production containers never include hot-reload tooling.

## Setup

### Volume mount pattern

All development Containerfiles declare a standard mount point:

```dockerfile
# Go service
FROM golang:1.23-alpine
WORKDIR /workspace  # ← Standard mount point
CMD ["go", "run", "main.go"]
```

```dockerfile
# Node.js service
FROM node:22
WORKDIR /workspace  # ← Standard mount point
CMD ["yarn", "serve"]
```

**Usage**:

```bash
docker run -v $(pwd):/workspace -p 8080:8080 myapp:dev
```

### Hot-reload mechanisms by language

| Language            | Mechanism              | Tool                     | Configuration                                     |
| ------------------- | ---------------------- | ------------------------ | ------------------------------------------------- |
| Node.js (Backstage) | Built-in HMR           | `yarn serve`             | No additional config; webpack/vite handles reload |
| Go (server)         | File watcher + restart | `watchexec` or `air`     | Watch `*.go` files, rebuild and restart on change |
| Go (CLI)            | Manual rebuild         | Interactive shell        | Developer runs `go build` or `go run` manually    |
| TypeScript          | Built-in HMR           | `tsc --watch` or bundler | Transpile on save, reload modules                 |

## Key Guidelines

### Node.js: Use built-in development servers

Backstage and other Node.js services have built-in hot-reload via `yarn serve` or `npm run dev`.

**Development Containerfile**:

```dockerfile
FROM node:22
WORKDIR /workspace
EXPOSE 7007 3000
CMD ["yarn", "serve"]
```

**Usage**:

```bash
# ✓ Good: Mount source, run dev server
docker build -f Containerfile.dev -t backstage:dev .
docker run -v $(pwd):/workspace -p 7007:7007 -p 3000:3000 backstage:dev
# Edit source files → HMR reloads automatically
```

**Key points**:

- `yarn serve` starts webpack-dev-server or Vite with HMR enabled
- Backend changes reload automatically (Node.js module cache invalidation)
- Frontend changes reload via websocket connection to dev server
- No additional tooling required

### Go services: Use file watcher for rebuild + restart

Go services require recompilation on source change. Use a file watcher to detect changes and restart the process.

**Option 1: watchexec (recommended)**

```dockerfile
FROM golang:1.23-alpine
RUN apk add --no-cache bash curl git && \
    wget -qO- https://github.com/watchexec/watchexec/releases/download/v1.25.1/watchexec-1.25.1-x86_64-unknown-linux-musl.tar.xz | tar xJv && \
    mv watchexec-1.25.1-x86_64-unknown-linux-musl/watchexec /usr/local/bin/
WORKDIR /workspace
EXPOSE 8080
CMD ["watchexec", "-r", "-e", "go", "--", "go", "run", "main.go"]
```

**Usage**:

```bash
docker build -f Containerfile.dev -t server:dev .
docker run -v $(pwd):/workspace -p 8080:8080 server:dev
# Edit *.go files → watchexec rebuilds and restarts
```

**Option 2: air (alternative)**

```dockerfile
FROM golang:1.23-alpine
RUN go install github.com/cosmtrek/air@latest
WORKDIR /workspace
EXPOSE 8080
CMD ["air"]
```

**Requires `.air.toml` config**:

```toml
[build]
  cmd = "go build -o ./tmp/main ."
  bin = "tmp/main"
  include_ext = ["go"]
  exclude_dir = ["tmp"]
```

**Key points**:

- `watchexec` is simpler (no config file needed)
- `air` provides more control (custom build commands, delay, exclusions)
- Both tools watch file changes and restart the process
- Restart time is ~1-3 seconds for small services

### Go CLI: Interactive shell for manual iteration

CLI tools often don't need automatic reload. Provide an interactive shell for manual testing.

**Development Containerfile**:

```dockerfile
FROM golang:1.23-alpine
RUN apk add --no-cache bash curl git
WORKDIR /workspace
CMD ["/bin/sh"]
```

**Usage**:

```bash
docker build -f Containerfile.dev -t cli:dev .
docker run -it -v $(pwd):/workspace cli:dev
# Inside container:
# go build -o cli .
# ./cli health
# Edit source, rebuild, test again
```

**Key points**:

- Developer controls rebuild timing
- Suitable for CLI tools that don't run as long-lived processes
- Faster iteration than rebuilding the entire container image

### Port exposure: Document all development ports

Development Containerfiles MUST expose all ports needed for testing.

```dockerfile
# ✓ Good: Expose backend and frontend dev server
FROM node:22
WORKDIR /workspace
EXPOSE 7007 3000  # Backend API, Frontend dev server
CMD ["yarn", "serve"]
```

```dockerfile
# ✓ Good: Expose API port
FROM golang:1.23-alpine
WORKDIR /workspace
EXPOSE 8080  # API server
CMD ["watchexec", "-r", "-e", "go", "--", "go", "run", "main.go"]
```

**Usage**:

```bash
# ✓ Good: Map container ports to host
docker run -v $(pwd):/workspace -p 7007:7007 -p 3000:3000 backstage:dev
```

### Environment variables: Pass via docker run

Development containers often need environment-specific configuration.

```bash
# ✓ Good: Pass env vars at runtime
docker run -v $(pwd):/workspace -p 8080:8080 \
  -e DATABASE_URL=postgres://localhost/dev \
  -e LOG_LEVEL=debug \
  server:dev
```

```bash
# ✗ Avoid: Hardcoding env vars in Containerfile
FROM golang:1.23-alpine
ENV DATABASE_URL=postgres://localhost/dev  # ← Not portable
```

**Alternative: Use .env file**

```bash
docker run -v $(pwd):/workspace -p 8080:8080 \
  --env-file .env \
  server:dev
```

### Debugging: Include development tooling

Development containers MAY include debugging tools not present in production images.

```dockerfile
# ✓ Good: Development tooling
FROM golang:1.23-alpine
RUN apk add --no-cache bash curl git jq vim
WORKDIR /workspace
CMD ["watchexec", "-r", "-e", "go", "--", "go", "run", "main.go"]
```

**Common tools**:

- `bash`: Interactive shell
- `curl`: API testing
- `git`: Version control operations
- `jq`: JSON parsing
- `vim` or `nano`: Text editing

**Production images** MUST NOT include these tools (distroless has none by design).

### Performance: Optimize file watching

File watchers can be CPU-intensive on large codebases. Exclude unnecessary directories.

**watchexec**:

```bash
# ✓ Good: Exclude node_modules and build artifacts
CMD ["watchexec", "-r", "-e", "go", "-i", "tmp/*", "-i", "vendor/*", "--", "go", "run", "main.go"]
```

**air (.air.toml)**:

```toml
[build]
  exclude_dir = ["tmp", "vendor", "node_modules", ".git"]
```

**Key points**:

- Exclude directories with many files (node_modules, vendor, .git)
- Watch only source file extensions (_.go, _.ts, \*.js)
- Use polling interval if filesystem events are unreliable (e.g., network mounts)

## Common Issues

**"Changes not reflected in container"**
→ Verify volume mount is correct (`-v $(pwd):/workspace`) and matches the `WORKDIR` in the Containerfile. Check that the watch tool is running (look for process in `docker exec <container> ps aux`).

**"watchexec or air not found"**
→ Ensure the tool is installed in the Containerfile. For watchexec, download the binary from GitHub releases. For air, use `go install github.com/cosmtrek/air@latest`.

**"Container restarts too frequently"**
→ File watcher may be triggering on build artifacts. Exclude `tmp/`, `dist/`, or other output directories from watch patterns.

**"Port already in use" when running development container**
→ Another container or host process is using the port. Stop the conflicting process or map to a different host port: `-p 8081:8080`.

**"Permission denied" when writing files from container to mounted volume**
→ Container user UID doesn't match host user UID. Either run container with `--user $(id -u):$(id -g)` or fix permissions on host: `chmod -R 777 <directory>` (not recommended for production).

**"Hot-reload is slow (>5 seconds)"**
→ For Go services, ensure `go.mod` and `go.sum` are cached (don't re-download dependencies on every rebuild). For Node.js, ensure `node_modules` is not mounted from host (use a named volume or install inside container).

**"Frontend HMR websocket connection fails"**
→ Ensure the frontend dev server port is exposed and mapped correctly. Check browser console for websocket errors. Verify `HMR_HOST` or similar env var is set to `localhost` (not container hostname).

## See Also

- [Container Images Pattern](../delivery/container-images.md) - Production vs. development Containerfile patterns
- [Base Images Pattern](../infrastructure/base-images.md) - Base image selection for development containers
- [Docker Usage Rules](../../technologies/docker.md) - General Docker best practices
- [Garden Usage Rules](../../technologies/garden.md) - Application orchestration for Kubernetes development
- [watchexec GitHub](https://github.com/watchexec/watchexec) - File watcher tool
- [air GitHub](https://github.com/cosmtrek/air) - Go live reload tool
