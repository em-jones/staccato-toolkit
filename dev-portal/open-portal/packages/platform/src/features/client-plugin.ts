/**
 * Client-side feature flags plugin — wires an OpenFeature web provider
 * into the platform during the `onInit` lifecycle phase.
 *
 * The plugin also registers an `OpenFeatureService` into the DI
 * container so that downstream code can evaluate feature flags
 * through the typed `FeatureService` interface.
 */

import { OpenFeature } from "@openfeature/web-sdk";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { Logger } from "../o11y/types.ts";
import type { ClientFeatureFlagProviderPlugin, ServiceRegistration } from "../plugins/types.ts";
import type { ServerServices } from "../services/server.ts";
import { OpenFeatureService } from "./client.ts";
import type { ClientFeatureFlagConfig } from "./types.ts";

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
} as StandardSchemaV1<unknown, ClientFeatureFlagConfig>;

// ---------------------------------------------------------------------------
// Plugin factory
// ---------------------------------------------------------------------------

/**
 * Create a client-side feature flag plugin.
 *
 * The plugin:
 * 1. Sets the OpenFeature web provider during `onInit`.
 * 2. Registers an `OpenFeatureService` into the DI container for typed flag evaluation.
 */
export function createClientFeatureFlagPlugin(
  config: ClientFeatureFlagConfig,
): ClientFeatureFlagProviderPlugin<unknown, ServerServices, ClientFeatureFlagConfig> {
  const clientName = config.clientName ?? "client";

  const services: ServiceRegistration<ServerServices, ClientFeatureFlagConfig>[] = [
    {
      name: "featureService",
      factory: (container: ServerServices, pluginConfig: ClientFeatureFlagConfig) => {
        const logger = container.get("logger");
        const client = OpenFeature.getClient(clientName);

        return new OpenFeatureService(logger as Logger, pluginConfig.validators, client);
      },
    },
  ];

  return {
    name: "client-feature-flags",
    type: "client_feature_flag_provider",
    provider: config.provider,
    serverConfig: passthroughConfig,
    clientConfig: passthroughConfig,
    serverServices: services,
    clientServices: [],
    clientLifecycle: {},
    serverLifecycle: {
      async onInit(_services: ServerServices, _pluginConfig: ClientFeatureFlagConfig) {
        await OpenFeature.setProviderAndWait(config.provider);
      },
    },
  };
}
