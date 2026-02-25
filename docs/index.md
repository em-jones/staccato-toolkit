# Staccato Toolkit

The Staccato Toolkit is a Go monorepo providing a software delivery platform for
internal developers. It bundles a user-facing CLI, an API server, a shared domain
library, a Dagger-powered CI/CD pipeline, and a Backstage developer portal.

## Components

| Component                                                       | Description                                                    |
| --------------------------------------------------------------- | -------------------------------------------------------------- |
| [Staccato CLI](../src/staccato-toolkit/cli/docs/index.md)       | User-facing CLI — triggers workflows and manages configuration |
| [Staccato Server](../src/staccato-toolkit/server/docs/index.md) | API server — orchestrates CLI ↔ system interactions           |
| [Staccato Core](../src/staccato-toolkit/core/docs/index.md) | Core business logic, data models, and shared interfaces        |
| [Platform Workloads](../src/ops/workloads/docs/index.md)        | Dagger CI/CD pipeline module — lint, format, test, build       |

## Quick Links

- [Architecture Overview](architecture/overview.md)
- [Goals](../goals.md)

## Development Environment

The development environment is managed by [Devbox](https://www.jetify.com/devbox/).
Run `devbox shell` at the repo root to enter the configured shell with all tools
available: Go, Dagger, golangci-lint, Node.js, and Yarn.

- **Go modules**: Unified via a `go.work` workspace at the repo root
- **JavaScript/TypeScript packages**: Unified via a [Yarn 4.x workspace](../.opencode/rules/patterns/architecture/repository-layout.md) with plug'n'play mode for strict dependency isolation

## Architecture Decisions

Key architectural decisions are documented in the [ADR directory](adr/):

- [Yarn Workspace Strategy](adr/yarn-workspace-strategy.md): Why Yarn 4.x was selected as the JavaScript package manager and monorepo workspace tool, including alternatives considered and reconsideration criteria
