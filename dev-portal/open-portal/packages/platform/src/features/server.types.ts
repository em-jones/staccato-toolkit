/**
 * Server-side feature flags plugin — wires an OpenFeature provider
 * into the platform during the `onInit` lifecycle phase.
 *
 * The plugin also registers an `OpenFeatureService` into the DI
 * container so that downstream code can evaluate feature flags
 * through the typed `FeatureService` interface.
 *
 * ```ts
 * // Register in your app startup:
 * openPort.registerPlugin(
 *   createServerFeatureFlagPlugin({
 *     provider: new InMemoryProvider({ "my-flag": true }),
 *     validators: {
 *       boolean: { "my-flag": (v) => v === true },
 *       string: {},
 *       number: {},
 *       object: {},
 *     },
 *   }),
 * );
 * ```
 */

import { OpenFeature } from "@openfeature/server-sdk";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { Logger, MeterBuilder } from "../o11y/types.ts";
import type { ServerFeatureFlagProviderPlugin, ServiceRegistration } from "../plugins/types.ts";
import type { ServerServices } from "../services/server.ts";
import { OpenFeatureService } from "./server.ts";
import type { ServerFeatureFlagConfig } from "./types.ts";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// Minimal passthrough schema for plugin config
const passthroughConfig = {
  "~standard": {
    vendor: "valibot",
    version: 1,
    validate: (input: unknown) => ({ value: input }),
  },
} as StandardSchemaV1<unknown, ServerFeatureFlagConfig>;

// ---------------------------------------------------------------------------
// Plugin factory
// ---------------------------------------------------------------------------

/**
 * Create a server-side feature flag plugin.
 *
 * The plugin:
 * 1. Sets the OpenFeature provider during `onInit`.
 * 2. Registers an `OpenFeatureService` into the DI container for typed flag evaluation.
 */
export function createServerFeatureFlagPlugin(
  config: ServerFeatureFlagConfig,
): ServerFeatureFlagProviderPlugin<unknown, ServerServices, ServerFeatureFlagConfig> {
  const clientName = config.clientName ?? "server";

  const services: ServiceRegistration<ServerServices, ServerFeatureFlagConfig>[] = [
    {
      name: "featureService",
      factory: (container: ServerServices, pluginConfig: ServerFeatureFlagConfig) => {
        const logger = container.get("logger");
        const meterBuilder = container.get("meterBuilder");
        const client = OpenFeature.getClient(clientName);

        return new OpenFeatureService(
          logger as Logger,
          pluginConfig.validators,
          client,
          meterBuilder as MeterBuilder,
        );
      },
    },
  ];

  return {
    name: "server-feature-flags",
    type: "server_feature_flag_provider",
    provider: config.provider,
    serverConfig: passthroughConfig,
    clientConfig: passthroughConfig,
    serverServices: services,
    clientServices: [],
    clientLifecycle: {},
    serverLifecycle: {
      async onInit(_services: ServerServices, _pluginConfig: ServerFeatureFlagConfig) {
        await OpenFeature.setProviderAndWait(config.provider);
      },
    },
  };
}
