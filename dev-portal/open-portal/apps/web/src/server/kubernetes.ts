import { Permission, requirePermission } from "@op-plugin/auth-core/permissions";
import { createKubernetesClient } from "@op-plugin/runtime-k8s";
import { createServerFn } from "@tanstack/solid-start";
import { getRequest } from "@tanstack/solid-start/server";
import * as v from "valibot";

import { auth } from "../lib/auth";

const SUPPORTED_KINDS = ["Deployment", "Service", "Pod", "ReplicaSet"] as const;

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

function getClient() {
  return createKubernetesClient();
}

/** List all resources of a supported kind, optionally filtered by namespace. */
export const listK8sResourcesFn = createServerFn({ method: "GET" })
  .inputValidator(
    v.object({
      kind: v.picklist(SUPPORTED_KINDS),
      namespace: v.optional(v.string()),
      labelSelector: v.optional(v.string()),
    }),
  )
  .handler(async ({ data }) => {
    const ctx = await getPermCtx();
    requirePermission(ctx, Permission.CATALOG_READ);

    const client = getClient();
    const resources = await client.listResources(data.kind, {
      namespace: data.namespace,
      labelSelector: data.labelSelector,
    });

    return resources.map((r) => ({
      name: r.metadata.name,
      namespace: r.metadata.namespace ?? "default",
      kind: r.kind,
      apiVersion: r.apiVersion,
      labels: r.metadata.labels ?? {},
      creationTimestamp: r.metadata.creationTimestamp,
      status: r.status as Record<string, string> | undefined,
      spec: r.spec as Record<string, string> | undefined,
      catalogEntity: r.metadata.labels?.["staccato.io/catalog-entity"],
      catalogKind: r.metadata.labels?.["staccato.io/catalog-kind"],
    }));
  });

/** Get a single resource by kind/name/namespace. */
export const getK8sResourceFn = createServerFn({ method: "GET" })
  .inputValidator(
    v.object({
      kind: v.picklist(SUPPORTED_KINDS),
      name: v.pipe(v.string(), v.minLength(1)),
      namespace: v.optional(v.string()),
    }),
  )
  .handler(async ({ data }) => {
    const ctx = await getPermCtx();
    requirePermission(ctx, Permission.CATALOG_READ);

    const client = getClient();
    const resource = await client.getResource(data.kind, data.name, data.namespace);

    return {
      name: resource.metadata.name,
      namespace: resource.metadata.namespace ?? "default",
      kind: resource.kind,
      apiVersion: resource.apiVersion,
      labels: resource.metadata.labels ?? {},
      annotations: resource.metadata.annotations ?? {},
      creationTimestamp: resource.metadata.creationTimestamp,
      status: resource.status as Record<string, string> | undefined,
      spec: resource.spec as Record<string, string> | undefined,
      catalogEntity: resource.metadata.labels?.["staccato.io/catalog-entity"],
      catalogKind: resource.metadata.labels?.["staccato.io/catalog-kind"],
    };
  });

/** List resources for a specific catalog entity (by name label). */
export const listK8sResourcesForEntityFn = createServerFn({ method: "GET" })
  .inputValidator(v.object({ entityName: v.pipe(v.string(), v.minLength(1)) }))
  .handler(async ({ data }) => {
    const ctx = await getPermCtx();
    requirePermission(ctx, Permission.CATALOG_READ);

    const client = getClient();
    const selector = `staccato.io/catalog-entity=${data.entityName}`;

    const results = await Promise.all(
      SUPPORTED_KINDS.map((kind) =>
        client
          .listResources(kind, { labelSelector: selector })
          .then((resources) =>
            resources.map((r) => ({
              name: r.metadata.name,
              namespace: r.metadata.namespace ?? "default",
              kind: r.kind,
              apiVersion: r.apiVersion,
              labels: r.metadata.labels ?? {},
              status: r.status as Record<string, string> | undefined,
              catalogEntity: r.metadata.labels?.["staccato.io/catalog-entity"],
              catalogKind: r.metadata.labels?.["staccato.io/catalog-kind"],
            })),
          )
          .catch(() => []),
      ),
    );

    return results.flat();
  });

export { SUPPORTED_KINDS };
