/**
 * Nitro server plugin — integrates the Nitro web server framework
 * with the OpenPort plugin architecture.
 *
 * Nitro provides:
 * - Auto-imports and auto-handlers
 * - Server routes and middleware
 * - API routes with type safety
 * - Static asset serving
 * - WebSocket support
 *
 * This plugin exposes utilities for defining Nitro server plugins
 * that can be composed with other OpenPort plugins.
 */

import type { EventHandler, H3Event } from "h3";
import type * as v from "valibot";
import type { Logger } from "@op/platform/o11y/api";
import type { BasePlugin } from "@op/platform/plugins/types";

// ---------------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------------

/** Nitro server plugin specification. */
export interface NitroServerPlugin {
  /** Unique plugin identifier. */
  name: string;
  /** Plugin version. */
  version: string;
  /** Setup hook — called when the Nitro server starts. */
  setup?: (nitro: NitroServerContext) => void | Promise<void>;
  /** Startup hook — called once after the server is fully initialized. */
  onStartup?: () => void | Promise<void>;
  /** Request hook — called on every incoming request. */
  onRequest?: (event: H3Event) => void | Promise<void>;
  /** Shutdown hook — called when the server is shutting down. */
  onShutdown?: () => void | Promise<void>;
  /** Routes to register. */
  routes?: NitroRoute[];
  /** Middleware to register. */
  middleware?: NitroMiddleware[];
}

/** Nitro server context — passed to plugin setup hooks. */
export interface NitroServerContext {
  /** Register an event handler for a route. */
  use: (route: string, handler: EventHandler) => void;
  /** Register middleware. */
  useMiddleware: (middleware: NitroMiddleware) => void;
  /** Access to Nitro config. */
  config: NitroConfig;
}

/** Nitro configuration subset. */
export interface NitroConfig {
  /** Server host. */
  host?: string;
  /** Server port. */
  port?: number;
  /** Development mode. */
  dev?: boolean;
}

// ---------------------------------------------------------------------------
// Route definition
// ---------------------------------------------------------------------------

/** HTTP method. */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";

/** Nitro route definition. */
export interface NitroRoute {
  /** Route path (e.g. "/api/catalog"). */
  path: string;
  /** HTTP method. */
  method: HttpMethod;
  /** Request handler. */
  handler: EventHandler;
  /** Optional request validation schema. */
  requestSchema?: v.GenericSchema;
  /** Optional response validation schema. */
  responseSchema?: v.GenericSchema;
}

// ---------------------------------------------------------------------------
// Middleware definition
// ---------------------------------------------------------------------------

/** Nitro middleware function. */
export interface NitroMiddleware {
  /** Middleware name. */
  name: string;
  /** Execution order (lower = earlier). */
  order: number;
  /** Middleware handler. */
  handler: (event: H3Event, next: () => Promise<void>) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Plugin registry
// ---------------------------------------------------------------------------

/**
 * Registry for Nitro server plugins.
 * Collects plugins and provides them to the Nitro server during startup.
 */
export class NitroPluginRegistry {
  private plugins: NitroServerPlugin[] = [];
  private logger: Logger | undefined;

  constructor(logger?: Logger) {
    this.logger = logger;
  }

  /**
   * Register a Nitro server plugin.
   */
  register(plugin: NitroServerPlugin): void {
    this.plugins.push(plugin);
    this.logger?.debug("Registered Nitro plugin", { pluginName: plugin.name, version: plugin.version });
    this.logger?.info("Nitro plugin registered", { pluginName: plugin.name });
  }

  /**
   * Get all registered plugins.
   */
  getPlugins(): NitroServerPlugin[] {
    return [...this.plugins];
  }

  /**
   * Get all routes from registered plugins.
   */
  getAllRoutes(): NitroRoute[] {
    const routes = this.plugins.flatMap((p) => p.routes ?? []);
    this.logger?.debug(`Retrieved ${routes.length} routes from ${this.plugins.length} plugins`);
    return routes;
  }

  /**
   * Get all middleware from registered plugins, sorted by order.
   */
  getAllMiddleware(): NitroMiddleware[] {
    const middleware = this.plugins.flatMap((p) => p.middleware ?? []).sort((a, b) => a.order - b.order);
    this.logger?.debug(`Retrieved ${middleware.length} middleware from ${this.plugins.length} plugins`);
    return middleware;
  }

  /**
   * Run all startup hooks from registered plugins.
   */
  async runStartupHooks(): Promise<void> {
    this.logger?.info(`Running startup hooks for ${this.plugins.length} Nitro plugins`);
    for (const plugin of this.plugins) {
      try {
        await plugin.onStartup?.();
        this.logger?.debug(`Startup hook completed for plugin: ${plugin.name}`);
      } catch (err) {
        this.logger?.error(`Startup hook failed for plugin "${plugin.name}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    this.logger?.info("All Nitro plugin startup hooks completed");
  }

  /**
   * Run all request hooks from registered plugins.
   */
  async runRequestHooks(event: H3Event): Promise<void> {
    for (const plugin of this.plugins) {
      try {
        await plugin.onRequest?.(event);
      } catch (err) {
        this.logger?.error(`Request hook failed for plugin "${plugin.name}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  /**
   * Run all shutdown hooks from registered plugins.
   */
  async runShutdownHooks(): Promise<void> {
    this.logger?.info(`Running shutdown hooks for ${this.plugins.length} Nitro plugins`);
    for (const plugin of this.plugins) {
      try {
        await plugin.onShutdown?.();
        this.logger?.debug(`Shutdown hook completed for plugin: ${plugin.name}`);
      } catch (err) {
        this.logger?.error(`Shutdown hook failed for plugin "${plugin.name}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    this.logger?.info("All Nitro plugin shutdown hooks completed");
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a Nitro server plugin registry.
 * This is the factory used by the DI container.
 */
export function createNitroPluginRegistry(logger?: Logger): NitroPluginRegistry {
  return new NitroPluginRegistry(logger);
}

/**
 * Define a Nitro server plugin.
 */
export function defineNitroPlugin(plugin: NitroServerPlugin): NitroServerPlugin {
  return plugin;
}

interface RouteOptions {
  requestSchema?: v.GenericSchema;
  responseSchema?: v.GenericSchema;
}

/**
 * Define a Nitro route with optional validation.
 */
export function defineRoute(
  path: string,
  method: HttpMethod,
  handler: EventHandler,
  options?: RouteOptions,
) {
  return {
    ...options,
    path,
    method,
    handler,
  };
}

type MiddlewareHandler = (event: H3Event, next: () => Promise<void>) => Promise<void>;

/**
 * Define a Nitro middleware.
 */
export const defineMiddleware = (name: string, order: number, handler: MiddlewareHandler) => ({
  name,
  order,
  handler,
});

export default {
  name: "nitro-server-plugin",
  type: "custom",
  serverConfig: undefined as any,
  clientConfig: undefined as any,
  serverServices: [
    {
      name: "nitroRegistry",
      factory: (services: any) => {
        const logger = services.get("logger");
        return createNitroPluginRegistry(logger);
      },
    },
  ],
  clientServices: [],
  eventHandlers: [],
  serverLifecycle: {
    async onInit(services: any) {
      const logger = services.get("logger");
      logger.info("[nitro-server-plugin] NitroPluginRegistry initialized");
    },
    async onDestroy(services: any) {
      const logger = services.get("logger");
      const registry = services.get("nitroRegistry");
      if (registry) {
        await registry.runShutdownHooks();
      }
      logger.info("[nitro-server-plugin] Nitro server plugin shutdown complete");
    },
  },
  clientLifecycle: {},
} satisfies BasePlugin;
