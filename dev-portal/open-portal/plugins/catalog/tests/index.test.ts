import { expect, test } from "vite-plus/test";
import * as v from "valibot";

import { CatalogEntitySchema, EntityKind, deriveRelations } from "../src/index.ts";
import { parseYaml } from "../src/server.ts";

// ---------------------------------------------------------------------------
// EntityKind
// ---------------------------------------------------------------------------

test("EntityKind has all 8 Backstage entity kinds", () => {
  const kinds = Object.values(EntityKind);
  expect(kinds).toHaveLength(8);
  for (const k of [
    "Component",
    "API",
    "Resource",
    "System",
    "Domain",
    "User",
    "Group",
    "Location",
  ]) {
    expect(kinds).toContain(k);
  }
});

// ---------------------------------------------------------------------------
// parseYaml — single document
// ---------------------------------------------------------------------------

test("parseYaml: parses a valid single-document YAML", () => {
  const yaml = `
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-service
  namespace: default
spec:
  type: service
  owner: group:default/platform-team
`;
  const entities = parseYaml(yaml);
  expect(entities).toHaveLength(1);
  expect(entities[0]!.kind).toBe("Component");
  expect(entities[0]!.metadata.name).toBe("my-service");
});

// ---------------------------------------------------------------------------
// parseYaml — multi-document
// ---------------------------------------------------------------------------

test("parseYaml: parses multi-document YAML separated by ---", () => {
  const yaml = `
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: svc-a
spec:
  type: service
---
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: api-a
spec:
  type: openapi
---
apiVersion: backstage.io/v1alpha1
kind: System
metadata:
  name: sys-a
`;
  const entities = parseYaml(yaml);
  expect(entities).toHaveLength(3);
  expect(entities.map((e) => e.kind)).toEqual(["Component", "API", "System"]);
});

// ---------------------------------------------------------------------------
// parseYaml — validation errors
// ---------------------------------------------------------------------------

test("parseYaml: rejects entity with unknown kind", () => {
  const yaml = `
apiVersion: backstage.io/v1alpha1
kind: Potato
metadata:
  name: weird
`;
  expect(() => parseYaml(yaml)).toThrow(/Invalid entity document/);
});

test("parseYaml: rejects malformed YAML", () => {
  const yaml = `
kind: [unclosed bracket
metadata:
  name: bad
`;
  expect(() => parseYaml(yaml)).toThrow();
});

test("parseYaml: rejects entity missing metadata.name", () => {
  const yaml = `
kind: Component
metadata:
  namespace: default
`;
  expect(() => parseYaml(yaml)).toThrow();
});

// ---------------------------------------------------------------------------
// deriveRelations
// ---------------------------------------------------------------------------

test("deriveRelations: derives ownedBy from spec.owner", () => {
  const entity = v.parse(CatalogEntitySchema, {
    kind: "Component",
    metadata: { name: "my-svc", namespace: "default" },
    spec: { owner: "group:default/platform-team" },
  });
  const relations = deriveRelations(entity);
  expect(relations).toContainEqual({
    type: "ownedBy",
    sourceRef: "component:default/my-svc",
    targetRef: "group:default/platform-team",
  });
});

test("deriveRelations: derives partOf from spec.system", () => {
  const entity = v.parse(CatalogEntitySchema, {
    kind: "Component",
    metadata: { name: "my-svc" },
    spec: { system: "system:default/platform" },
  });
  const relations = deriveRelations(entity);
  expect(relations).toContainEqual({
    type: "partOf",
    sourceRef: "component:default/my-svc",
    targetRef: "system:default/platform",
  });
});

test("deriveRelations: handles array spec fields (dependsOn)", () => {
  const entity = v.parse(CatalogEntitySchema, {
    kind: "Component",
    metadata: { name: "my-svc" },
    spec: { dependsOn: ["component:default/other-svc", "resource:default/db"] },
  });
  const relations = deriveRelations(entity);
  expect(relations).toHaveLength(2);
  expect(relations.map((r) => r.targetRef)).toEqual([
    "component:default/other-svc",
    "resource:default/db",
  ]);
});

test("deriveRelations: returns empty array for entity with no spec relations", () => {
  const entity = v.parse(CatalogEntitySchema, {
    kind: "System",
    metadata: { name: "empty-sys" },
  });
  expect(deriveRelations(entity)).toHaveLength(0);
});
