---
td-board: backstage-opentelemetry-setup
td-issue: td-42d906
status: accepted
date: 2026-02-27
decision-makers: [platform-architect]
consulted: []
informed: []
component: packages/backend

tech-radar:
  - name: "@opentelemetry/sdk-node"
    quadrant: Frameworks/Libraries
    ring: Adopt
    description: Node.js OpenTelemetry SDK — already adopted for Go services; extending to Backstage Node.js backend
    moved: 0
  - name: "@opentelemetry/exporter-prometheus"
    quadrant: Frameworks/Libraries
    ring: Adopt
    description: Prometheus metric exporter for OTel Node SDK; aligns with existing Prometheus stack
    moved: 1
  - name: "@opentelemetry/exporter-trace-otlp-http"
    quadrant: Frameworks/Libraries
    ring: Adopt
    description: OTLP/HTTP trace exporter; routes Backstage traces to Jaeger via the OTLP protocol
    moved: 1
  - name: "@opentelemetry/auto-instrumentations-node"
    quadrant: Frameworks/Libraries
    ring: Adopt
    description: Auto-instrumentation for Node.js (Express, HTTP, etc.); zero-code span generation for Backstage backend
    moved: 1
---

# Design: Backstage OpenTelemetry Setup

## Context and problem statement

Backstage already instruments its components with OpenTelemetry API calls (traces and metrics), but the backend package has no SDK configured to collect, process, and export that telemetry. Without an SDK initialised before any module is loaded, all instrumentation is silently dropped — leaving the platform blind to Backstage's internal performance signals (catalog processing, scaffolder runs, backend task durations).

## Decision criteria

This design achieves:

- **Observability parity with Go services** (50%): Backstage backend traces visible in Jaeger and metrics scrapeable by Prometheus, matching what Go services already provide
- **Zero code-change to Backstage plugins** (30%): the SDK is bootstrapped via `--require`, requiring no modification to plugin or catalog code
- **Production-safe deployment** (20%): the Docker image correctly includes and preloads the instrumentation file

Explicitly excludes:

- Custom trace sampling configuration (use OTel env vars post-deployment)
- Backstage frontend instrumentation (browser-side OTel is a separate concern)
- Alerting rule configuration (handled by existing Grafana alerting change)

## Considered options

### Option 1: Inline SDK init in `packages/backend/src/index.ts`

Import and call `sdk.start()` at the top of the backend entry point. Simple, but unreliable: TypeScript compilation and module bundling may reorder imports, breaking the "SDK before everything else" invariant.

### Option 2: Separate `instrumentation.js` + `--require` flag (chosen)

Use a plain CommonJS file loaded via `--require` before the Node process evaluates any other module. This is the official Backstage tutorial approach and the OTel Node.js SDK recommended pattern — it guarantees SDK initialisation order regardless of bundling.

### Option 3: OpenTelemetry Operator / auto-injection

Kubernetes-side injection of the OTel SDK via the OTel Operator. Avoids touching the Backstage codebase entirely but adds cluster-level dependency and complicates local development. Deferred to a future change.

## Decision outcome

**Option 2** — `instrumentation.js` with `--require` — is chosen because it:
- Follows the official Backstage documentation exactly
- Is portable (local dev and Docker)
- Requires no bundler or TypeScript changes
- Is idiomatic for Node.js OTel SDK bootstrapping

The `isMainThread` guard prevents double-initialisation in Backstage's worker-thread model.

## Risks / trade-offs

- Risk: `@opentelemetry/auto-instrumentations-node` instruments many libraries by default, adding overhead → Mitigation: tune `getNodeAutoInstrumentations()` options post-deployment to disable unused instrumentors
- Risk: Histogram bucket mismatch between SDK defaults (ms) and catalog metrics (seconds) causes misleading dashboards → Mitigation: explicit View configured for `catalog.*` instruments with second-resolution buckets
- Trade-off: Prometheus scrape endpoint (`localhost:9464/metrics`) is unauthenticated — acceptable for cluster-internal traffic; expose via ServiceMonitor only within the cluster namespace

## Migration plan

1. Install packages (`yarn --cwd packages/backend add ...`)
2. Create `packages/backend/src/instrumentation.js`
3. Update `packages/backend/package.json` start script
4. Update `.dockerignore` to allowlist `instrumentation.js`
5. Update `Dockerfile` to copy and `--require` the file
6. Deploy; verify metrics at `:9464/metrics` and traces in Jaeger

Rollback: remove the `--require` flag from start script / Dockerfile CMD and redeploy. No data model or API changes — rollback is instant.

## Confirmation

- Metrics endpoint `http://localhost:9464/metrics` returns `catalog_entities_count` and other catalog metrics after backend start
- Jaeger UI shows spans from `backstage` service after performing catalog operations
- `yarn start` in `packages/backend` succeeds without errors related to OTel modules
- Docker image build succeeds and `instrumentation.js` is present in the working directory

## Open questions

- Should we scope down `getNodeAutoInstrumentations()` to specific libraries (HTTP, Express) to reduce overhead? → Decision deferred to post-deployment tuning

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| OpenTelemetry Node SDK | platform-architect | `.opencode/rules/patterns/delivery/observability.md` | reviewed |
| Prometheus exporter | platform-architect | `.opencode/rules/patterns/delivery/observability.md` | reviewed |
| OTLP/HTTP trace exporter | platform-architect | `.opencode/rules/patterns/delivery/observability.md` | reviewed |
| Auto-instrumentation (Node.js) | platform-architect | `.opencode/rules/patterns/delivery/observability.md` | reviewed |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Backstage OTel bootstrap pattern | worker | — | none | Implementation follows official Backstage tutorial; no new agent skill required |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | No new curated catalog entities introduced by this change |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| n/a | — | — |
