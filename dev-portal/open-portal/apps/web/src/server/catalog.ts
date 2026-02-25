import * as schema from "@op/platform/db-sqlite";
import { Permission, requirePermission } from "@op-plugin/auth-core/permissions";
import type { CatalogEntity, EntityRelation } from "@op-plugin/catalog";
import { CatalogEntitySchema, deriveRelations } from "@op-plugin/catalog";
import { importFromYaml } from "@op-plugin/catalog/server";
import { createDb } from "@op-plugin/db-bun";
import { createServerFn } from "@tanstack/solid-start";
import { getRequest } from "@tanstack/solid-start/server";
import { and, eq, like, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as v from "valibot";

import { env } from "../env";
import { auth } from "../lib/auth";

function getDb() {
  return createDb(env.DATABASE_URL);
}

async function getPermCtx() {
  const request = getRequest();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  return {
    userId: session.user.id,
    roles: ["admin"],
    permissions: Object.values(Permission),
  };
}

// ---------------------------------------------------------------------------
// Upsert helper (shared by import and create/update)
// ---------------------------------------------------------------------------

async function upsertEntities(
  db: ReturnType<typeof getDb>,
  entities: CatalogEntity[],
  relations: EntityRelation[],
) {
  const now = new Date();

  for (const entity of entities) {
    await db
      .insert(schema.catalogEntities)
      .values({
        id: nanoid(),
        kind: entity.kind,
        name: entity.metadata.name,
        namespace: entity.metadata.namespace ?? "default",
        title: entity.metadata.title ?? null,
        description: entity.metadata.description ?? null,
        metadata: JSON.stringify(entity.metadata),
        spec: JSON.stringify(entity.spec ?? {}),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          schema.catalogEntities.kind,
          schema.catalogEntities.name,
          schema.catalogEntities.namespace,
        ],
        set: {
          title: entity.metadata.title ?? null,
          description: entity.metadata.description ?? null,
          metadata: JSON.stringify(entity.metadata),
          spec: JSON.stringify(entity.spec ?? {}),
          updatedAt: now,
        },
      });

    // Re-sync relations for this entity.
    const [row] = await db
      .select({ id: schema.catalogEntities.id })
      .from(schema.catalogEntities)
      .where(
        and(
          eq(schema.catalogEntities.kind, entity.kind),
          eq(schema.catalogEntities.name, entity.metadata.name),
          eq(schema.catalogEntities.namespace, entity.metadata.namespace ?? "default"),
        ),
      )
      .limit(1);

    if (!row) continue;

    await db.delete(schema.entityRelations).where(eq(schema.entityRelations.fromEntityId, row.id));

    const entityNs = entity.metadata.namespace ?? "default";
    const entityRelationsForThis = relations.filter(
      (r) => r.sourceRef === `${entity.kind.toLowerCase()}:${entityNs}/${entity.metadata.name}`,
    );

    for (const rel of entityRelationsForThis) {
      await db.insert(schema.entityRelations).values({
        id: nanoid(),
        fromEntityId: row.id,
        toEntityId: rel.targetRef,
        relationshipType: rel.type,
        createdAt: now,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

/** List all catalog entities, optionally filtered by kind. */
export const listEntitiesFn = createServerFn({ method: "GET" })
  .inputValidator(v.object({ kind: v.optional(v.string()) }))
  .handler(async ({ data }) => {
    const ctx = await getPermCtx();
    requirePermission(ctx, Permission.CATALOG_READ);

    const db = getDb();
    return data.kind
      ? db.select().from(schema.catalogEntities).where(eq(schema.catalogEntities.kind, data.kind))
      : db.select().from(schema.catalogEntities);
  });

/** Get a single entity by kind/namespace/name. */
export const getEntityFn = createServerFn({ method: "GET" })
  .inputValidator(v.object({ kind: v.string(), namespace: v.string(), name: v.string() }))
  .handler(async ({ data }) => {
    const ctx = await getPermCtx();
    requirePermission(ctx, Permission.CATALOG_READ);

    const db = getDb();
    const [row] = await db
      .select()
      .from(schema.catalogEntities)
      .where(
        and(
          eq(schema.catalogEntities.kind, data.kind),
          eq(schema.catalogEntities.namespace, data.namespace),
          eq(schema.catalogEntities.name, data.name),
        ),
      )
      .limit(1);

    return row ?? null;
  });

/** Create or upsert a single entity. */
export const createEntityFn = createServerFn({ method: "POST" })
  .inputValidator(CatalogEntitySchema)
  .handler(async ({ data }) => {
    const ctx = await getPermCtx();
    requirePermission(ctx, Permission.CATALOG_WRITE);

    const db = getDb();
    const relations = deriveRelations(data);
    await upsertEntities(db, [data], relations);
    return { ok: true };
  });

/** Delete an entity by kind/namespace/name. */
export const deleteEntityFn = createServerFn({ method: "POST" })
  .inputValidator(v.object({ kind: v.string(), namespace: v.string(), name: v.string() }))
  .handler(async ({ data }) => {
    const ctx = await getPermCtx();
    requirePermission(ctx, Permission.CATALOG_WRITE);

    const db = getDb();
    await db
      .delete(schema.catalogEntities)
      .where(
        and(
          eq(schema.catalogEntities.kind, data.kind),
          eq(schema.catalogEntities.namespace, data.namespace),
          eq(schema.catalogEntities.name, data.name),
        ),
      );

    return { ok: true };
  });

/** Full-text search over name, title, and description. */
export const searchEntitiesFn = createServerFn({ method: "GET" })
  .inputValidator(v.object({ q: v.pipe(v.string(), v.minLength(1)) }))
  .handler(async ({ data }) => {
    const ctx = await getPermCtx();
    requirePermission(ctx, Permission.CATALOG_READ);

    const db = getDb();
    const term = `%${data.q}%`;
    return db
      .select()
      .from(schema.catalogEntities)
      .where(
        or(
          like(schema.catalogEntities.name, term),
          like(schema.catalogEntities.title, term),
          like(schema.catalogEntities.description, term),
        ),
      );
  });

/** Import entities from a catalog-info.yaml file path or URL. */
export const importFromYamlFn = createServerFn({ method: "POST" })
  .inputValidator(v.object({ source: v.pipe(v.string(), v.minLength(1)) }))
  .handler(async ({ data }) => {
    const ctx = await getPermCtx();
    requirePermission(ctx, Permission.CATALOG_WRITE);

    const db = getDb();
    const entities = await importFromYaml(data.source, (ents, rels) =>
      upsertEntities(db, ents, rels),
    );

    return { imported: entities.length };
  });
