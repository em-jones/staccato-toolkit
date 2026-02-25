import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from "vite-plus/test";
import { createTestPlatform, type TestPlatform } from "@op/platform/testing";
import { resolve } from "node:path";
import {
  deriveRelations,
  EntityKind,
  VALID_KINDS,
  type CatalogEntity,
  type EntityRelation,
} from "../src/index.ts";
import catalogPlugin, { parseYaml, importFromYaml } from "../src/server.ts";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Integration test for @op-plugin/catalog.
 *
 * Validates:
 * 1. Vite plugin pipeline (metadata extraction + type/OpenAPI generation)
 * 2. Full platform bootstrap (init → registerPlugin → start → stop)
 * 3. parseYaml() parses and validates single and multi-document YAML
 * 4. deriveRelations() extracts correct relations from entity specs
 * 5. importFromYaml() reads a file, parses, derives relations, and calls upsert
 * 6. Entities can be registered and retrieved via the upsert callback pattern
 */

const PLUGIN_ENTRY = resolve(__dirname, "../src/server.ts");

describe("catalog platform integration (full bootstrap)", () => {
  let platform: TestPlatform;

  beforeAll(async () => {
    platform = await createTestPlatform({
      plugins: [catalogPlugin],
      pluginPaths: [PLUGIN_ENTRY],
    });
  }, 15_000);

  afterAll(async () => {
    await platform.cleanup();
  });

  it("should complete platform bootstrap without errors", () => {
    expect(platform.app).toBeDefined();
    expect(platform.app.services).toBeDefined();
  });

  it("should extract plugin metadata via the vite plugin pipeline", () => {
    expect(platform.metadata).toHaveLength(1);
    expect(platform.metadata[0].name).toBe("catalog");
  });

  it("should generate TypeScript types file", () => {
    expect(platform.generatedTypes).toContain("catalog");
  });

  it("should generate OpenAPI spec", () => {
    expect(platform.generatedOpenAPI).toContain("catalog");
  });
});

describe("catalog YAML parsing and validation", () => {
  it("should parse a single YAML document into a validated entity", () => {
    const yaml = `
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-api
  description: My API component
spec:
  type: api
  owner: team-alpha
`;

    const entities = parseYaml(yaml);
    expect(entities).toHaveLength(1);
    expect(entities[0].kind).toBe("Component");
    expect(entities[0].metadata.name).toBe("my-api");
    expect(entities[0].metadata.description).toBe("My API component");
  });

  it("should parse multi-document YAML with --- separators", () => {
    const yaml = `
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: frontend
spec:
  type: website
  owner: team-web
---
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: backend-api
spec:
  type: openapi
  owner: team-api
`;

    const entities = parseYaml(yaml);
    expect(entities).toHaveLength(2);
    expect(entities[0].kind).toBe("Component");
    expect(entities[0].metadata.name).toBe("frontend");
    expect(entities[1].kind).toBe("API");
    expect(entities[1].metadata.name).toBe("backend-api");
  });

  it("should reject documents with invalid kind", () => {
    const yaml = `
apiVersion: backstage.io/v1alpha1
kind: InvalidKind
metadata:
  name: bad-entity
`;

    expect(() => parseYaml(yaml)).toThrow("Invalid entity document");
  });

  it("should reject documents missing required name", () => {
    const yaml = `
apiVersion: backstage.io/v1alpha1
kind: Component
metadata: {}
`;

    expect(() => parseYaml(yaml)).toThrow();
  });

  it("should skip non-object YAML documents", () => {
    const yaml = `
---
just a string
---
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: valid-component
`;

    const entities = parseYaml(yaml);
    expect(entities).toHaveLength(1);
    expect(entities[0].metadata.name).toBe("valid-component");
  });
});

