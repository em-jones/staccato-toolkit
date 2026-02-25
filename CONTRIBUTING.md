# Contributing

This document covers everything needed to contribute to this repository — from first-time setup to the daily development inner loop.

## Prerequisites

| Tool | Purpose | Install |
|------|---------|---------|
| [devbox](https://www.jetpack.io/devbox/) | Reproducible shell with all dev tools | `curl -fsSL https://get.jetpack.io/devbox \| bash` |
| Docker | Container runtime for kind | [docker.com/get-started](https://docs.docker.com/get-started/get-docker/) |
| Git | Source control | System package manager |

All other tools (Go, Node.js, `kind`, `kubectl`, `helm`, `garden`, `task`, `k9s`, `dagger`) are provided by devbox — do not install them globally.

## Quick Start

```bash
# 1. Enter the reproducible shell (installs all tools on first run)
devbox shell

# 2. Boot the cluster and observability stack (one-time per cluster lifecycle)
task dev-up

# 3. Deploy all services with hot-reload sync active
garden deploy --sync

# Open http://localhost:3000   for Backstage
# Open http://localhost:8080   for staccato-server
# Open http://localhost:3001   for Grafana (admin / prom-operator)
```

To tear down:

```bash
# CTRL+C stops the sync session; services keep running in the cluster
garden cleanup   # remove all Garden-managed resources from the cluster
task dev-down    # delete the kind cluster entirely
```

---

## Repository Structure

```
.
├── src/
│   ├── staccato-toolkit/
│   │   ├── cli/       # Go CLI service
│   │   ├── server/    # Go HTTP server
│   │   └── domain/    # Shared Go domain packages
│   ├── dev-portal/
│   │   └── backstage/ # Backstage developer portal (TypeScript/Node.js)
│   └── ops/
│       ├── dev/       # Kind cluster config, manifests, OTel Collector
│       ├── observability/ # Helm values for Prometheus, Loki, Tempo, Grafana
│       └── workloads/ # Dagger CI/CD pipeline modules
├── openspec/          # Architecture change records and specs
├── docs/              # ADRs, tech radar, architecture docs
├── .opencode/         # AI agent skills, usage rules, patterns
├── project.garden.yml # Garden project config (environments, providers)
├── Taskfile.yaml      # Task runner (task dev-up, dev-down, etc.)
├── devbox.json        # Reproducible dev shell package list
└── go.work            # Go workspace (server, cli, domain, workloads)
```

Service-level Garden configs live alongside each service:

```
src/staccato-toolkit/server/garden.yml   # Build + Deploy actions for server
src/staccato-toolkit/cli/garden.yml      # Build + Run actions for CLI
src/dev-portal/backstage/garden.yml      # Build + Deploy actions for Backstage
```

---

## Dev Environment Overview

The dev environment runs on a local [kind](https://kind.sigs.k8s.io/) Kubernetes cluster (`staccato-dev`) and is orchestrated by [Garden](https://garden.io/). The full stack includes:

```
┌─────────────────────────────────────────────────────────────┐
│  kind cluster: staccato-dev                                  │
│                                                              │
│  namespace: monitoring  (task dev-up, not Garden-managed)   │
│  ├─ kube-prometheus-stack  (Prometheus + Grafana + AM)       │
│  ├─ loki                   (log aggregation)                 │
│  ├─ tempo                  (distributed tracing)             │
│  └─ otel-collector         (OTLP receiver DaemonSet)         │
│                                                              │
│  namespace: staccato  (Garden-managed)                       │
│  ├─ staccato-server        (Go HTTP API, port 8080)          │
│  ├─ staccato-cli           (Go CLI, runs as Job)             │
│  └─ backstage              (dev portal, ports 3000 / 7007)   │
└─────────────────────────────────────────────────────────────┘
```

Port-forward map (managed by Garden):

| Service | Local port | URL |
|---------|-----------|-----|
| staccato-server | 8080 | http://localhost:8080 |
| Backstage frontend | 3000 | http://localhost:3000 |
| Backstage backend | 7007 | http://localhost:7007 |
| Grafana | 3001 | http://localhost:3001 (admin / prom-operator) |

---

## Hot-Reload Workflows

### Go services (staccato-server)

**Realistic change-to-running time: 3–8 seconds** (incremental Go build).

When `garden deploy --sync` is active:

1. Garden's Mutagen sync session watches `src/staccato-toolkit/server/` and `src/staccato-toolkit/domain/` on the host
2. On a `.go` file change, the delta is synced into the running pod in ~100–500ms
3. `watchexec` inside the container detects the change and runs `go build` (in-container, ~2–6s incremental)
4. The process restarts automatically; no pod replacement occurs

> The dev images (`Containerfile.dev`) include both the Go toolchain and `watchexec`. This is intentional — Garden's sync mode writes source files into the container and relies on the container's own rebuild tooling. See [Appendix A.4](#a4-dev-image-strategy) for details.

### Backstage (dev portal)

**Realistic change-to-browser time: 1.5–4 seconds.**

1. Garden's Mutagen sync session watches `src/dev-portal/backstage/packages/` and `src/dev-portal/backstage/plugins/`
2. On a `.ts` or `.tsx` change, the file is synced into the running pod in ~100–500ms
3. `yarn serve` inside the container uses Webpack's file watcher — HMR is triggered automatically; the browser reflects the change without a page reload
4. Changes to `package.json` or `yarn.lock` trigger a full image rebuild (Garden detects this as a version change) — this is slow (~2–3 min) and is expected to be infrequent

> `node_modules` inside the container must **not** be overwritten by sync. Garden's sync config explicitly excludes `node_modules` from all sync paths. The container's `node_modules` are installed during the Docker build and are correct for the Linux container architecture.

### Infrastructure changes (manifests, Helm values)

Garden watches manifest files referenced in each Deploy action's `spec.manifestFiles`. Changes trigger `kubectl apply` automatically. Helm-managed resources (observability stack) are outside Garden's scope and are updated manually with `helm upgrade` or `task dev-up`.

---

## Garden Environments

Garden supports multiple environments from the same config. The `local` environment targets the kind cluster. Additional environments (e.g., `ci`, `staging`) can be added to `project.garden.yml` by extending the `environments` and `providers` arrays.

```bash
# Local dev (default)
garden deploy --sync

# Explicit environment
garden deploy --env local --sync

# CI (no sync, just build + deploy)
garden deploy --env ci

# Run all tests (results are cached by version hash)
garden test

# Run tests for a specific service
garden test staccato-server
```

---

## Garden Action Graph

Garden models the stack as a dependency graph of typed actions:

```
build.staccato-server-image ──► deploy.staccato-server
build.staccato-cli-image    ──► run.staccato-cli-health
build.backstage-image       ──► deploy.backstage
```

Running `garden deploy` resolves this graph and runs only what has changed since the last run. A change to `src/staccato-toolkit/domain/` invalidates `build.staccato-server-image` and consequently `deploy.staccato-server`, but does not affect `backstage`.

---

## Working with the Cluster

### Inspecting services

```bash
# k9s — recommended for cluster-wide resource inspection
k9s --context kind-staccato-dev

# kubectl — raw resource queries
kubectl get pods -A --context kind-staccato-dev

# Garden status — shows the state of all Garden-managed actions
garden get status
```

### Accessing observability

```bash
# Grafana (dashboards for metrics, logs, traces)
kubectl port-forward svc/kube-prometheus-stack-grafana 3001:80 \
  -n monitoring --context kind-staccato-dev
open http://localhost:3001   # admin / prom-operator

# Prometheus (raw metrics, target status)
kubectl port-forward svc/kube-prometheus-stack-prometheus 9090:9090 \
  -n monitoring --context kind-staccato-dev
open http://localhost:9090/targets
```

### Triggering test requests

```bash
# Health check
curl http://localhost:8080/healthz

# API status (generates an OTel span — visible in Grafana → Tempo)
curl http://localhost:8080/api/v1/status

# View structured logs
kubectl logs -n staccato -l app=staccato-server --follow \
  --context kind-staccato-dev
```

---

## Task Reference

Tasks are defined in `Taskfile.yaml` and run via `task <name>`.

| Task | Description |
|------|-------------|
| `task dev-up` | Create kind cluster + deploy full observability + application stack |
| `task dev-down` | Delete the kind cluster |
| `task dev-status` | Show all pod statuses |
| `task dev-grafana` | Port-forward Grafana to localhost:3000 (use without Garden active) |
| `task dev-server` | Port-forward staccato-server to localhost:8080 (use without Garden active) |

> When `garden deploy --sync` is running, port-forwards for application services are managed by Garden. The `task dev-grafana` and `task dev-server` tasks are for manual use when Garden is not active.

---

## CI / Build Pipeline

The CI pipeline uses [Dagger](https://dagger.io/) (defined in `src/ops/workloads/`). All CI steps run in containers and are reproducible locally:

```bash
# Run the full pipeline locally
cd src/ops/workloads
dagger call pipeline
```

Garden's `garden test` command runs the same test actions defined in each service's `garden.yml`, with caching — tests are skipped if the service version hasn't changed since the last successful run. This complements Dagger (which handles CI orchestration and image publishing) without replacing it.

Linting, formatting, and tests run per language:

| Language | Linting | Formatting | Testing |
|---------|---------|------------|---------|
| Go | `golangci-lint` | `gofmt` | `go test ./...` |
| TypeScript | `eslint` | `prettier` | `jest` / `playwright` |
| Shell | `shellcheck` | `shfmt` | `bats-core` |

---

## Architecture Decisions

Significant technical decisions are recorded as ADRs in `docs/adr/`. Technology adoptions and positions are tracked in `docs/tech-radar.json` and visualized in the Backstage Tech Radar plugin.

---

## Appendix A: Dev Environment Design

> This appendix documents the design rationale and architecture for the hot-reloading Kubernetes dev environment. It is the reference for contributors implementing or modifying the dev setup.

### A.1 Problem Statement

The existing `task dev-up` workflow provisions the kind cluster and deploys the full stack once. Subsequent code changes require a manual `docker build → kind load → kubectl apply` sequence that takes 15–60 seconds per change. This degrades the development inner loop across all services, and the problem compounds as the number of services grows.

**Goals:**

1. Sub-10-second change-to-running feedback for Go services
2. Sub-5-second change-to-browser feedback for Backstage
3. All services on a single orchestrated hot-reload session that scales as services are added
4. Consistent across local dev and CI — the same action definitions run in both contexts
5. Content-hash caching: unchanged services are not rebuilt or redeployed
6. No new cluster-side components for dev tooling

### A.2 Tool Selection

#### Primary: Garden (Trial)

[Garden](https://garden.io/) (Cedar, 0.14) is selected as the dev orchestrator. Key reasons:

**Action graph with content-hash caching.** Garden computes a version hash over every action's inputs. If `src/staccato-toolkit/domain/` hasn't changed, `build.staccato-server-image` produces the same hash as last time and is skipped — even on a fresh session. This is the primary reason Garden is preferred over Tilt for a platform expected to grow to many services: the cost of a full `garden deploy` stays proportional to what actually changed, not to the total number of services.

**CI portability.** `garden test --env ci` runs the same action graph as `garden test` locally. Test results are cached by version hash — if a service's inputs haven't changed since the last successful test run, Garden skips re-running its tests. This gives meaningful feedback acceleration in CI as the service count grows.

**Multi-environment config.** `project.garden.yml` declares `local`, `ci`, and future environments. The same service action configs are reused across all environments, with only the provider (kind vs. remote cluster) changing. There is no separate CI config to maintain.

**Mutagen sync.** Garden bundles its own Mutagen binary — no separate installation. Mutagen provides near-realtime delta sync between host source files and the running container via the Kubernetes exec API. Combined with in-container rebuild tooling (`watchexec` + Go toolchain), this enables hot-reload without a full image rebuild cycle.

**Governance and license.** Garden is MPL-2.0 licensed (file-scoped copyleft — usable in proprietary projects). It is commercially maintained by Garden.io with active releases (0.14.19, Feb 2026). This is a medium-risk profile: an active commercial incentive to maintain the tool, with a license that permits forking if the company's direction changes.

#### Considered and not selected at this stage

| Tool | Why not selected |
|------|-----------------|
| **Tilt** | Does not cache across sessions — every `tilt up` rebuilds and redeploys everything. This is acceptable at 2–3 services but becomes the bottleneck as service count grows. No native CI/test integration. Valid for small-scale single-developer workflows; revisit if Garden's configuration overhead proves excessive. |
| **Skaffold** | File-sync requires `tar` in the container — incompatible with distroless production images. Full rebuild loop (15–60s) is only avoided by engineering the same host-compile + binary-sync pattern that other tools provide more naturally. CI/CD parity advantage nullified by Dagger. Move to Hold on Tech Radar. |
| **Telepresence** | Surgical per-service integration-debug tool, not a day-to-day orchestrator. CNCF Incubating. Evaluate separately for cases where native debugger access to live cluster traffic is needed. |

### A.3 Architecture

```
Developer workstation
│
├─ devbox shell
│   ├─ garden        ← resolves action graph, manages Mutagen sync, port-forwards
│   └─ kubectl/helm  ← used by Garden for apply/upgrade
│
└─ kind cluster: staccato-dev
    │
    ├─ namespace: monitoring  (task dev-up, not Garden-managed)
    │   ├─ kube-prometheus-stack
    │   ├─ loki
    │   ├─ tempo
    │   └─ otel-collector (DaemonSet)
    │
    └─ namespace: staccato  (Garden-managed)
        ├─ staccato-server pod
        │   ├─ source synced by Mutagen on .go change (~100–500ms)
        │   └─ watchexec in-container: go build + restart (~2–6s incremental)
        ├─ staccato-cli (Job, not a sync target)
        └─ backstage pod
            ├─ source synced by Mutagen on .ts/.tsx change (~100–500ms)
            └─ yarn serve (webpack HMR): ~1–3s to browser
```

**Lifecycle split:**

- `task dev-up` provisions the kind cluster and deploys the observability stack (one-time, slow, not owned by Garden).
- `garden deploy --sync` deploys and syncs all Garden-managed application resources.
- `garden cleanup` removes Garden-managed resources from the cluster without deleting the cluster or the observability stack.
- `task dev-down` deletes the entire cluster.

### A.4 Dev Image Strategy

Two image tiers exist per service:

| Tier | File | Contents | Used by |
|------|------|---------|---------|
| Dev | `Containerfile.dev` | Base runtime + Go/Node.js toolchain + `watchexec` | Garden sync mode, standalone `docker run` |
| Prod | `Containerfile.prod` | Distroless/static, non-root, minimal | CI/CD, staging, production |

**Dev image requirements for Garden sync mode:**

Garden's Mutagen sync writes source files into the running container at runtime. The container therefore needs:

1. A writable filesystem at the sync target paths — `readOnlyRootFilesystem: false` in the dev manifest (patched via `patchResources` in the Deploy action; the prod manifest retains `true`)
2. The compiler toolchain (`go build`, `yarn`) for in-container rebuild
3. `watchexec` to detect file changes inside the container and trigger the rebuild command
4. A shell (`/bin/sh`) for `watchexec`'s command string

**Why in-container compilation:**

Garden's Mutagen sync is optimized for delta-syncing small source files, not large compiled binaries. Syncing a ~10MB Go binary on every change is slower than syncing a few-KB `.go` source file and rebuilding in-container. For this stack, in-container compilation is the correct default.

If build times become a bottleneck (e.g., a large service with heavy dependencies), switch to the host-compile + binary-sync pattern described in [A.6](#a6-advanced-pattern-host-compile--binary-sync).

**Prod image constraints (unchanged):**

- Distroless base (`gcr.io/distroless/static` or `cgr.dev/chainguard/static`)
- Non-root user, read-only root filesystem, no shell
- These constraints are intentionally incompatible with Garden sync mode — sync only applies to dev images

### A.5 Garden Config Structure

#### Project-level: `project.garden.yml`

```yaml
apiVersion: garden.io/v0
kind: Project
name: staccato

defaultEnvironment: local

environments:
  - name: local
    defaultNamespace: staccato
  - name: ci
    defaultNamespace: staccato

providers:
  - name: local-kubernetes
    environments: [local]
    context: kind-staccato-dev

  - name: kubernetes
    environments: [ci]
    context: ${env.CI_KUBE_CONTEXT}

scan:
  exclude:
    - node_modules/**/*
    - .git/**/*
    - build/**/*
    - .devbox/**/*
    - .todos/**/*
    - .garden/**/*
```

#### Go server: `src/staccato-toolkit/server/garden.yml`

```yaml
apiVersion: garden.io/v0
kind: Build
type: container
name: staccato-server-image

# source.path is the repo root so go.work is in the build context
source:
  path: ../../..

include:
  - src/staccato-toolkit/server/**/*
  - src/staccato-toolkit/domain/**/*
  - go.work
  - go.work.sum

spec:
  dockerfile: src/staccato-toolkit/server/Containerfile.dev

---

apiVersion: garden.io/v0
kind: Deploy
type: kubernetes
name: staccato-server

dependencies:
  - build.staccato-server-image

source:
  path: ../../..

spec:
  namespace: staccato

  manifestFiles:
    - src/ops/dev/manifests/staccato-server/deployment.yaml
    - src/ops/dev/manifests/staccato-server/service.yaml
    - src/ops/dev/manifests/staccato-server/service-monitor.yaml

  # Inject Garden's built image tag; relax security context for dev sync
  patchResources:
    - name: staccato-server
      kind: Deployment
      patch:
        spec:
          template:
            spec:
              containers:
                - name: staccato-server
                  image: ${actions.build.staccato-server-image.outputs.deploymentImageId}
                  imagePullPolicy: IfNotPresent
                  securityContext:
                    readOnlyRootFilesystem: false  # required for Mutagen sync

  defaultTarget:
    kind: Deployment
    name: staccato-server
    containerName: staccato-server

  sync:
    paths:
      - sourcePath: src/staccato-toolkit/server
        containerPath: /workspace
        mode: one-way-replica
        defaultOwner: 1000
        exclude:
          - staccato-server       # don't overwrite the compiled binary
          - "**/*_test.go"
      - sourcePath: src/staccato-toolkit/domain
        containerPath: /workspace/domain
        mode: one-way-replica
        defaultOwner: 1000
    overrides:
      - command:
          - watchexec
          - -r
          - --exts
          - go,mod,sum
          - --
          - sh
          - -c
          - "go build -o /workspace/staccato-server . && /workspace/staccato-server"

  portForwards:
    - name: http
      resource: Service/staccato-server
      targetPort: 8080
      localPort: 8080
```

#### Backstage: `src/dev-portal/backstage/garden.yml`

```yaml
apiVersion: garden.io/v0
kind: Build
type: container
name: backstage-image

include:
  - package.json
  - yarn.lock
  - .yarnrc.yml
  - .yarn/**/*
  - packages/**/*
  - plugins/**/*
  - tsconfig.json
  - app-config.yaml
  - app-config.local.yaml
exclude:
  - node_modules/**/*
  - packages/**/node_modules/**/*
  - packages/**/dist/**/*

spec:
  dockerfile: Containerfile.dev

---

apiVersion: garden.io/v0
kind: Deploy
type: kubernetes
name: backstage

dependencies:
  - build.backstage-image

spec:
  namespace: staccato

  manifests:
    - apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: backstage
        namespace: staccato
      spec:
        replicas: 1
        selector:
          matchLabels:
            app: backstage
        template:
          metadata:
            labels:
              app: backstage
          spec:
            containers:
              - name: backstage
                image: ${actions.build.backstage-image.outputs.deploymentImageId}
                imagePullPolicy: IfNotPresent
                command: ["yarn", "serve"]
                ports:
                  - containerPort: 7007
                    name: backend
                  - containerPort: 3000
                    name: frontend
                resources:
                  limits:
                    memory: "1Gi"
                    cpu: "500m"
                  requests:
                    memory: "512Mi"
                    cpu: "200m"
    - apiVersion: v1
      kind: Service
      metadata:
        name: backstage
        namespace: staccato
      spec:
        selector:
          app: backstage
        ports:
          - name: backend
            port: 7007
            targetPort: 7007
          - name: frontend
            port: 3000
            targetPort: 3000

  defaultTarget:
    kind: Deployment
    name: backstage
    containerName: backstage

  sync:
    paths:
      # Sync source — webpack HMR picks up changes automatically
      - sourcePath: packages
        containerPath: /workspace/packages
        mode: one-way-replica
        exclude:
          - "*/node_modules/**/*"
          - "*/dist/**/*"
      - sourcePath: plugins
        containerPath: /workspace/plugins
        mode: one-way-replica
        exclude:
          - "*/node_modules/**/*"
      - sourcePath: app-config.yaml
        containerPath: /workspace/app-config.yaml
        mode: one-way-replica
      - sourcePath: app-config.local.yaml
        containerPath: /workspace/app-config.local.yaml
        mode: one-way-safe

  portForwards:
    - name: frontend
      resource: Service/backstage
      targetPort: 3000
      localPort: 3000
    - name: backend
      resource: Service/backstage
      targetPort: 7007
      localPort: 7007
```

#### CLI: `src/staccato-toolkit/cli/garden.yml`

The CLI runs as a Kubernetes Job, not a long-running Deployment. Garden applies the Job manifest on demand. Sync mode does not apply to Jobs.

```yaml
apiVersion: garden.io/v0
kind: Build
type: container
name: staccato-cli-image

source:
  path: ../../..

include:
  - src/staccato-toolkit/cli/**/*
  - src/staccato-toolkit/domain/**/*
  - go.work
  - go.work.sum

spec:
  dockerfile: src/staccato-toolkit/cli/Containerfile.dev

---

apiVersion: garden.io/v0
kind: Run
type: kubernetes-pod
name: staccato-cli-health

dependencies:
  - build.staccato-cli-image

source:
  path: ../../..

spec:
  namespace: staccato
  manifestFiles:
    - src/ops/dev/manifests/staccato-cli/job.yaml
  patchResources:
    - name: staccato-cli-health-check
      kind: Job
      patch:
        spec:
          template:
            spec:
              containers:
                - name: staccato-cli
                  image: ${actions.build.staccato-cli-image.outputs.deploymentImageId}
                  imagePullPolicy: IfNotPresent
```

### A.6 Advanced Pattern: Host-Compile + Binary Sync

If in-container Go build times become a bottleneck (e.g., a large service where even incremental builds are slow), switch to the host-compile pattern:

1. Add an `exec` Run action that compiles the binary on the host:

```yaml
apiVersion: garden.io/v0
kind: Run
type: exec
name: compile-staccato-server
spec:
  command:
    - sh
    - -c
    - |
      CGO_ENABLED=0 GOOS=linux \
      go build -o src/staccato-toolkit/server/.build/staccato-server \
      ./src/staccato-toolkit/server
  env:
    GOWORK: "${project.root}/go.work"
```

2. Replace the source sync in the Deploy action with a binary sync:

```yaml
sync:
  paths:
    - sourcePath: src/staccato-toolkit/server/.build/staccato-server
      containerPath: /workspace/staccato-server
      mode: one-way-replica
  overrides:
    - command: ["/workspace/staccato-server"]
```

In this pattern, the dev image no longer needs the Go compiler — only a shell. `GOOS=linux CGO_ENABLED=0` must be set to produce a binary compatible with the Alpine container.

### A.7 go.work Workspace Considerations

The repository uses a Go workspace (`go.work`) spanning four modules:

```
./src/ops/workloads
./src/staccato-toolkit/cli
./src/staccato-toolkit/domain
./src/staccato-toolkit/server
```

`server` imports `domain`. Garden's `include` list for `build.staccato-server-image` includes both `src/staccato-toolkit/server/**/*` and `src/staccato-toolkit/domain/**/*` to ensure a change to `domain` invalidates the server's version hash and triggers a rebuild.

`source.path: ../../..` (repo root) on Build actions ensures `go.work` and `go.work.sum` are in the build context, required for `go build` inside the container to resolve workspace-relative module paths.

Sync paths mirror the module layout: `domain` sources are synced into `/workspace/domain` so `go build` inside the container can resolve the workspace `replace` directives.

### A.8 Caching Model

Garden caches at two levels:

**Build cache (across sessions):**
- Garden checks whether a Docker image with the version-hash tag exists in the local Docker daemon before building
- If it exists, the build step is skipped entirely
- Persists across `garden deploy` invocations (not just within a session)
- Invalidated when any file in the Build action's `include` set changes

**Deploy cache (across sessions):**
- Garden tracks the last-deployed version hash per action in `.garden/`
- If the version hash matches the last deployed version, `kubectl apply` is skipped
- `garden deploy` on an unchanged codebase is a no-op

**Test result cache (local):**
- `garden test` pass/fail results are cached by version hash in `.garden/`
- Tests for unchanged services are skipped on subsequent runs
- Cross-machine sharing requires Garden Cloud (commercial SaaS)

The `.garden/` directory should be in `.gitignore` and is not committed to source control.

### A.9 Technology Radar Implications

This design proposes the following radar position changes:

| Technology | Current | Proposed | Reason |
|-----------|---------|---------|--------|
| Garden | (untracked) | **Trial** | Direct adoption; cross-session caching and CI portability suit a growing multi-service platform |
| Skaffold | Trial | **Hold** | Inner-loop story weaker than Garden; CI/CD parity advantage nullified by Dagger; distroless incompatibility |
| Tilt | (untracked) | **Assess** | Valid for small-scale/single-developer workflows; no cross-session caching; revisit if Garden complexity proves excessive |
| watchexec | (untracked) | **Adopt** | Already in use in dev images; solid, no action needed |
| Telepresence | (untracked) | **Assess** | Surgical integration-debug tool; CNCF Incubating; evaluate separately |

These changes should be submitted as an OpenSpec change to `docs/tech-radar.json` before the Garden config is merged.

### A.10 Provisioning Split (task vs. garden)

The separation between `task dev-up` (cluster + observability) and `garden deploy` (application services) is intentional:

**What Garden owns:**
- `staccato-server` Deployment, Service, and ServiceMonitor
- `staccato-cli` Job
- `backstage` Deployment and Service
- Port-forwards for all application services

**What Garden does not own:**
- Kind cluster lifecycle
- Namespace creation
- Helm repos and Helm-managed observability stack
- OTel Collector DaemonSet

The observability stack changes infrequently and has a 3–5 minute cold-start time. Triggering a Garden graph evaluation should never re-evaluate Helm releases for Prometheus, Loki, or Tempo.

### A.11 Troubleshooting

**Mutagen sync not starting**

Symptom: `garden deploy --sync` completes but file changes are not reflected in the pod.

Cause: Usually `readOnlyRootFilesystem: true` was not patched, or `runAsUser: 1000` mismatch.

Fix:
```bash
garden sync status   # show active sync sessions
garden sync restart  # restart all sync sessions
# Verify the patch was applied:
kubectl get deploy staccato-server -n staccato -o yaml | grep readOnly
```

**Unexpected rebuild on unchanged source**

Symptom: Garden rebuilds an image even though nothing appears to have changed.

Cause: A file in the `include` glob changed — common culprits are IDE metadata, build artifacts, or auto-updated `go.sum`.

Fix: Add the offending path to `exclude` in the Build action. Run `garden get actions build.<name>` to inspect the computed version and the files contributing to it.

**`imagePullPolicy: Never` causing ImagePullBackOff**

Symptom: Pod enters `ImagePullBackOff` after `garden deploy`.

Cause: Garden uses its own image tag (`<name>:v-<hash>`); the existing manifest's `imagePullPolicy: Never` only works with manually-loaded images with a specific name.

Fix: Verify the `patchResources` in the Deploy action overrides both `image` and `imagePullPolicy: IfNotPresent`.

**Backstage `node_modules` wiped by sync**

Symptom: Backstage pod crashes with `Cannot find module` after sync activates.

Cause: A sync path was too broad and overwrote the container's `node_modules`.

Fix: Ensure all Backstage sync paths target specific source subdirectories and include `exclude: ["*/node_modules/**/*"]`. Never sync to `/workspace` directly.

**Stale Garden cache after cluster recreate**

Symptom: `garden deploy` reports everything up-to-date but pods are not running.

Cause: The deploy cache in `.garden/` reflects the previous cluster's state.

Fix:
```bash
rm -rf .garden/
garden deploy
```
