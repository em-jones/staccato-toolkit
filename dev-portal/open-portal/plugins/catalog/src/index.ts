import * as v from "valibot";

// ---------------------------------------------------------------------------
// Entity kinds
// ---------------------------------------------------------------------------

export const EntityKind = {
  Component: "Component",
  API: "API",
  Resource: "Resource",
  System: "System",
  Domain: "Domain",
  User: "User",
  Group: "Group",
  Location: "Location",
} as const;

export type EntityKind = (typeof EntityKind)[keyof typeof EntityKind];

export const VALID_KINDS = Object.values(EntityKind) as [string, ...string[]];

// ---------------------------------------------------------------------------
// Valibot schemas
// ---------------------------------------------------------------------------

const EntityMetaSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1)),
  namespace: v.optional(v.string(), "default"),
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  labels: v.optional(v.record(v.string(), v.string())),
  annotations: v.optional(v.record(v.string(), v.string())),
  tags: v.optional(v.array(v.string())),
  uid: v.optional(v.string()),
});

export const CatalogEntitySchema = v.object({
  apiVersion: v.optional(v.string(), "backstage.io/v1alpha1"),
  kind: v.picklist([
    "Component",
    "API",
    "Resource",
    "System",
    "Domain",
    "User",
    "Group",
    "Location",
  ]),
  metadata: EntityMetaSchema,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spec: v.optional(v.record(v.string(), v.any())),
});

export type CatalogEntity = v.InferOutput<typeof CatalogEntitySchema>;
export type EntityMeta = v.InferOutput<typeof EntityMetaSchema>;

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export interface EntityRelation {
  /** Relation type, e.g. "ownedBy", "partOf", "dependsOn" */
  type: string;
  /** Canonical ref of the source entity: "kind:namespace/name" */
  sourceRef: string;
  /** Target entity ref as written in spec (may be shorthand or canonical) */
  targetRef: string;
}

/** Spec fields that imply entity relations and their relation types. */
const SPEC_RELATION_MAP: Record<string, string> = {
  owner: "ownedBy",
  system: "partOf",
  subcomponentOf: "partOf",
  dependsOn: "dependsOn",
  providesApis: "providesApi",
  consumesApis: "consumesApi",
  memberOf: "memberOf",
  members: "hasMember",
  parent: "childOf",
};

function canonicalRef(entity: CatalogEntity): string {
  const ns = entity.metadata.namespace ?? "default";
  return `${entity.kind.toLowerCase()}:${ns}/${entity.metadata.name}`;
}

/**
 * Derives `EntityRelation` objects from an entity's spec fields.
 * Called on every upsert so the relation table stays in sync.
 */
export function deriveRelations(entity: CatalogEntity): EntityRelation[] {
  const spec = entity.spec ?? {};
  const source = canonicalRef(entity);
  const relations: EntityRelation[] = [];

  for (const [field, relType] of Object.entries(SPEC_RELATION_MAP)) {
    const val = spec[field];
    if (val == null) continue;
    const targets = Array.isArray(val) ? val : [val];
    for (const target of targets) {
      if (typeof target === "string") {
        relations.push({ type: relType, sourceRef: source, targetRef: target });
      }
    }
  }

  return relations;
}

// ---------------------------------------------------------------------------
// Upsert callback type
// ---------------------------------------------------------------------------

/**
 * Callback signature for persisting parsed entities and their derived
 * relations. The caller (typically a TanStack Start server function) supplies
 * this to keep the catalog plugin decoupled from the database layer.
 */
export type UpsertFn = (entities: CatalogEntity[], relations: EntityRelation[]) => Promise<void>;
