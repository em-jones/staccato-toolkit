import * as v from "valibot";
import "../events/index.ts";
import { EventEnvelopeBaseSchema, type TypeToDataMap } from "../events/types.ts";

export const BaseLabels = v.record(v.string(), v.string());

export const BaseAnnotation = v.record(v.string(), v.string());

export const BaseTags = v.array(v.string());

export const BaseLinks = v.array(
  v.object({
    url: v.string(),
    title: v.string(),
    icon: v.string(),
    type: v.string(),
  }),
);

export const EntityMetadata = v.object({
  namespace: v.string(),
  name: v.string(),
  id: v.pipe(v.string(), v.uuid()),
  description: v.string(),
  labels: BaseLabels,
  annotations: BaseAnnotation,
  tags: BaseTags,
  links: BaseLinks,
});

export const BaseComponentSpec = v.object({
  type: v.union([v.literal("service"), v.literal("website"), v.literal("library")]),
  lifecycle: v.union([
    v.literal("production"),
    v.literal("development"),
    v.literal("experimental"),
  ]),
  owner: v.string(),
  system: v.string(),
});

export const ComponentEntity = v.object({
  apiVersion: v.literal("backstage.io/v1alpha1"),
  kind: v.literal("Component"),
  metadata: EntityMetadata,
  spec: BaseComponentSpec,
});

export const ApiEntity = v.object({
  apiVersion: v.literal("backstage.io/v1alpha1"),
  kind: v.literal("API"),
  metadata: EntityMetadata,
  spec: v.object({}),
});

export const ResourceEntity = v.object({
  apiVersion: v.literal("backstage.io/v1alpha1"),
  kind: v.literal("Resource"),
  metadata: EntityMetadata,
  spec: v.object({}),
});

export const SystemEntity = v.object({
  apiVersion: v.literal("backstage.io/v1alpha1"),
  kind: v.literal("System"),
  metadata: EntityMetadata,
  spec: v.object({}),
});

export const UserEntity = v.object({
  apiVersion: v.literal("backstage.io/v1alpha1"),
  kind: v.literal("User"),
  metadata: EntityMetadata,
  spec: v.object({}),
});

export const GroupEntity = v.object({
  apiVersion: v.literal("backstage.io/v1alpha1"),
  kind: v.literal("Group"),
  metadata: EntityMetadata,
  spec: v.object({}),
});

export const DomainEntity = v.object({
  apiVersion: v.literal("backstage.io/v1alpha1"),
  kind: v.literal("Domain"),
  metadata: EntityMetadata,
  spec: v.object({}),
});

export const TemplateEntity = v.object({
  apiVersion: v.literal("backstage.io/v1alpha1"),
  kind: v.literal("Template"),
  metadata: EntityMetadata,
  spec: v.object({}),
});

export const BackstageEntities = v.union([
  ComponentEntity,
  ApiEntity,
  ResourceEntity,
  SystemEntity,
  UserEntity,
  GroupEntity,
  DomainEntity,
  TemplateEntity,
]);

export type BackstageEntity = v.InferOutput<typeof BackstageEntities>;

const entityType = <T extends string>(event: T) =>
  v.object({
    ...EventEnvelopeBaseSchema.entries,
    type: v.literal(event),
    data: BackstageEntities,
  });

export const EntityCreated = entityType("platform.catalog.entity.created");
export const EntityUpdated = entityType("platform.catalog.entity.updated");
export const EntityDeleted = entityType("platform.catalog.entity.deleted");
export const EntityEvents = v.union([EntityCreated, EntityUpdated, EntityDeleted]);
export type EntityEvents = v.InferOutput<typeof EntityEvents>;
export type EntityEventMap = TypeToDataMap<EntityEvents>;
