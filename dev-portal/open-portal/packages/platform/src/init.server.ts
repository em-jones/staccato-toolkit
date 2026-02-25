/**
 * Platform bootstrap — `init()` is the primary entry point for starting
 * an OpenPort server.
 *
 * ```ts
 * import { init } from "@op/platform";
 *
 * const openPort = await init();
 * openPort.registerPlugin(import("@op-plugin/authentication-better-auth"));
 * await openPort.start();
 * ```
 *
 * `init()` performs three tasks before returning:
 *   1. OTel SDK initialization (instrumentation must be first).
 *   2. Configuration loading and validation.
 *   3. Pre-registration of the five core plugins.
 *
 * Plugins that need to run tasks before service wiring (e.g. DB migrations)
 * declare a `preStart` lifecycle hook.  Those hooks fire at the start of
 * `openPort.start()`, before any `onInit` hook runs.
 */

import { loadRawConfig, resolveConfigFromBase } from "./config/loader.ts";
import { ConfigServiceImpl } from "./config/service.ts";
import { PluginFeaturesImpl, type PluginFeatures } from "./features/plugin-features.ts";
import type { Plugin, PluginFeaturesSpec } from "./plugins/types.ts";
import {
  createScopedServiceContainer,
  registerRootService,
  resolveRootService,
  type ServerServices,
} from "./services/server.ts";

// ---------------------------------------------------------------------------
// Feature flag provider defaults
// ---------------------------------------------------------------------------

/**
 * Determine whether any registered plugin provides a server-side feature flag
 * provider.  If none is found the platform installs a NoopProvider so that
 * code relying on OpenFeature does not crash.
 */
async function ensureServerFeatureFlagProvider(plugins: Plugin[], rootLogger: any): Promise<void> {
  const hasServerFeatureFlagProvider = plugins.some(
    (p) => p.type === "server_feature_flag_provider",
  );

  if (!hasServerFeatureFlagProvider) {
    rootLogger.debug("No server feature flag provider found, installing NoopProvider");
    // Dynamically import the OpenFeature SDK so that the platform still works
    // when no feature-flag packages are installed.
    try {
      const { NOOP_PROVIDER, OpenFeature } = await import("@openfeature/server-sdk");
      await OpenFeature.setProviderAndWait(NOOP_PROVIDER);
      rootLogger.info("NOOP_PROVIDER installed for server-side feature flags");
    } catch {
      // OpenFeature server SDK not installed — skip silently.
      rootLogger.debug("OpenFeature server SDK not installed — skipping NOOP_PROVIDER");
    }
  } else {
    rootLogger.debug("Server feature flag provider detected");
  }
}

/**
 * Determine whether any registered plugin provides a client-side feature flag
 * provider.  If none is found the platform installs a NoopProvider so that
 * client-side code relying on OpenFeature does not crash.
 */
