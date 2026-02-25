/**
 * OpenAPI specification generator for OpenPort plugins.
 *
 * Reads all registered plugin `serverConfig` Standard Schema definitions
 * and generates an OpenAPI 3.1 JSON specification.
 *
 * Usage: bun run scripts/generate-openapi.ts
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { toOpenAPISchema } from "@standard-community/standard-openapi";
import * as v from "valibot";

import type { StandardSchemaV1 } from "@standard-schema/spec";

interface PluginSchemaEntry {
  name: string;
  serverConfig: StandardSchemaV1;
}

// ---------------------------------------------------------------------------
// Plugin config schemas
//
// Each entry documents the expected configuration for a registered plugin.
// Schemas are defined using valibot (Standard Schema V1 compatible).
// ---------------------------------------------------------------------------

const pluginSchemas: PluginSchemaEntry[] = [
  {
    name: "events-s2",
    serverConfig: v.object({
      endpoint: v.optional(v.string(), "http://localhost:9092"),
      apiKey: v.optional(v.string()),
      basin: v.optional(v.string()),
      timeoutMs: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), 3000),
    }),
  },
  {
    name: "workflows-hatchet",
    serverConfig: v.object({
      serverUrl: v.optional(v.string()),
      token: v.optional(v.string()),
      workerName: v.optional(v.string(), "openport-worker"),
    }),
  },
  {
    name: "db-bun",
    serverConfig: v.object({
      databaseUrl: v.optional(v.string(), "dev.db"),
    }),
  },
  {
    name: "authentication-better-auth",
    serverConfig: v.object({
      secret: v.string(),
      baseUrl: v.optional(v.string()),
      trustedOrigins: v.optional(v.array(v.string())),
    }),
  },
  {
    name: "authorization-duck-iam",
    serverConfig: v.object({
      defaultRole: v.optional(v.string(), "viewer"),
      superAdminEmails: v.optional(v.array(v.string())),
    }),
  },
  {
    name: "catalog",
    serverConfig: v.object({
      catalogInfoPath: v.optional(v.string(), "../../catalog-info.yaml"),
    }),
  },
  {
    name: "server-feature-flags",
    serverConfig: v.object({
      clientName: v.optional(v.string(), "server"),
    }),
  },
];

// ---------------------------------------------------------------------------
// OpenAPI document builder
// ---------------------------------------------------------------------------

async function generateOpenApi(): Promise<Record<string, unknown>> {
  const doc: Record<string, unknown> = {
    openapi: "3.1.0",
    info: {
      title: "OpenPort Plugin Configuration API",
      description:
        "OpenAPI 3.1 specification generated from plugin serverConfig schemas. " +
        "Each schema component describes the configuration structure for a plugin.",
      version: "0.0.1",
    },
    paths: {},
    components: {
      schemas: {} as Record<string, unknown>,
    },
  };

  let schemaCount = 0;

  for (const entry of pluginSchemas) {
    console.log(`[openapi] Converting schema for plugin "${entry.name}"…`);

    try {
      const { schema, components } = await toOpenAPISchema(entry.serverConfig);

      // Register the plugin's config schema under a PascalCase name
      const schemaName =
        entry.name
          .split(/[-_]/)
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join("") + "Config";

      (doc.components!.schemas as Record<string, unknown>)[schemaName] = schema;
      schemaCount++;

      // Merge any sub-schemas from the conversion (e.g., referenced types)
      if (components?.schemas) {
        for (const [key, value] of Object.entries(components.schemas)) {
          const schemas = doc.components!.schemas as Record<string, unknown>;
          if (!schemas[key]) {
            schemas[key] = value;
          }
        }
      }
    } catch (err) {
      console.error(
        `[openapi] Failed to convert schema for plugin "${entry.name}":`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  console.log(`[openapi] Generated ${schemaCount} plugin schemas`);
  return doc;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const doc = await generateOpenApi();
  const json = JSON.stringify(doc, null, 2);

  // Output to apps/web/public/openapi.json
  const outPath = resolve(import.meta.dirname, "..", "public", "openapi.json");
  mkdirSync(resolve(outPath, ".."), { recursive: true });
  writeFileSync(outPath, json, "utf-8");

  console.log(`[openapi] Written to ${outPath}`);
}

main().catch((err) => {
  console.error("[openapi] Fatal error:", err);
  process.exit(1);
});
