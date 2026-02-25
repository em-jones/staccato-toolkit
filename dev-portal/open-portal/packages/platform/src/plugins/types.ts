import type { Provider as ServerProvider } from "@openfeature/server-sdk";
import type { Provider as ClientProvider } from "@openfeature/web-sdk";
import type { MeterOptions } from "@opentelemetry/api";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { EventHandler, HandlerOptions, TypedEvent } from "../events/types.ts";
import type { ServerServices } from "../services/server.ts";

/**
 * Describes a single service to be registered by a plugin.
 * The platform iterates over these and executes each factory to register the service.
 */
export interface ServiceRegistration<TServices = unknown, Config = unknown> {
  /**
   * The name under which the service will be registered.
   */
  name: string;
  /**
   * Factory function that creates the service instance.
   * Receives the ServerServices container (for resolving dependencies)
   * and the validated plugin configuration.
   */
  factory: (services: TServices, config: Config) => unknown;
}

export type PluginType =
  | "data_store"
  | "eventing"
  | "workflow"
  | "o11y"
  | "search_provider"
  | "custom";

/**
 * Lifecycle hook signatures.
 * The concrete ServerPlugin type narrows `Services` to ServerServices.
 *
 * All hooks are optional.  `init.server.ts` calls them in order:
 *   preStart → onInit → onReady  (startup)
 *   onDestroy                    (shutdown, reverse order)
 */
export interface ServerLifecycleHooks<TServices = unknown, Config = unknown> {
  /** Runs before service wiring — used for infrastructure tasks (e.g. DB migrations). */
  preStart?: (services: TServices, config: Config) => void | Promise<void>;
  /** Runs during service registration phase. */
  onInit?: (services: TServices, config: Config) => void | Promise<void>;
  /** Runs after all services are wired — used for seeding data, registering routes. */
  onReady?: (services: TServices, config: Config) => void | Promise<void>;
  /** Runs during graceful shutdown in reverse plugin order. */
  onDestroy?: (services: TServices) => void | Promise<void>;
  /** Subscribe to platform events. */
  on?: (event: unknown, handler: EventHandler, options?: HandlerOptions) => void;
}

/**
 * Feature specification for a plugin.
 *
 * Each plugin declares its feature toggles as a Record of feature key
 * to Standard Schema. The platform validates the `features` section of
 * the plugin's config against this schema at startup.
 *
 * ```ts
 * // Plugin definition
 * features: {
 *   "dark-mode": v.boolean(),
 *   "beta-search": v.object({ enabled: v.boolean(), provider: v.string() }),
 * }
 * ```
 */
export type PluginFeaturesSpec = Record<string, StandardSchemaV1<unknown, unknown>>;

/**
 * A server-side plugin that registers services into the ServerServices container.
 *
 * Each plugin must define:
 * 1. A unique `name` for identification.
 * 2. A `services` array of service configurations that are executed by the platform.
 * 3. An optional `configSchema` (Standard Schema) used to validate the plugin's
 *    configuration when it is loaded.
 * 4. Optional lifecycle hooks (`preStart`, `onInit`, `onReady`, `onDestroy`).
 * 5. Optional event handlers for the event hub.
 *
 * ## Configuration convention
 *
 * By default the platform looks up `config[plugin.name]` to find the plugin's
 * configuration section.  Use `configKey` to override this when multiple plugins
 * share a config section (e.g. several o11y plugins all reading `"telemetry"`).
 */
export interface BasePlugin<
  ClientServices = unknown,
  TServerServices = ServerServices,
  Config = unknown,
  TServerEvents = unknown,
  TClientEvents = unknown,
> {
  /**
   * Unique name of the plugin.
   */
  name: string;

  /**
   * Override the config section key used to look up this plugin's configuration
   * in `PlatformConfig`.  Defaults to `plugin.name` when omitted.
   *
   * Useful when a plugin's name differs from its config section
   * (e.g. plugin `"db-bun"` reading the `"core_datastore"` section).
   */
  configKey?: string;

  /**
   * Standard Schema for validating the plugin's configuration section.
   * If provided, the section is validated at `registerPlugin()` time.
   */
  serverConfig: StandardSchemaV1<unknown, Config>;
  clientConfig: StandardSchemaV1<unknown, Config>;

  /**
   * Feature specification — a Record of feature key to Standard Schema.
   *
   * Defines the shape of the `features` section in the plugin's config.
   * Each key is a feature flag name; each value is a Standard Schema that
   * validates the feature's configuration value.
   *
   * If omitted, the plugin declares no typed features.
   */
  features?: PluginFeaturesSpec;

  /**
   * A list of service configurations that are executed by the platform.
   * Each entry describes a service name and a factory that produces the instance.
   */
  serverServices: ServiceRegistration<TServerServices, Config>[];
  clientServices: ServiceRegistration<ClientServices, Config>[];

  /**
   * Optional metric definitions to be registered with the platform's MeterProvider.
   * Each key is a meter name, and the value is the MeterOptions for that meter.
   * Metrics can be created from these meters in the plugin's lifecycle hooks or services.
   */
  meters?: Record<string, MeterOptions>;

  type:
    | "data_store_provider"
    | "workflow"
    | "o11y"
    | "event_stream_provider"
    | "client_feature_flag_provider"
    | "server_feature_flag_provider"
    | "search_provider"
    | "custom";

  clientEvents?: Record<string, TypedEvent<TClientEvents>>;
  serverEvents?: Record<string, TypedEvent<TServerEvents>>;
  serverLifecycle: ServerLifecycleHooks<TServerServices, Config>;
  clientLifecycle?: ServerLifecycleHooks<ClientServices, Config>;

  registerClientEventHandler?: (
    event: string,
    handler: EventHandler,
    options?: HandlerOptions,
  ) => void;
  registerServerEventHandler?: (
    event: string,
    handler: EventHandler,
    options?: HandlerOptions,
  ) => void;
}

export interface ClientFeatureFlagProviderPlugin<
  ClientServices = unknown,
  TServerServices = ServerServices,
  Config = unknown,
> extends BasePlugin<ClientServices, TServerServices, Config> {
  type: "client_feature_flag_provider";
  provider: ClientProvider;
}

export interface ServerFeatureFlagProviderPlugin<
  ClientServices = unknown,
  TServerServices = ServerServices,
  Config = unknown,
> extends BasePlugin<ClientServices, TServerServices, Config> {
  type: "server_feature_flag_provider";
  provider: ServerProvider;
}

export type Plugin<ClientServices = unknown, TServerServices = ServerServices, Config = unknown> =
  | BasePlugin<ClientServices, TServerServices, Config>
  | ClientFeatureFlagProviderPlugin<ClientServices, TServerServices, Config>
  | ServerFeatureFlagProviderPlugin<ClientServices, TServerServices, Config>;