async function ensureClientFeatureFlagProvider(plugins: Plugin[], rootLogger: any): Promise<void> {
  const hasClientFeatureFlagProvider = plugins.some(
    (p) => p.type === "client_feature_flag_provider",
  );

  if (!hasClientFeatureFlagProvider) {
    rootLogger.debug("No client feature flag provider found, installing NoopProvider");
    try {
      const { NOOP_PROVIDER, OpenFeature } = await import("@openfeature/web-sdk");
      await OpenFeature.setProviderAndWait(NOOP_PROVIDER);
      rootLogger.info("NOOP_PROVIDER installed for client-side feature flags");
    } catch {
      // OpenFeature web SDK not installed — skip silently.
      rootLogger.debug("OpenFeature web SDK not installed — skipping NOOP_PROVIDER");
    }
  } else {
    rootLogger.debug("Client feature flag provider detected");
  }
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface InitOptions {
  /** Service name for telemetry (default: $OTEL_SERVICE_NAME or "openport"). */
  serviceName?: string;
  /**
   * Environment name for config overlay selection
   * (default: process.env.OPENPORT_ENV ?? "local").
   * Loads `openport.yaml` + `openport.<env>.yaml`.
   */
  env?: string;
  /**
   * Directory to search for openport config files (default: process.cwd()).
   */
  configDir?: string;
  /**
   * Pre-parsed base config object, typically provided by the Vite virtual
   * module `virtual:openport-base-config`.  When set, the runtime skips
   * reading `openport.yaml` from disk and only loads the env overlay file.
   * `${VAR}` interpolation and validation still happen at runtime.
   */
  baseConfig?: Record<string, unknown>;
}

/**
 * The builder object returned by `init()`.
 *
 * Call `registerPlugin` for each additional plugin your application needs,
 * then call `start()` to run the full startup sequence.
 */
export interface OpenPortApp {
  /**
   * Register a plugin with the platform.
   *
   * For static plugins the config section (identified by `plugin.configKey ??
   * plugin.name`) is validated immediately against the loaded config.
   *
   * For dynamic imports the module is resolved and the config is validated
   * at the start of `start()`, before any lifecycle hooks run.
   *
   * Returns `this` for chaining.
   */
  registerPlugin(
    plugin: Plugin | Promise<{ default: Plugin; [key: string]: unknown } | Plugin>,
  ): OpenPortApp;

  /**
   * Run the full startup sequence:
   *   1. Resolve any pending dynamic-import plugins (+ validate their configs).
   *   2. Run `preStart` on all plugins in registration order.
   *   3. Run `onInit` on all plugins and register their services.
   *   4. Run `onReady` on all plugins.
   */
  start(): Promise<void>;

  /**
   * Graceful shutdown: runs `onDestroy` on all plugins in reverse order.
   */
  stop(): Promise<void>;

  /** DI container — available immediately after `init()`. */
  readonly services: ServerServices;

  /** Raw merged config object — available immediately after `init()`. */
  readonly config: Record<string, unknown> | undefined;

  /** Config service —register schemas and read typed sections per-plugin. */
  readonly configService: ConfigServiceImpl;

  /**
   * Plugin features registry — available after `start()` completes.
   *
   * Provides type-safe access to each plugin's FeatureService via `.get(name)`.
   */
  readonly pluginFeatures: PluginFeatures;
}

// ---------------------------------------------------------------------------
// init()
// ---------------------------------------------------------------------------

/**
 * Initialize the OpenPort platform.
 * TODO: Move this to "server" init
 *
 * @see {@link OpenPortApp} for the returned builder API.
 */
export async function init(options: InitOptions = {}): Promise<OpenPortApp> {
  const serviceName = options.serviceName ?? process.env["OTEL_SERVICE_NAME"] ?? "openport";

  // 1. OTel SDK — must be first so subsequent code is instrumented.
  await initOtelSdk(serviceName);

  // 2. rootLogger — resolved from root container (registered at module load time).
  const rootLogger = resolveRootService("rootLogger");
  rootLogger.info("OpenPort platform initializing", { serviceName });

  // 3. Load raw config files (non-fatal: continues with empty config on failure).
  //    When `baseConfig` is provided (e.g. from `virtual:openport-base-config`)
  //    the base YAML read is skipped — only the env overlay is loaded from disk.
  let rawConfig: Record<string, unknown> | undefined;
  try {
    if (options.baseConfig) {
      rootLogger.debug("Using build-time base config, loading env overlay only...");
      rawConfig = await resolveConfigFromBase(options.baseConfig, {
        env: options.env,
        dir: options.configDir,
      });
    } else {
      rootLogger.debug("Loading configuration files...");
      rawConfig = await loadRawConfig({ env: options.env, dir: options.configDir });
    }
    rootLogger.info("Configuration loaded successfully");
  } catch (err) {
    rootLogger.warn(
      `Config load failed — using defaults: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // 4. Construct ConfigService with the server subtree and register it in DI.
  const serverRawConfig = (rawConfig?.["server"] ?? {}) as Record<string, unknown>;
  const configService = new ConfigServiceImpl(serverRawConfig, rootLogger);
  registerRootService("configService", configService);

  // Plugin registry — static (already resolved) and pending (dynamic imports).
  const staticPlugins: Plugin[] = [];
  const pendingPlugins: Promise<Plugin>[] = [];
  const pluginServicesMap = new Map<string, ServerServices>();

  // Plugin features registry — built after onInit completes.
  const pluginFeatures = new PluginFeaturesImpl();

  // ---------------------------------------------------------------------------
  // Builder implementation
  // ---------------------------------------------------------------------------
  const app: OpenPortApp = {
    registerPlugin(pluginOrPromise) {
      if (isResolvedPlugin(pluginOrPromise)) {
        registerAndValidatePlugin(pluginOrPromise, configService);
        staticPlugins.push(pluginOrPromise);
        rootLogger.info("Plugin registered", {
          pluginName: pluginOrPromise.name,
          type: pluginOrPromise.type,
        });
      } else {
        // Resolve + validate deferred to start()
        pendingPlugins.push(
          resolvePlugin(pluginOrPromise).then((p) => {
            registerAndValidatePlugin(p, configService);
            rootLogger.info("Dynamic plugin registered", { pluginName: p.name, type: p.type });
            return p;
          }),
        );
        rootLogger.debug("Dynamic plugin registration queued");
      }
      return app;
    },
    async start() {
      rootLogger.info("Starting OpenPort platform...");

      // Resolve any pending dynamic imports (config validation runs in the .then above).
      rootLogger.debug(`Resolving ${pendingPlugins.length} pending plugin(s)...`);
      const resolved = await Promise.all(pendingPlugins);
      staticPlugins.push(...resolved);
      rootLogger.info(`Total plugins loaded: ${staticPlugins.length}`);

      // Ensure feature flag providers are available before onInit runs.
      // If no server/client feature_flag_provider plugins are registered, install NoopProvider.
      await ensureServerFeatureFlagProvider(staticPlugins, rootLogger);
      await ensureClientFeatureFlagProvider(staticPlugins, rootLogger);

      // preStart — infrastructure tasks (e.g. DB migrations) before service wiring.
      rootLogger.info("Running preStart lifecycle hooks...");
      for (const plugin of staticPlugins) {
        const services = createScopedServiceContainer(plugin);
        pluginServicesMap.set(plugin.name, services);
        const pluginConfig = getPluginConfig(plugin, configService);
        try {
          await plugin.serverLifecycle.preStart?.(services, pluginConfig);
          rootLogger.debug(`preStart complete for plugin: ${plugin.name}`);
        } catch (err) {
          rootLogger.error(
            `preStart failed for plugin "${plugin.name}": ${err instanceof Error ? err.message : String(err)}`,
          );
          throw err;
        }
      }
      rootLogger.info("All preStart hooks completed");

      // onInit — register services into the DI container.
      rootLogger.info("Running onInit lifecycle hooks...");
      for (const plugin of staticPlugins) {
        const services = pluginServicesMap.get(plugin.name);
        if (!services) continue;
        const pluginConfig = getPluginConfig(plugin, configService);
        try {
          await plugin.serverLifecycle.onInit?.(services, pluginConfig);
          rootLogger.debug(`onInit complete for plugin: ${plugin.name}`);
        } catch (err) {
          rootLogger.error(
            `onInit failed for plugin "${plugin.name}": ${err instanceof Error ? err.message : String(err)}`,
          );
          throw err;
        }
      }
      rootLogger.info("All onInit hooks completed");

      // Build PluginFeatures registry after onInit so all services are available.
      rootLogger.info("Building plugin features registry...");
      buildPluginFeatures(staticPlugins, configService, pluginFeatures, rootLogger);

      // onReady — post-wiring tasks (e.g. seeding data, registering routes).
      rootLogger.info("Running onReady lifecycle hooks...");
      for (const plugin of staticPlugins) {
        const services = pluginServicesMap.get(plugin.name);
        if (!services) continue;
        const pluginConfig = getPluginConfig(plugin, configService);
        try {
          await plugin.serverLifecycle.onReady?.(services, pluginConfig);
          rootLogger.debug(`onReady complete for plugin: ${plugin.name}`);
        } catch (err) {
          rootLogger.error(
            `onReady failed for plugin "${plugin.name}": ${err instanceof Error ? err.message : String(err)}`,
          );
          throw err;
        }
      }

      rootLogger.info("OpenPort platform started successfully", {
        pluginCount: staticPlugins.length,
      });
    },

    async stop() {
      rootLogger.info("Shutting down OpenPort platform...");
      for (let i = staticPlugins.length - 1; i >= 0; i--) {
        try {
          const services = pluginServicesMap.get(staticPlugins[i].name);
          if (!services)
            rootLogger.debug(
              `No services found for plugin during shutdown: ${staticPlugins[i].name}`,
            );
          else {
            await staticPlugins[i].serverLifecycle.onDestroy?.(services);
            rootLogger.debug(`onDestroy complete for plugin: ${staticPlugins[i].name}`);
          }
        } catch (err) {
          rootLogger.error(
            `Plugin "${staticPlugins[i].name}" onDestroy failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
      rootLogger.info("OpenPort platform shutdown complete");
    },

    get services() {
      // Return the first plugin's service container as the primary services view.
      // All plugin containers are scopes of the same root Awilix container,
      // so resolving through any scope gives access to the full service graph.
      const first = staticPlugins[0];
      if (!first)
        throw new Error(
          "[openport] No plugins registered — call registerPlugin() before accessing services.",
        );
      return pluginServicesMap.get(first.name)!;
    },

    get config() {
      return rawConfig;
    },

    get configService() {
      return configService;
    },

    get pluginFeatures() {
      return pluginFeatures;
    },
  };

  return app;
}

// ---------------------------------------------------------------------------
// OTel SDK initialization
// ---------------------------------------------------------------------------

async function initOtelSdk(serviceName: string): Promise<void> {
  // Guarded by OPENPORT_SELF_INTROSPECTION (defaults to enabled).
  // eslint-disable-next-line dot-notation -- dot notation required for Vite define replacement
  if (process.env.OPENPORT_SELF_INTROSPECTION === "false") return;

  try {
    const [
      { NodeSDK },
      { getNodeAutoInstrumentations },
      { resourceFromAttributes },
      { OTLPTraceExporter },
      { OTLPMetricExporter },
      { PeriodicExportingMetricReader },
      { OTLPLogExporter },
      { SimpleLogRecordProcessor },
      { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION },
    ] = await Promise.all([
      import("@opentelemetry/sdk-node"),
      import("@opentelemetry/auto-instrumentations-node"),
      import("@opentelemetry/resources"),
      import("@opentelemetry/exporter-trace-otlp-http"),
      import("@opentelemetry/exporter-metrics-otlp-http"),
      import("@opentelemetry/sdk-metrics"),
      import("@opentelemetry/exporter-logs-otlp-http"),
      import("@opentelemetry/sdk-logs"),
      import("@opentelemetry/semantic-conventions"),
    ]);

    const endpoint = process.env["OTEL_EXPORTER_OTLP_ENDPOINT"] ?? "http://localhost:4318";

    const sdk = new NodeSDK({
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: serviceName,
        [ATTR_SERVICE_VERSION]: "0.1.0",
      }),
      traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
      metricReader: new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` }),
        exportIntervalMillis: 30_000,
      }),
      logRecordProcessors: [
        new SimpleLogRecordProcessor(new OTLPLogExporter({ url: `${endpoint}/v1/logs` })),
      ],
      instrumentations: [
        getNodeAutoInstrumentations({
          "@opentelemetry/instrumentation-http": { enabled: true },
          "@opentelemetry/instrumentation-fs": { enabled: false },
        }),
      ],
    });

    sdk.start();
    process.on("SIGTERM", () => sdk.shutdown().catch(console.error));
  } catch (err) {
    // OTel SDK packages are optional — warn and continue.
    process.stderr.write(
      `[openport] OTel SDK init skipped (optional packages not installed): ${err instanceof Error ? err.message : String(err)}\n`,
    );
  }
}

// ---------------------------------------------------------------------------
// Plugin helpers
// ---------------------------------------------------------------------------

function isResolvedPlugin(value: unknown): value is Plugin {
  return (
    typeof value === "object" &&
    value !== null &&
    !("then" in value) &&
    "name" in value &&
    typeof (value as Record<string, unknown>).name === "string"
  );
}

async function resolvePlugin(
  promise: Promise<{ default: Plugin; [key: string]: unknown } | Plugin>,
): Promise<Plugin> {
  const mod = await promise;
  if (typeof mod === "object" && mod !== null && "default" in mod) {
    return (mod as { default: Plugin }).default;
  }
  return mod as Plugin;
}

/**
 * Register the plugin's config schema with `ConfigService` and eagerly
 * validate the section so errors surface at `registerPlugin()` time.
 */
function registerAndValidatePlugin(plugin: Plugin, configService: ConfigServiceImpl): void {
  if (!plugin.serverConfig) return;

  const key = plugin.configKey ?? plugin.name;
  configService.registerSchema(key, plugin.serverConfig);

  // Eager validation — mirrors the old validatePluginConfig() behaviour so
  // callers see errors immediately rather than waiting for lifecycle hooks.
  try {
    configService.read(key);
  } catch (err) {
    throw new Error(
      `[openport] Plugin "${plugin.name}" config validation failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Return the validated config for a plugin via `ConfigService`.
 * Returns `undefined` if the plugin has no schema.
 */
function getPluginConfig(plugin: Plugin, configService: ConfigServiceImpl): unknown {
  if (!plugin.serverConfig) return undefined;
  const key = plugin.configKey ?? plugin.name;
  return configService.read(key);
}

// ---------------------------------------------------------------------------
// PluginFeatures builder
// ---------------------------------------------------------------------------

/**
 * Build the PluginFeatures registry from all registered plugins.
 *
 * For each plugin that declares a `features` spec, this function:
 * 1. Reads the `features` section from the plugin's config.
 * 2. Validates each feature value against its schema.
 * 3. Constructs a TypedFeatureService with validators derived from the schemas.
 * 4. Registers the service in the PluginFeaturesImpl under the plugin's name.
 */
function buildPluginFeatures(
  plugins: Plugin[],
  configService: ConfigServiceImpl,
  pluginFeatures: PluginFeaturesImpl,
  rootLogger: any,
): void {
  for (const plugin of plugins) {
    if (!plugin.features || Object.keys(plugin.features).length === 0) {
      continue;
    }

    const featuresSpec = plugin.features;
    const pluginConfig = getPluginConfig(plugin, configService);
    const featuresSection = (pluginConfig as any)?.features ?? {};

    // Validate each feature value against its schema
    const validatedFeatures: Record<string, unknown> = {};
    for (const [key, schema] of Object.entries(featuresSpec)) {
      const rawValue = featuresSection[key];
      const result = schema["~standard"].validate(rawValue);

      if (result instanceof Promise) {
        throw new Error(
          `[openport] Async feature validation is not supported for plugin "${plugin.name}", feature "${key}"`,
        );
      }

      if (result.issues) {
        const summary = result.issues
          .map((issue) => {
            const path =
              issue.path
                ?.map((p) => (typeof p === "object" && p !== null ? String(p.key) : String(p)))
                .join(".") ?? "(root)";
            return `${path}: ${issue.message}`;
          })
          .join("; ");

        throw new Error(
          `[openport] Plugin "${plugin.name}" feature "${key}" validation failed: ${summary}`,
        );
      }

      validatedFeatures[key] = result.value;
    }

    // Build validators from validated feature values
    const validators = buildValidatorsFromFeatures(featuresSpec, validatedFeatures);

    // Create a simple FeatureService that reads from validated features
    const featureService = createValidatedFeatureService(validatedFeatures, validators);

    pluginFeatures.register(plugin.name, featureService);
    rootLogger.debug(`Feature service registered for plugin: ${plugin.name}`);
  }

  rootLogger.info(`Plugin features registry built with ${pluginFeatures.names().length} plugin(s)`);
}

/**
 * Build a Validators object from a plugin's features spec and validated values.
 */
function buildValidatorsFromFeatures(
  _spec: PluginFeaturesSpec,
  validatedFeatures: Record<string, unknown>,
): {
  boolean: Record<string, (value: unknown) => boolean>;
  string: Record<string, (value: unknown) => string>;
  number: Record<string, (value: unknown) => number>;
  object: Record<string, (value: unknown) => unknown>;
} {
  const validators = {
    boolean: {} as Record<string, (value: unknown) => boolean>,
    string: {} as Record<string, (value: unknown) => string>,
    number: {} as Record<string, (value: unknown) => number>,
    object: {} as Record<string, (value: unknown) => unknown>,
  };

  for (const [key, value] of Object.entries(validatedFeatures)) {
    if (typeof value === "boolean") {
      validators.boolean[key] = (v: unknown) => v as boolean;
    } else if (typeof value === "string") {
      validators.string[key] = (v: unknown) => v as string;
    } else if (typeof value === "number") {
      validators.number[key] = (v: unknown) => v as number;
    } else {
      validators.object[key] = (v: unknown) => v;
    }
  }

  return validators;
}

/**
 * Create a FeatureService that reads from pre-validated feature values.
 */
function createValidatedFeatureService(
  features: Record<string, unknown>,
  validators: {
    boolean: Record<string, (value: unknown) => boolean>;
    string: Record<string, (value: unknown) => string>;
    number: Record<string, (value: unknown) => number>;
    object: Record<string, (value: unknown) => unknown>;
  },
): any {
  return {
    async getBooleanFlag(name: string, defaultValue: boolean): Promise<boolean> {
      if (!(name in validators.boolean)) return defaultValue;
      return validators.boolean[name](features[name]);
    },
    async getStringFlag(name: string, defaultValue: string): Promise<string> {
      if (!(name in validators.string)) return defaultValue;
      return validators.string[name](features[name]);
    },
    async getNumberFlag(name: string, defaultValue: number): Promise<number> {
      if (!(name in validators.number)) return defaultValue;
      return validators.number[name](features[name]);
    },
    async getObjectFlag(name: string, defaultValue: unknown): Promise<unknown> {
      if (!(name in validators.object)) return defaultValue;
      return validators.object[name](features[name]);
    },
  };
}