describe("catalog relation derivation", () => {
  it("should derive ownedBy relation from spec.owner", () => {
    const entity: CatalogEntity = {
      apiVersion: "backstage.io/v1alpha1",
      kind: "Component",
      metadata: { name: "my-service", namespace: "default" },
      spec: { owner: "group:default/engineering" },
    };

    const relations = deriveRelations(entity);
    expect(relations).toHaveLength(1);
    expect(relations[0]).toEqual({
      type: "ownedBy",
      sourceRef: "component:default/my-service",
      targetRef: "group:default/engineering",
    });
  });

  it("should derive partOf relation from spec.system", () => {
    const entity: CatalogEntity = {
      apiVersion: "backstage.io/v1alpha1",
      kind: "Component",
      metadata: { name: "auth-service", namespace: "default" },
      spec: { system: "auth-platform" },
    };

    const relations = deriveRelations(entity);
    expect(relations).toHaveLength(1);
    expect(relations[0].type).toBe("partOf");
    expect(relations[0].targetRef).toBe("auth-platform");
  });

  it("should derive dependsOn relations from array", () => {
    const entity: CatalogEntity = {
      apiVersion: "backstage.io/v1alpha1",
      kind: "Component",
      metadata: { name: "web-app", namespace: "default" },
      spec: { dependsOn: ["component:default/api", "component:default/auth"] },
    };

    const relations = deriveRelations(entity);
    expect(relations).toHaveLength(2);
    expect(relations[0].targetRef).toBe("component:default/api");
    expect(relations[1].targetRef).toBe("component:default/auth");
  });

  it("should derive multiple relation types from a single entity", () => {
    const entity: CatalogEntity = {
      apiVersion: "backstage.io/v1alpha1",
      kind: "Component",
      metadata: { name: "full-service", namespace: "default" },
      spec: {
        owner: "group:default/platform",
        system: "platform-services",
        dependsOn: ["component:default/db"],
        providesApis: ["api:default/platform-api"],
      },
    };

    const relations = deriveRelations(entity);
    expect(relations).toHaveLength(4);
    const types = relations.map((r) => r.type);
    expect(types).toContain("ownedBy");
    expect(types).toContain("partOf");
    expect(types).toContain("dependsOn");
    expect(types).toContain("providesApi");
  });

  it("should return empty relations for entity with empty spec", () => {
    const entity: CatalogEntity = {
      apiVersion: "backstage.io/v1alpha1",
      kind: "Component",
      metadata: { name: "standalone", namespace: "default" },
      spec: {},
    };

    const relations = deriveRelations(entity);
    expect(relations).toHaveLength(0);
  });
});

describe("catalog import from YAML file", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp("/tmp/openport-catalog-import-");
  });

  afterEach(async () => {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("should import entities from a YAML file and call upsert", async () => {
    const yamlPath = join(tmpDir, "catalog-info.yaml");
    await writeFile(
      yamlPath,
      `apiVersion: backstage.io/v1alpha1
kind: System
metadata:
  name: my-system
  description: My test system
spec:
  owner: team-alpha
`,
    );

    const upserted: { entities: CatalogEntity[]; relations: EntityRelation[] } = {
      entities: [],
      relations: [],
    };

    const entities = await importFromYaml(yamlPath, async (ents, rels) => {
      upserted.entities = ents;
      upserted.relations = rels;
    });

    expect(entities).toHaveLength(1);
    expect(upserted.entities).toHaveLength(1);
    expect(upserted.entities[0].kind).toBe("System");
    expect(upserted.entities[0].metadata.name).toBe("my-system");
    expect(upserted.relations).toHaveLength(1);
    expect(upserted.relations[0].type).toBe("ownedBy");
  });

  it("should import multi-document YAML with multiple entities", async () => {
    const yamlPath = join(tmpDir, "multi-entity.yaml");
    await writeFile(
      yamlPath,
      `apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: frontend
  namespace: default
spec:
  type: website
  owner: team-web
  system: web-platform
---
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: user-api
  namespace: default
spec:
  type: openapi
  owner: team-api
`,
    );

    const upserted: { entities: CatalogEntity[]; relations: EntityRelation[] } = {
      entities: [],
      relations: [],
    };

    const entities = await importFromYaml(yamlPath, async (ents, rels) => {
      upserted.entities = ents;
      upserted.relations = rels;
    });

    expect(entities).toHaveLength(2);
    expect(upserted.entities).toHaveLength(2);
    expect(upserted.relations.length).toBeGreaterThanOrEqual(2);
  });
});

describe("EntityKind completeness", () => {
  it("should have all expected entity kinds", () => {
    expect(EntityKind.Component).toBe("Component");
    expect(EntityKind.API).toBe("API");
    expect(EntityKind.Resource).toBe("Resource");
    expect(EntityKind.System).toBe("System");
    expect(EntityKind.Domain).toBe("Domain");
    expect(EntityKind.User).toBe("User");
    expect(EntityKind.Group).toBe("Group");
    expect(EntityKind.Location).toBe("Location");
  });

  it("should have VALID_KINDS matching EntityKind values", () => {
    expect(VALID_KINDS).toContain("Component");
    expect(VALID_KINDS).toContain("API");
    expect(VALID_KINDS).toContain("Resource");
    expect(VALID_KINDS).toContain("System");
    expect(VALID_KINDS).toContain("Domain");
    expect(VALID_KINDS).toContain("User");
    expect(VALID_KINDS).toContain("Group");
    expect(VALID_KINDS).toContain("Location");
  });
});
