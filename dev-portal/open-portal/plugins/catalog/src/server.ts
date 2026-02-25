import { parse as parseYamlDoc } from "yaml";
import * as v from "valibot";
import type { BasePlugin } from "@op/platform/plugins/types";
import { resolve } from "node:path";

import { CatalogEntitySchema, deriveRelations } from "./index.ts";
import type { CatalogEntity, UpsertFn } from "./index.ts";

// Re-export everything from the shared entry so `@op-plugin/catalog/server`
// is a strict superset — server consumers can import from a single specifier.
export * from "./index.ts";

// ---------------------------------------------------------------------------
// YAML parsing
// ---------------------------------------------------------------------------

/**
 * Parses a YAML string (single or multi-document separated by `---`) into
 * validated `CatalogEntity` objects.
 *
 * @throws if any document is invalid YAML or fails schema validation.
 */
export function parseYaml(content: string): CatalogEntity[] {
  const docs = content.split(/^---\s*$/m).filter((s) => s.trim().length > 0);
  const entities: CatalogEntity[] = [];

  for (const doc of docs) {
    let raw: unknown;
    try {
      raw = parseYamlDoc(doc);
    } catch (err) {
      throw new Error(`Invalid YAML document: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!raw || typeof raw !== "object") continue;

    const result = v.safeParse(CatalogEntitySchema, raw);
    if (!result.success) {
      const issues = result.issues
        .map((i) => `${i.path?.map((p) => p.key).join(".") ?? "?"}: ${i.message}`)
        .join("; ");
      throw new Error(`Invalid entity document: ${issues}`);
    }

    entities.push(result.output);
  }

  return entities;
}

// ---------------------------------------------------------------------------
// Import from file / URL
// ---------------------------------------------------------------------------

/**
 * Reads a `catalog-info.yaml` from a local file path or HTTP(S) URL,
 * validates all entity documents, derives relations, and calls `upsert`.
 *
 * @returns the list of parsed entities.
 * @throws on read errors, invalid YAML, or schema validation failures.
 */
export async function importFromYaml(
  source: string | URL,
  upsert: UpsertFn,
): Promise<CatalogEntity[]> {
  let content: string;
  const src = source.toString();

  if (src.startsWith("http://") || src.startsWith("https://")) {
    const res = await fetch(src);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${src}: ${res.status} ${res.statusText}`);
    }
    content = await res.text();
  } else {
    const { readFile } = await import("node:fs/promises");
    content = await readFile(src, "utf-8");
  }

  const entities = parseYaml(content);
  const relations = entities.flatMap(deriveRelations);
  await upsert(entities, relations);
  return entities;
}

export default {
  name: "catalog",
  type: "custom",
  serverConfig: undefined as any,
  clientConfig: undefined as any,
  serverServices: [],
  clientServices: [],
  eventHandlers: [],
  serverLifecycle: {
    async onReady(services) {
      const logger = services.get("logger");

      // Import catalog-info.yaml from the repository root
      const catalogInfoPath = resolve(process.cwd(), "../../catalog-info.yaml");

      try {
        const entities = await importFromYaml(catalogInfoPath, async (entities, relations) => {
          // In-memory upsert — entities are parsed and validated.
          // A production implementation would persist to the database via services.get("db").
          logger.info(
            `[catalog] Imported ${entities.length} entities and ${relations.length} relations from catalog-info.yaml`,
          );
        });
        logger.info(`[catalog] Bootstrapped ${entities.length} catalog entities`);
      } catch (err) {
        logger.warn(
          `[catalog] Failed to import catalog-info.yaml (non-fatal): ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  },
  clientLifecycle: {},
} satisfies BasePlugin;
