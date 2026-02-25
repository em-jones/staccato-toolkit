# Skill: Hot-Reload Development

**Description**: Guidance for agents configuring development containers with hot-reload capabilities, volume mounts, and watch mechanisms for rapid iteration.

**When to use**: When creating development Containerfiles, configuring hot-reload for compiled or interpreted languages, or setting up volume mounts for source code changes.

---

## Quick Start

### I'm setting up hot-reload for a Go service
1. Read `.opencode/rules/patterns/development/hot-reload.md` — Go services: Use file watcher for rebuild + restart
2. Choose a file watcher tool:
   - **watchexec** (recommended): Simpler, no config file needed
   - **air**: More control, requires `.air.toml` config
3. Use this Containerfile template:
   ```dockerfile
   FROM golang:1.23-alpine
   RUN apk add --no-cache bash curl git && \
       wget -qO- https://github.com/watchexec/watchexec/releases/download/v1.25.1/watchexec-1.25.1-x86_64-unknown-linux-musl.tar.xz | tar xJv && \
       mv watchexec-1.25.1-x86_64-unknown-linux-musl/watchexec /usr/local/bin/
   WORKDIR /workspace
   EXPOSE 8080
   CMD ["watchexec", "-r", "-e", "go", "--", "go", "run", "main.go"]
   ```
4. Run with volume mount: `docker run -v $(pwd):/workspace -p 8080:8080 app:dev`
5. Edit source files → watchexec rebuilds and restarts (~1-3 seconds)

### I'm setting up hot-reload for a Node.js service (Backstage, Express, etc.)
1. Read `.opencode/rules/patterns/development/hot-reload.md` — Node.js: Use built-in development servers
2. Use this Containerfile template:
   ```dockerfile
   FROM node:22
   WORKDIR /workspace
   EXPOSE 7007 3000
   CMD ["yarn", "serve"]
   ```
3. Run with volume mount: `docker run -v $(pwd):/workspace -p 7007:7007 -p 3000:3000 app:dev`
4. Edit source files → HMR reloads automatically (<1 second)

### I'm setting up hot-reload for a Go CLI tool
1. Read `.opencode/rules/patterns/development/hot-reload.md` — Go CLI: Interactive shell for manual iteration
2. Use this Containerfile template:
   ```dockerfile
   FROM golang:1.23-alpine
   RUN apk add --no-cache bash curl git
   WORKDIR /workspace
   CMD ["/bin/sh"]
   ```
3. Run with volume mount: `docker run -it -v $(pwd):/workspace app:dev`
4. Inside container: `go build -o cli . && ./cli health`
5. Edit source, rebuild, test again (manual control)

### I need to configure volume mounts
1. Read `.opencode/rules/patterns/development/hot-reload.md` — Volume mount pattern
2. Standard mount point: `/workspace`
3. Mount command: `-v $(pwd):/workspace`
4. Verify mount: `docker inspect <container-id> | grep Mounts -A 10`

### I need to optimize file watching performance
1. Exclude unnecessary directories from watch:
   - **Go**: `tmp/`, `vendor/`, `.git/`
   - **Node.js**: `node_modules/`, `dist/`, `.git/`
2. Watch only source file extensions:
   - **Go**: `*.go`
   - **Node.js**: `*.js`, `*.ts`, `*.jsx`, `*.tsx`
3. Example (watchexec): `watchexec -r -e go -i tmp/ -i vendor/ -- go run main.go`

---

## Pattern Reference

### Volume Mount Pattern

**Purpose**: Enable source code changes on host to be reflected inside the container.

**Standard pattern**:
```dockerfile
FROM <base-image>
WORKDIR /workspace  # ← Standard mount point
CMD [<hot-reload-command>]
```

**Usage**:
```bash
docker run -v $(pwd):/workspace -p <port>:<port> app:dev
```

**Key principles**:
- Use `/workspace` as the standard mount point (consistent across all services)
- Document mount point in Containerfile via `WORKDIR`
- Mount entire source tree (not individual files)
- Use absolute paths on host (`$(pwd)`) for portability

### Hot-Reload Mechanism by Language

| Language | Mechanism | Tool | Restart Time | Configuration |
|----------|-----------|------|--------------|---------------|
| Go (server) | File watcher + rebuild + restart | watchexec or air | 1-3 seconds | Inline or `.air.toml` |
| Go (CLI) | Manual rebuild | Interactive shell | N/A (manual) | None |
| Node.js | Built-in HMR | yarn serve, npm run dev | <1 second | webpack/vite config |
| TypeScript | Built-in watch | tsc --watch | <1 second | tsconfig.json |

