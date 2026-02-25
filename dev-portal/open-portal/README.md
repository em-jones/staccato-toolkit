# Plugins

<!-- TODO:
1) Create an understanding of the backstage plugin architecture
2) Review what has been created in open-portal, so far
3) Create an MVP implementation that has the following features using a plugin architecture that enables the ability to swap out different implementations:
  a) persistence - database integration (sqlite)
  b) telemetry - extensible logging, tracing, metrics tools
  c) feature flags - openfeature
  e) authentication - login/register workflow with better-auth
  f) authorization - permissions backend integration, IAM policy management UI
  g) eventing service - use to define lifecycle events, event producers and event consumers (with support of workflow engine)
  h) workflow service - use to integrate with durable workflow engine
4) Technologies to use:
  a) @tanstack/* ecosystem - using **ONLY** solid's integrations
  b) tailwind-plugin - for ui style
  c) drizzle
  e) effect
  f) valibot (never zod)
  g) nitro web server
  h) vitest

Goals: replace the backstage platform with a new ecosystem that uses best-in-class tools, using the currently configured packages.
**YOU MAY NOT REMOVE ANY CUSTOM PACKAGES**
**YOU MAY ADD NEW CUSTOM PACKAGES FOLLOWING CURRENT SEMANTICS**
**YOU MAY INSTALL NEW 3rd-party packages**

Help me finish this initial implementation. You'll be done when the web app starts up, and:
1) Dev tasks are run
  a) an openapi specification is generated for all the schemas defined for the plugin configurations
2) The telemetry services are started (server-only for now)
3) The feature flag plugins are configured and the web and server openfeature services are started
4) The eventing plugin is configured and running - default is `s2` (running through podman compose)
5) The workflow plugin is configured and running - default is `hatchet` (running through podman compose)
6) The core data stores are configured and migrations are run
  - authentication migrations - using better-auth plugin
  - authorization migrations - using duck-iam plugin
7) The Catalog plugin is configured and running, with a sample entity defined in the catalog-info.yaml file
8) All remining plugin services are configured, registered, and availalbe for server use

NOTE: The web app is a tanstack start application, using "isomorphic" javascript.
One of the goals is the use of [module].[client|server].ts file naming conventions to provide code-splitting and ensure that server-only code is not included in client bundles. By following this convention, we can maintain a clean separation between client and server code, optimize bundle sizes, and improve overall application performance.

You're done when you've completed the above tasks and the web application starts and the openportal platform is bootstrapped
-->
<!-- TODO: go through each of the @op-plugin/* and @op/plugin packages and run `vp pack` to determine if there are any missing imports/exports from their dependencies-->

## Integration Tests

Integration tests are located in each plugin's `tests/integration.test.ts` file. Every integration
test validates two things:

1. **Vite plugin pipeline** — the plugin's metadata is extracted via `resolvePluginPaths()`, and
   both the TypeScript types file and OpenAPI spec are generated successfully.
2. **Full platform bootstrap** — `init()` → `registerPlugin()` → `start()` → `stop()` lifecycle
   with the plugin registered, exercising the Awilix DI container and all lifecycle hooks.

### Shared Test Helper

All integration tests (except `db-bun`, which runs under Bun) use `createTestPlatform()` from
`@op/platform/testing`. This helper:

- Creates a temporary directory with plugin configuration
- Runs the vite plugin pipeline (metadata extraction + type/OpenAPI generation)
- Bootstraps a full OpenPort platform instance
- Returns a `TestPlatform` handle with `app`, `metadata`, `generatedTypes`, `generatedOpenAPI`,
  and a `cleanup()` method

```ts
import { createTestPlatform, type TestPlatform } from "@op/platform/testing";
import myPlugin from "../src/index.ts";
import { resolve } from "node:path";

let platform: TestPlatform;

beforeAll(async () => {
  platform = await createTestPlatform({
    plugins: [myPlugin],
    pluginPaths: [resolve(__dirname, "../src/index.ts")],
    configYaml: "server:\n  my_plugin: {}\n",
  });
}, 15_000);

afterAll(() => platform.cleanup());
```

### Vite Plugin Integration

Each plugin's `vite.config.ts` includes the `openportVite()` plugin, which runs the metadata
extraction and code generation pipeline during `vp test` and `vp build`:

```ts
import { openportVite } from "@op/platform/vite";

export default defineConfig({
  plugins: [
    openportVite({ plugins: ["./src/index.ts"] }),
  ],
  // ...
});
```

### Test Coverage

| Plugin                                  | Test File                                                      | Infrastructure                                                      |
| --------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| `@op-plugin/events-s2`                  | `plugins/events-s2/tests/integration.test.ts`                  | S2 container (testcontainers) + in-memory fallback                  |
| `@op-plugin/workflows-hatchet`          | `plugins/workflows-hatchet/tests/integration.test.ts`          | Hatchet multi-container stack (testcontainers) + in-memory fallback |
| `@op-plugin/db-bun`                     | `plugins/db-bun/tests/integration.test.ts`                     | SQLite temp file (no container) — runs under Bun                    |
| `@op-plugin/authentication-better-auth` | `plugins/authentication-better-auth/tests/integration.test.ts` | Memory adapter (no container)                                       |
| `@op-plugin/authorization-duck-iam`     | `plugins/authorization-duck-iam/tests/integration.test.ts`     | In-memory engine (no container)                                     |
| `@op-plugin/catalog`                    | `plugins/catalog/tests/integration.test.ts`                    | Temp YAML files (no container)                                      |

### Running Tests

```bash
# Run all tests for a specific plugin
cd plugins/events-s2 && vp test

# Run only integration tests
cd plugins/events-s2 && vp test tests/integration.test.ts

# Run only unit tests
cd plugins/events-s2 && vp test tests/index.test.ts

# Run db-bun tests (requires Bun runtime)
cd plugins/db-bun && bun test tests/integration.test.ts
```

### Container-Based Tests

Tests that require containers (S2, Hatchet) use `testcontainers` to spin up real infrastructure.
These tests have extended timeouts and require Docker/Podman to be available.

For local development, you can also use the pre-configured compose files:

```bash
# Start S2 + Hatchet stack (matches integration test infrastructure)
podman-compose up -d
```

## Filesystem Map

### Directory Structure

```
open-portal/
├── apps/
│   └── web/                          # TanStack Start web application (SolidJS)
│       ├── public/                   # Static assets (favicon, logos, manifest)
│       ├── src/
│       │   ├── components/           # Shared UI components
│       │   ├── integrations/         # Third-party integrations (tanstack-query)
│       │   ├── lib/                  # Utilities (auth, logger, otel, startup)
│       │   ├── routes/               # File-based routes (catalog, kubernetes, auth)
│       │   └── server/               # Server functions (auth, catalog, kubernetes)
│       ├── lighthouse.config.js      # Lighthouse CI configuration
│       ├── openport.config.yaml      # OpenPort application configuration
│       ├── package.json # Install plugins as you wish to extend it
│       ├── tsconfig.json
│       └── vite.config.ts
├── packages/                         # Shared libraries consumed by apps and plugins
│   ├── app/                          # Application logic (permissions, roles, stores)
│   ├── config/                       # Configuration loading and JSON schema validation
│   ├── core-services/                # Dependency injection hub for platform services
│   ├── db-sqlite/                    # Drizzle ORM schema for SQLite (dev database)
│   ├── features/                     # Feature flag management (OpenFeature)
│   └── o11y/                         # Observability core (logging, metrics, tracing)
├── plugins/                          # Extensible plugin packages
│   ├── auth-core/                    # Auth interfaces (user, role, permission APIs)
│   ├── authentication-better-auth/   # Better Auth implementation of auth-core
│   ├── authorization-duck-iam/       # RBAC/ABAC via @gentleduck/iam
│   ├── catalog/                      # Software catalog entity management
│   ├── core-services/                # Plugin-level core services
│   ├── core-ui/                      # Core UI plugin
│   ├── db-bun/                       # Drizzle ORM adapter for Bun SQLite
│   ├── db-d1/                        # Drizzle ORM adapter for Cloudflare D1
│   ├── db-libsql/                    # Drizzle ORM adapter for libSQL/Turso
│   ├── events-core/                  # Event system core interfaces
│   ├── gitops-argo/                  # ArgoCD GitOps integration
│   ├── gitops-core/                  # GitOps abstraction core interfaces
│   ├── gitops-flux/                  # Flux GitOps integration
│   ├── nitro-server-plugin/          # Nitro server plugin utilities
│   ├── runtime-core/                 # Runtime abstraction core interfaces
│   ├── runtime-k8s/                  # Kubernetes runtime integration
│   ├── signal-provider-clickhouse-*/ # ClickHouse signal providers (logs, metrics, traces)
│   ├── signal-provider-core-*/       # Core signal provider interfaces (logs, metrics, traces)
│   ├── signal-provider-loki/         # Loki logs signal provider
│   ├── signal-provider-mimir/        # Mimir metrics signal provider
│   ├── signal-provider-tempo/        # Tempo traces signal provider
│   ├── signals-api/                  # Signals API abstraction layer
│   ├── solid-ui/                     # SolidJS UI component library (DaisyUI-based)
│   ├── ui-plugin/                    # UI plugin wrapper
│   └── workflows-hatchet/            # Hatchet workflow engine implementation
├── scripts/                          # Utility scripts
└── catalog-info.yaml                 # Backstage catalog info for this project
```

### Path Reference Table

| Path                                          | Description                                                                         |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| `apps/web/`                                   | Main web application built with TanStack Start + SolidJS                            |
| `apps/web/src/routes/`                        | File-based routing — defines all application pages                                  |
| `apps/web/src/server/`                        | Server functions for API endpoints                                                  |
| `apps/web/src/lib/`                           | Shared utilities: auth, logger, OpenTelemetry setup                                 |
| `apps/web/src/components/`                    | Application-level shared components                                                 |
| `apps/web/src/integrations/`                  | Third-party framework integrations                                                  |
| `apps/web/public/`                            | Static public assets (icons, manifest, robots.txt)                                  |
| `apps/web/openport.config.yaml`               | OpenPort application configuration                                                  |
| `packages/app/`                               | Core application logic: permissions, roles, stores                                  |
| `packages/config/`                            | Configuration loading with JSON schema validation                                   |
| `packages/core-services/`                     | DI hub providing platform services (auth, config, catalog, features, o11y)          |
| `packages/db-sqlite/`                         | Drizzle ORM database schema for SQLite development                                  |
| `packages/features/`                          | Feature flag management via OpenFeature SDK                                         |
| `packages/o11y/`                              | Observability core: client/server logging, metrics, tracing with OpenTelemetry      |
| `plugins/auth-core/`                          | Authentication core interfaces (user, role, permission management)                  |
| `plugins/authentication-better-auth/`         | Better Auth implementation of auth-core interfaces                                  |
| `plugins/authorization-duck-iam/`             | RBAC/ABAC authorization using @gentleduck/iam                                       |
| `plugins/catalog/`                            | Software catalog entity management                                                  |
| `plugins/core-services/`                      | Plugin-level core services plugin                                                   |
| `plugins/core-ui/`                            | Core UI components plugin                                                           |
| `plugins/db-bun/`                             | Database adapter for Bun's built-in SQLite                                          |
| `plugins/db-d1/`                              | Database adapter for Cloudflare D1                                                  |
| `plugins/db-libsql/`                          | Database adapter for libSQL/Turso                                                   |
| `plugins/events-core/`                        | Event system core interfaces and types                                              |
| `plugins/gitops-argo/`                        | ArgoCD integration for GitOps workflows                                             |
| `plugins/gitops-core/`                        | GitOps abstraction layer (engine-agnostic)                                          |
| `plugins/gitops-flux/`                        | Flux CD integration for GitOps workflows                                            |
| `plugins/nitro-server-plugin/`                | Nitro server framework plugin utilities                                             |
| `plugins/runtime-core/`                       | Runtime abstraction core interfaces                                                 |
| `plugins/runtime-k8s/`                        | Kubernetes cluster runtime integration                                              |
| `plugins/signal-provider-clickhouse-logs/`    | ClickHouse-backed log signal provider                                               |
| `plugins/signal-provider-clickhouse-metrics/` | ClickHouse-backed metrics signal provider                                           |
| `plugins/signal-provider-clickhouse-traces/`  | ClickHouse-backed trace signal provider                                             |
| `plugins/signal-provider-core-logs/`          | Core log signal provider interfaces                                                 |
| `plugins/signal-provider-core-metrics/`       | Core metrics signal provider interfaces                                             |
| `plugins/signal-provider-core-traces/`        | Core trace signal provider interfaces                                               |
| `plugins/signal-provider-loki/`               | Grafana Loki log signal provider                                                    |
| `plugins/signal-provider-mimir/`              | Grafana Mimir metrics signal provider                                               |
| `plugins/signal-provider-tempo/`              | Grafana Tempo trace signal provider                                                 |
| `plugins/signals-api/`                        | Unified signals API abstraction                                                     |
| `plugins/solid-ui/`                           | SolidJS component library (buttons, tables, forms, auth UI, catalog UI, signals UI) |
| `plugins/ui-plugin/`                          | UI plugin wrapper                                                                   |
| `plugins/workflows-core/`                     | Workflow engine core interfaces and registration API                                |
| `plugins/workflows-hatchet/`                  | Hatchet workflow engine implementation                                              |
| `scripts/`                                    | Utility and automation scripts                                                      |
| `catalog-info.yaml`                           | Backstage software catalog metadata for this project                                |

## Patterns

### Definition of platform feature apis

Example - define a workflow platform api and a plugin:

```ts
// @op-plugin/workflows-core - Platform API
export type Enricher = <T>(services: IoCContainer) => { payload: T } | Promise<{ payload: T }>;
export type WorkflowContext = { payload: any; services: IoCContainer };

