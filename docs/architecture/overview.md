# Staccato Toolkit — System Architecture

## Overview

The **Staccato Toolkit** is a Go monorepo that provides a software delivery platform composed of a user-facing CLI, an API server, a shared domain library, a Dagger-powered CI/CD pipeline, and a Backstage developer portal.

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Staccato Toolkit                                   │
│                        (developer-platform)                                 │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    src/staccato-toolkit/                             │   │
│  │                                                                      │   │
│  │   ┌────────────────────┐        ┌───────────────────┐                │   │
│  │   │   staccato-cli     │        │  staccato-server  │                │   │
│  │   │  (Go · service)    │        │  (Go · service)   │                │   │
│  │   │                    │        │                   │                │   │
│  │   │  User-facing CLI   │        │  API server —     │                │   │
│  │   │  triggers workflows│        │  orchestrates     │                │   │
│  │   │  & manages config  │        │  CLI ↔ system     │                │   │
│  │   └────────┬───────────┘        └────────┬──────────┘                │   │
│  │            │  dependsOn                  │  dependsOn                │   │
│  │            └──────────────┬──────────────┘                           │   │
│  │                           ▼                                          │   │
│  │              ┌─────────────────────────┐                             │   │
│  │              │    staccato-domain      │                             │   │
│  │              │   (Go · library)        │                             │   │
│  │              │                         │                             │   │
│  │              │  Core business logic,   │                             │   │
│  │              │  data models &          │                             │   │
│  │              │  interfaces             │                             │   │
│  │              └─────────────────────────┘                             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    src/ops/workloads/  (Dagger Module)               │   │
│  │                                                                      │   │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │   │
│  │   │  lint    │  │  format  │  │   test   │  │  build   │             │   │
│  │   │  task    │  │  task    │  │   task   │  │  task    │             │   │
│  │   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘             │   │
│  │        └─────────────┴─────────────┴─────────────┘                   │   │
│  │                             ▲                                        │   │
│  │                    invoked by dagger CLI                             │   │
│  └─────────────────────────────┬────────────────────────────────────────┘   │
│                                │                                            │
│  ┌─────────────────────────────▼────────────────────────────────────────┐   │
│  │              .github/workflows/ci.yml  (GitHub Actions)              │   │
│  │                                                                      │   │
│  │   push/PR → lint ──┐                                                 │   │
│  │              format─┴──► test ──► build                              │   │
│  │                                                                      │   │
│  │   Each job: dagger/dagger-for-github@v6 → dagger call <task>         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │              src/dev-portal/backstage/  (Backstage)                  │   │
│  │                                                                      │   │
│  │   Software Catalog · TechDocs · Scaffolder · Kubernetes view         │   │
│  │   Reads entities from .entities/*.yaml                               │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │              openspec/  (OpenSpec change management)                 │   │
│  │                                                                      │   │
│  │   specs/  · changes/  · schemas/v1  · config.yaml                    │   │
│  │   Drives feature/bug tracking via `td` CLI                           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Components

| Component                  | Type                | Path                           | Description                                             |
| -------------------------- | ------------------- | ------------------------------ | ------------------------------------------------------- |
| `staccato-cli`             | service (Go)        | `src/staccato-toolkit/cli/`    | User-facing CLI — triggers workflows, manages config    |
| `staccato-server`          | service (Go)        | `src/staccato-toolkit/server/` | API server — orchestrates CLI ↔ system interactions    |
| `staccato-core`            | library (Go)        | `src/staccato-toolkit/core/`   | Core business logic, data models, shared interfaces     |
| `platform` (Dagger module) | library (Go/Dagger) | `src/ops/workloads/`           | CI/CD pipeline tasks: `lint`, `format`, `test`, `build` |
| Backstage dev portal       | web app (Node/TS)   | `src/dev-portal/backstage/`    | Software catalog, TechDocs, scaffolder                  |

---

## Dependency Graph

```
staccato-cli ──► staccato-domain
staccato-server ──► staccato-domain
```

---

## CI/CD Pipeline (GitHub Actions + Dagger)

```
push / pull_request
        │
        ├─► lint   (dagger call lint --source ../..)
        ├─► format (dagger call format --source ../..)
        │
        └─► test   (needs: lint, format)
               │
               └─► build (needs: lint, test)
```

All pipeline tasks run inside Dagger containers (`golang:1.23-alpine`), invoked via `dagger/dagger-for-github@v6`.

---

## Development Environment

Managed by **Devbox** (`devbox.json`):

| Tool                     | Purpose                          |
| ------------------------ | -------------------------------- |
| `go` (latest)            | Go runtime — all toolkit modules |
| `golangci-lint` (latest) | Go linting                       |
| `dagger` (latest)        | Pipeline engine (local + CI)     |
| `nodejs-slim@24.13.0`    | Backstage dev portal runtime     |
| `bun` (latest)           | JS tooling / package management  |

Go modules are unified via a **`go.work`** workspace at the repo root:

```
go.work
├── src/ops/workloads
├── src/staccato-toolkit/cli
├── src/staccato-toolkit/core
└── src/staccato-toolkit/server
```

---

## Specification & Change Management

The **OpenSpec** framework (`openspec/`) governs all planned changes:

- **`specs/`** — feature specifications linked to `td` issues
- **`changes/`** — active and archived change sets
- **`schemas/v1`** — schema definitions
- **`config.yaml`** — domain context and enforcement rules

Agent work (design → implementation → verify → archive) is coordinated through the `td` CLI and the skills in `.opencode/skills/`.

---

## Software Catalog (Backstage)

Curated entities live in `.entities/`:

| File                             | Kind      | Description           |
| -------------------------------- | --------- | --------------------- |
| `component-staccato-cli.yaml`    | Component | CLI service           |
| `component-staccato-server.yaml` | Component | API server service    |
| `component-staccato-domain.yaml` | Component | Domain library        |
| `component-platform.yaml`        | Component | Dagger CI/CD module   |
| `resource-dagger.yaml`           | Resource  | Dagger engine utility |
| `resource-go.yaml`               | Resource  | Go runtime utility    |
| `resource-bun.yaml`              | Resource  | Bun JS tooling        |
| `resource-nodejs-slim.yaml`      | Resource  | Node.js runtime       |