### Go Services: File Watcher Pattern

**Option 1: watchexec (recommended)**

**Installation**:
```dockerfile
RUN wget -qO- https://github.com/watchexec/watchexec/releases/download/v1.25.1/watchexec-1.25.1-x86_64-unknown-linux-musl.tar.xz | tar xJv && \
    mv watchexec-1.25.1-x86_64-unknown-linux-musl/watchexec /usr/local/bin/
```

**Usage**:
```dockerfile
CMD ["watchexec", "-r", "-e", "go", "--", "go", "run", "main.go"]
```

**Flags**:
- `-r`: Restart on file change
- `-e go`: Watch only `*.go` files
- `--`: Separator between watchexec flags and command
- `go run main.go`: Command to run

**Exclude directories**:
```dockerfile
CMD ["watchexec", "-r", "-e", "go", "-i", "tmp/*", "-i", "vendor/*", "--", "go", "run", "main.go"]
```

**Option 2: air**

**Installation**:
```dockerfile
RUN go install github.com/cosmtrek/air@latest
```

**Configuration** (`.air.toml`):
```toml
[build]
  cmd = "go build -o ./tmp/main ."
  bin = "tmp/main"
  include_ext = ["go"]
  exclude_dir = ["tmp", "vendor", ".git"]
  delay = 1000  # ms
```

**Usage**:
```dockerfile
CMD ["air"]
```

**Key differences**:
- **watchexec**: Simpler, no config file, inline flags
- **air**: More control, config file, custom build commands

### Node.js Services: Built-in HMR Pattern

**Purpose**: Use framework-provided development servers with Hot Module Replacement.

**Backstage**:
```dockerfile
FROM node:22
WORKDIR /workspace
EXPOSE 7007 3000
CMD ["yarn", "serve"]
```

**Express/Custom**:
```dockerfile
FROM node:22
WORKDIR /workspace
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

**Key principles**:
- Use framework's development command (`yarn serve`, `npm run dev`)
- HMR is configured in bundler (webpack, vite, etc.)
- No additional file watcher needed
- Backend: Module cache invalidation
- Frontend: Websocket-based reload

**Ports**:
- Backend API: 7007 (Backstage), 3000 (Express)
- Frontend dev server: 3000 (Backstage), 5173 (Vite)

### CLI Tools: Interactive Shell Pattern

**Purpose**: Provide manual control over rebuild timing for CLI tools.

**Pattern**:
```dockerfile
FROM golang:1.23-alpine
RUN apk add --no-cache bash curl git
WORKDIR /workspace
CMD ["/bin/sh"]
```

**Usage**:
```bash
docker run -it -v $(pwd):/workspace app:dev
# Inside container:
go build -o cli .
./cli health
# Edit source, rebuild, test again
```

**Key principles**:
- No automatic reload (developer controls timing)
- Interactive shell (`-it` flag)
- Full toolchain available (bash, curl, git)
- Suitable for CLI tools that don't run as long-lived processes

### Port Exposure Pattern

**Purpose**: Expose all ports needed for development testing.

**Go HTTP server**:
```dockerfile
EXPOSE 8080  # API server
```

**Node.js backend (Backstage)**:
```dockerfile
EXPOSE 7007 3000  # Backend API, Frontend dev server
```

**Usage**:
```bash
# Map all exposed ports
docker run -v $(pwd):/workspace -p 7007:7007 -p 3000:3000 app:dev
```

**Key principles**:
- Document all ports in Containerfile via `EXPOSE`
- Map ports in `docker run` command (`-p host:container`)
- Expose both API and dev server ports (Node.js)
- Use standard ports (8080 for Go, 7007/3000 for Backstage)

### Environment Variables Pattern

**Purpose**: Pass environment-specific configuration at runtime.

**Pattern**:
```bash
# ✓ Good: Pass env vars at runtime
docker run -v $(pwd):/workspace -p 8080:8080 \
  -e DATABASE_URL=postgres://localhost/dev \
  -e LOG_LEVEL=debug \
  app:dev
```

**Alternative: Use .env file**:
```bash
docker run -v $(pwd):/workspace -p 8080:8080 \
  --env-file .env \
  app:dev