export interface Workflow<TTriggerSource extends string = "", TPayload = any, TResult = any> {
  source: TTriggerSource;
  handler: ({ payload: TPayload, services: IoCContainer }) => Promise<TResult>;
  provider: (ctx: WorkflowContext) => TPayload | Promise<TPayload>;
}

export interface CronWorkflow<T> extends Workflow<"cron", T> {
  schedule: CronSchedule;
}

export interface EventWorkflow<TPayload> extends Workflow<"event", TPayload> {
  event: string;
}

export type WorkflowConfig<T> = CronWorkflow | EventWorkflow<T> | CustomEvent<T>;

export interface WorkflowService {
  registerWorkflow(config: WorkflowConfig);
}
```

```ts
// @op-plugin/workflows-hatchet - Implementation
import { type ServerContext } from "@op/core";
import { serverServices, registerConfigSchema, type BackendPluginSpec } from "@op/core-services";
import hatchetApi from "@hatchet-dev/typescript-sdk";
import { string, object } from "valibot";

const MyConfigSchema = object({
  CONFIG_NAME: string(),
});

const WorkflowServiceImpl: WorkflowService = (ctx: ServerContext) => {
  // Implements integration with hatchet
  const registerWorkflow = (config: WorkflowConfig) => {}; // point of integration with hatchet
  return {
    registerWorkflow,
  };
};

const pluginSpec: BackendPluginSpec<"workflow"> = {
  schema: MyConfigSchema["~standard"], // Implemented by standard schema
  services: [], // list of services that are required by plugin - ensures dependency registration order
  path: "", // path to api (if one exists)
  service: WorkflowService,
};
```
