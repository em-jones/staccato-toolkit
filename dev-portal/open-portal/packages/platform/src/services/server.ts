import { trace } from "@opentelemetry/api";
import {
  type AwilixContainer,
  asFunction,
  asValue,
  createContainer,
  type ResolveOptions,
} from "awilix";
import type { ConfigService } from "../config/types.ts";
import type { FeatureService, Validators } from "../features/types.ts";
import { MeterBuilder, PinoLogger } from "../o11y/index.server.ts";
import type { MeterBuilder as IMeterBuilder, Logger } from "../o11y/types.ts";
import type { Plugin } from "../plugins/types.ts";
import type { ServiceContainer } from "./types.ts";

/**
 * Map of well-known service names to their types.
 * Extend this interface to add custom strongly-typed services.
 */
export type ServiceRegistry = {
  rootLogger: Logger;
  logger: Logger;
  meterBuilder: IMeterBuilder;
  featureService: FeatureService<Validators>;
  configService: ConfigService;
} & Record<string, unknown>; // Allow arbitrary additional services via declaration merging

/**
 * Type-safe key type for service names.
 */
export type ServiceName = keyof ServiceRegistry;

/**
 * Type-safe retrieval: returns the exact type for the given service name.
 */
export type ServiceType<N extends ServiceName> = ServiceRegistry[N];

/**
 * Inversion of Control container for server services.
 *
 * Initialized with telemetry services (logging, metrics, tracing) and
 * provides APIs for configuring/overriding those services as well as
 * standard service registry and retrieval.
 *
 * Services retrieved by name are strongly typed via the `ServiceRegistry` map.
 * Backed by Awilix DI container for robust dependency management.
 *
 * ## Extending with custom services
 *
 * Use TypeScript module augmentation to add custom service types. The
 * `ServiceRegistry` interface is open for declaration merging, and the
 * `register` / `get` methods automatically pick up augmented members:
 *
 * ```ts
 * // my-module.ts
 * import type { ServiceRegistry } from "@op/platform/services";
 *
 * declare module "@op/platform/services" {
 *   interface ServiceRegistry {
 *     myService: MyService;
 *     database: Database;
 *   }
 * }
 *
 * // Usage — fully inferred, no casts needed:
 * services.register("myService", new MyService());
 * const db: Database = services.get("database");
 * ```
 */
const container = createContainer({ strict: true });
container.register({
  tracer: asValue(trace.getTracer("default")),
  rootLogger: asFunction(() => new PinoLogger({ name: "platform" } as Plugin)).singleton(),
});

/**
 * Register a value into the root (shared) Awilix container.
 *
 * Used by `init()` to register services that must be available before any
 * plugin scope is created — primarily `configService`, which is constructed
 * after config files are loaded and must be a singleton accessible to all
 * plugin scopes.
 *
 * **Idempotent**: if the service is already registered, the old registration
 * is replaced. This allows `init()` to be called multiple times in tests
 * without throwing.
 */
export function registerRootService<N extends ServiceName>(name: N, value: ServiceType<N>): void {
  // Awilix allows re-registration by overwriting the existing registration.
  // For safety, we delete the old entry first.
  if (container.hasRegistration(name)) {
    delete (container as any).registrations[name];
  }
  container.register({ [name]: asValue(value) });
}

/**
 * Resolve a service directly from the root container.
 * Used by `init()` to access `rootLogger` before any plugin scope exists.
 */
export function resolveRootService<N extends ServiceName>(name: N): ServiceType<N> {
  return container.resolve<ServiceType<N>>(name);
}

/**
 * Reset the root container to its initial state (tracer + rootLogger only).
 *
 * **WARNING**: This invalidates all scoped containers and any services
 * registered by plugins. Only use in test teardown — never in production.
 */
export function resetRootContainer(): void {
  // Awilix doesn't expose an unregister method. We delete registrations
  // directly from the internal map, keeping only the root services.
  const regs = (container as any).registrations;
  for (const name of Object.keys(regs)) {
    if (name !== "tracer" && name !== "rootLogger") {
      delete regs[name];
    }
  }
  // Also clear the resolution cache so stale resolved values are purged
  if ((container as any).cache) {
    (container as any).cache.clear();
  }
}

/**
 * Resolve the parsed, validated config for a plugin from the ConfigService.
 *
 * - If ConfigService is not yet available (e.g. during early bootstrap),
 *   returns `undefined` — the factory must handle missing config gracefully.
 * - If the plugin has no registered schema, returns `undefined`.
 * - If config validation fails, **throws** — errors must never be swallowed
 *   so that misconfiguration surfaces at startup, not at runtime.
 */
function resolvePluginConfig(container: AwilixContainer, plugin: Plugin): unknown {
  let configService: ConfigService;
  try {
    configService = container.resolve<ConfigService>("configService");
  } catch {
    // ConfigService not registered yet — factory receives undefined.
    return undefined;
  }

  const key = plugin.configKey ?? plugin.name;
  return configService.read(key);
}

export class ServerServices<
  T extends ServiceRegistry = ServiceRegistry,
  TResolveOpts extends ResolveOptions = ResolveOptions,
> implements ServiceContainer<T, keyof T, TResolveOpts> {
  constructor(
    private container: AwilixContainer<T>,
    plugin: Plugin,
  ) {
    // Use transient (not singleton) for per-plugin services so they can be
    // registered on scoped containers. Singletons in Awilix can only live on
    // the root container — registering them on a scope throws in strict mode.
    container.register({
      logger: asFunction(() => new PinoLogger(plugin)).transient(),
      meterBuilder: asFunction(() => new MeterBuilder(plugin)).transient(),
    });

    // Register plugin services. The factory receives (ServerServices, config)
    // where config is the validated section from ConfigService.
    // We pre-compute the instance and register it with asValue, because the
    // factory's parameters are NOT Awilix-resolvable dependencies — they are
    // provided by the platform.
    const serviceRegistrations = plugin.serverServices ?? [];
    for (const { name, factory } of serviceRegistrations) {
      const config = resolvePluginConfig(container, plugin);
      const instance = factory(this as any, config);
      container.register({ [name]: asValue(instance) });
    }
  }

  /**
   * Retrieve a service by name. Returns the strongly-typed service instance.
   * Throws if the service has not been registered.
   */
  get(name: keyof T, resolveOpts?: TResolveOpts) {
    return this.container.resolve(name, resolveOpts);
  }

  /**
   * Check if a service is registered.
   */
  has<N extends ServiceName>(name: N): boolean {
    return this.container.hasRegistration(name);
  }
}

export const createScopedServiceContainer = <T extends ServiceRegistry>(plugin: Plugin) =>
  new ServerServices(container.createScope<T>(), plugin);