```

**Key principles**:
- Never hardcode env vars in Containerfile
- Pass at runtime via `-e` flag or `--env-file`
- Use `.env` file for multiple variables
- Document required env vars in README

### Development Tooling Pattern

**Purpose**: Include debugging tools not present in production images.

**Pattern**:
```dockerfile
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

**Key principles**:
- Include tools useful for debugging and testing
- Keep list minimal (avoid bloat)
- Document available tools in README
- **Production images MUST NOT include these tools**

### Performance Optimization Pattern

**Purpose**: Minimize CPU usage and rebuild time for file watchers.

**Exclude directories**:
```dockerfile
# watchexec
CMD ["watchexec", "-r", "-e", "go", "-i", "tmp/*", "-i", "vendor/*", "-i", ".git/*", "--", "go", "run", "main.go"]
```

```toml
# air (.air.toml)
[build]
  exclude_dir = ["tmp", "vendor", "node_modules", ".git"]
```

**Watch only source files**:
```dockerfile
# watchexec: Watch only *.go files
CMD ["watchexec", "-r", "-e", "go", "--", "go", "run", "main.go"]
```

**Key principles**:
- Exclude directories with many files (node_modules, vendor, .git)
- Watch only source file extensions (*.go, *.ts, *.js)
- Use polling interval if filesystem events are unreliable (network mounts)

---

## Implementation Checklist

### Creating a development Containerfile with hot-reload

**Go services**:
- [ ] Base image: `golang:1.23-alpine`
- [ ] Install file watcher: `watchexec` or `air`
- [ ] Install development tools: `bash`, `curl`, `git`
- [ ] Set `WORKDIR /workspace`
- [ ] Expose API port (e.g., `EXPOSE 8080`)
- [ ] Configure watch command: `CMD ["watchexec", "-r", "-e", "go", "--", "go", "run", "main.go"]`
- [ ] Document volume mount in README: `-v $(pwd):/workspace`

**Node.js services**:
- [ ] Base image: `node:22`
- [ ] Set `WORKDIR /workspace`
- [ ] Expose ports: `EXPOSE 7007 3000` (backend, frontend dev server)
- [ ] Configure dev server: `CMD ["yarn", "serve"]`
- [ ] Document volume mount in README: `-v $(pwd):/workspace`
- [ ] Verify HMR is enabled in bundler config (webpack, vite)

**CLI tools**:
- [ ] Base image: `golang:1.23-alpine`
- [ ] Install development tools: `bash`, `curl`, `git`
- [ ] Set `WORKDIR /workspace`
- [ ] Configure interactive shell: `CMD ["/bin/sh"]`
- [ ] Document volume mount in README: `-v $(pwd):/workspace`
- [ ] Document manual rebuild workflow in README

### Testing hot-reload

**Go services**:
```bash
# Build and run
docker build -f Containerfile.dev -t app:dev .
docker run -v $(pwd):/workspace -p 8080:8080 app:dev

# Edit source file
echo "// test change" >> main.go

# Verify rebuild triggered (check logs)
docker logs <container-id>
# Expected: "watchexec: rebuilding..." or similar

# Test API
curl http://localhost:8080/healthz
```

**Node.js services**:
```bash
# Build and run
docker build -f Containerfile.dev -t app:dev .
docker run -v $(pwd):/workspace -p 7007:7007 -p 3000:3000 app:dev

# Edit source file
echo "// test change" >> src/index.ts

# Verify HMR triggered (check browser console or logs)
docker logs <container-id>
# Expected: "webpack compiled successfully" or similar

# Test API
curl http://localhost:7007/api/health
```

---

## Common Patterns by Artifact Type

### Go HTTP Server (e.g., staccato-server)

```dockerfile
FROM golang:1.23-alpine
RUN apk add --no-cache bash curl git && \
    wget -qO- https://github.com/watchexec/watchexec/releases/download/v1.25.1/watchexec-1.25.1-x86_64-unknown-linux-musl.tar.xz | tar xJv && \
    mv watchexec-1.25.1-x86_64-unknown-linux-musl/watchexec /usr/local/bin/
WORKDIR /workspace
EXPOSE 8080
CMD ["watchexec", "-r", "-e", "go", "-i", "tmp/*", "--", "go", "run", "main.go"]
```

**Usage**:
```bash
docker build -f Containerfile.dev -t staccato-server:dev .
docker run -v $(pwd):/workspace -p 8080:8080 staccato-server:dev
```

