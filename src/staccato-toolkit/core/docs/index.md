# Staccato Domain

The Staccato Domain is the shared library containing the core business logic, data models, and
interfaces that define the behaviour of the Staccato Toolkit. Both the CLI and the Server depend on
this module.

## Design philosophy

### Own **Nothing**, Coordinate **Everything**

    `Staccato Toolkit` (`ST`), should be used a an entrypoint to more complex
    behaviors/operations. It should accomplish this by integrating with
    best-in-class platform specification, orchestration, and operations tools

    While an oversimplification, think of `ST` a tool that coordinates the use of:

    - platform tools (capability providing and platform maintenance)
      - `kubernetes`
      - cloud service providers
      - `security` tooling
    - development tools (capability consumption, application development and delivery)
      - quality tooling
      - application configuration
      - `observability` tooling
      - `ci/cd` tooling

    The result is that, for the most part, `ST` helps developers manage the tools
    that they use.

    Virtually everything `ST` will do can be simplified as:
    - managing kubevela configurations and interactions with the cluster
    - managing devbox configurations and interactions with the local environment
    - applying backstage templates and managing interactions with the backstage software catalog

### **Progressive** tooling

    The Staccato toolkit is designed to be a **progressive** toolkit - ux is
    only ever as
    complex as it needs to be

    - Use personas to show/hide features
    - Hide commands that depend on unimplemented features
    - deep-link to source code, documentation, runbooks, and 3rd-party services

## Module

```
src/staccato-toolkit/core
github.com/staccato-toolkit/core
```

## Requirements

- **Core package and module structure** — exposes a `core` package containing core business logic,
  data models, and interfaces. The package compiles cleanly and is importable by other workspace
  modules via `github.com/staccato-toolkit/core`.
- **Module configuration** — `go.mod` declares module path `github.com/staccato-toolkit/core` and a
  Go version compatible with the workspace `go.work`.

## Building

From the repo root (Go workspace):

```bash
go build ./src/staccato-toolkit/core/...
```

Or from the module directory:

```bash
cd src/staccato-toolkit/core
go build ./...
```

## Testing

```bash
go test ./src/staccato-toolkit/core/...
```

## Consumers

- [Staccato CLI](../../cli/docs/index.md) — imports domain types and interfaces
- [Staccato Server](../../server/docs/index.md) — imports domain types and interfaces
