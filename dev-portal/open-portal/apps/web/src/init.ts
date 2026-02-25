import { init } from "@op/platform";
import {
  createServerFeatureFlagPlugin,
  createInMemoryProvider,
} from "@op/platform/features/server";

let openPort: Awaited<ReturnType<typeof init>> | undefined;

export async function runStartup(): Promise<void> {
  if (openPort) return;

  openPort = await init();

  // --- Infrastructure plugins ---

  // Nitro server plugin: registers lifecycle hooks with the Nitro runtime
  // so that `preStart`, `onInit`, and `onReady` from subsequent plugins
  // execute within the Nitro server context.
  openPort.registerPlugin(import("@op-plugin/nitro-server-plugin"));

  // Feature flags (server-side): OpenFeature provider with in-memory fallback.
  // Replace `createInMemoryProvider` with a real provider (Unleash, LaunchDarkly,
  // Flagsmith, etc.) for production.
  openPort.registerPlugin(
    Promise.resolve(createServerFeatureFlagPlugin({ provider: createInMemoryProvider({}) })),
  );

  // Eventing (S2): provides event streaming capabilities with in-memory fallback
  // for local development when S2 server is unavailable.
  openPort.registerPlugin(import("@op-plugin/events-s2"));

  // Workflow engine (Hatchet): plugins that declare workflows will have
  // them dispatched through this integration.
  openPort.registerPlugin(import("@op-plugin/workflows-hatchet"));

  // Database: registers the Drizzle ORM instance and runs SQLite migrations
  // during `preStart` so all tables exist before auth/catalog plugins init.
  openPort.registerPlugin(import("@op-plugin/db-bun"));

  // --- Auth & IAM plugins ---

  // Authentication (Better Auth): runs auth-specific migrations in `preStart`,
  // then registers the `AuthAPI` service in `onInit` for user/org CRUD.
  openPort.registerPlugin(import("@op-plugin/authentication-better-auth"));

  // Authorization (duck-iam): registers `RoleAPI`, `PolicyAPI`, and
  // `AuthorizationService` in `onInit`. Uses the duck-iam engine for
  // RBAC+ABAC evaluation.
  openPort.registerPlugin(import("@op-plugin/authorization-duck-iam"));

  // --- Domain plugins ---

  // Catalog: manages software catalog entities and relations.
  // Runs catalog schema migrations in `preStart`.
  openPort.registerPlugin(import("@op-plugin/catalog/server"));

  await openPort.start();
}

/**
 * Graceful shutdown — call from SIGTERM / Nitro shutdown hook.
 */
export async function runShutdown(): Promise<void> {
  if (!openPort) return;
  await openPort.stop();
  openPort = undefined;
}