### Go CLI Tool (e.g., staccato-cli)

```dockerfile
FROM golang:1.23-alpine
RUN apk add --no-cache bash curl git
WORKDIR /workspace
CMD ["/bin/sh"]
```

**Usage**:
```bash
docker build -f Containerfile.dev -t staccato-cli:dev .
docker run -it -v $(pwd):/workspace staccato-cli:dev
# Inside container:
go build -o cli .
./cli health
```

### Node.js Backend (e.g., Backstage)

```dockerfile
FROM node:22
WORKDIR /workspace
EXPOSE 7007 3000
CMD ["yarn", "serve"]
```

**Usage**:
```bash
docker build -f Containerfile.dev -t backstage:dev .
docker run -v $(pwd):/workspace -p 7007:7007 -p 3000:3000 backstage:dev
```

---

## Troubleshooting

### Changes not reflected in container
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

### watchexec or air not found
**Symptom**: Container fails to start with "command not found"

**Cause**: Watch tool not installed in Containerfile

**Solution**:
```dockerfile
# watchexec
RUN wget -qO- https://github.com/watchexec/watchexec/releases/download/v1.25.1/watchexec-1.25.1-x86_64-unknown-linux-musl.tar.xz | tar xJv && \
    mv watchexec-1.25.1-x86_64-unknown-linux-musl/watchexec /usr/local/bin/

# air
RUN go install github.com/cosmtrek/air@latest
```

### Container restarts too frequently
**Symptom**: Watch tool triggers on every file change, including build artifacts

**Cause**: Build artifacts (tmp/, dist/) not excluded from watch

**Solution**:
```dockerfile
# watchexec: Exclude tmp/ and vendor/
CMD ["watchexec", "-r", "-e", "go", "-i", "tmp/*", "-i", "vendor/*", "--", "go", "run", "main.go"]
```

```toml
# air: Exclude in .air.toml
[build]
  exclude_dir = ["tmp", "vendor", ".git"]
```

### "Port already in use" when running development container
**Symptom**: `docker run` fails with "port is already allocated"

**Cause**: Another container or host process is using the port

**Solution**:
```bash
# Stop conflicting container
docker ps
docker stop <container-id>

# Or map to different host port
docker run -v $(pwd):/workspace -p 8081:8080 app:dev
```

### "Permission denied" when writing files from container to mounted volume
**Symptom**: Container can't write to mounted volume

**Cause**: Container user UID doesn't match host user UID

**Solution**:
```bash
# Run container with host user UID
docker run --user $(id -u):$(id -g) -v $(pwd):/workspace app:dev

# Or fix permissions on host (not recommended for production)
chmod -R 777 <directory>
```

### Hot-reload is slow (>5 seconds)
**Symptom**: Rebuild takes longer than expected

**Cause**: Dependencies re-downloaded on every rebuild

**Solution**:
- For Go: Ensure `go.mod` and `go.sum` are cached (don't re-download dependencies)
- For Node.js: Ensure `node_modules` is not mounted from host (use named volume or install inside container)
- Exclude unnecessary directories from watch

### Frontend HMR websocket connection fails
**Symptom**: Browser console shows websocket errors

**Cause**: Frontend dev server port not exposed or mapped correctly

**Solution**:
```dockerfile
# Expose frontend dev server port
EXPOSE 7007 3000  # Backend, Frontend dev server
```

```bash
# Map frontend dev server port
docker run -v $(pwd):/workspace -p 7007:7007 -p 3000:3000 app:dev
```

**Verify**: Check browser console for websocket connection to `ws://localhost:3000`

---

## See Also

- [Hot-Reload Pattern](../../rules/patterns/development/hot-reload.md) - Development container hot-reload strategies
- [Container Images Pattern](../../rules/patterns/delivery/container-images.md) - Production vs. development Containerfile patterns
- [Base Images Pattern](../../rules/patterns/infrastructure/base-images.md) - Base image selection for development containers
- [Docker Usage Rules](../../rules/technologies/docker.md) - General Docker best practices
- [Garden Kubernetes Orchestration](../../rules/technologies/garden.md) - Kubernetes application delivery framework
- [watchexec GitHub](https://github.com/watchexec/watchexec) - File watcher tool
- [air GitHub](https://github.com/cosmtrek/air) - Go live reload tool
