# Staccato Server

The Staccato Server is the API server component of the Staccato Toolkit,
responsible for handling API requests and orchestrating interactions between
the CLI and the underlying system.

## Module

```
src/staccato-toolkit/server
github.com/staccato-toolkit/server
```

## Requirements

- **Server entrypoint and module structure** — the `main` package initialises
  and starts the server process. The compiled binary exits without a panic.
- **Module configuration** — `go.mod` declares module path
  `github.com/staccato-toolkit/server` and a Go version compatible with the
  workspace `go.work`.

## Building

From the repo root (Go workspace):

```bash
go build ./src/staccato-toolkit/server/...
```

Or from the module directory:

```bash
cd src/staccato-toolkit/server
go build ./...
```

## Testing

```bash
go test ./src/staccato-toolkit/server/...
```

## Related

- [Staccato Core](../../core/docs/index.md) — business logic and interfaces
   consumed by the server
- [Staccato CLI](../../cli/docs/index.md) — companion CLI client
- [Platform Workloads](../../../ops/workloads/docs/index.md) — CI/CD pipeline
