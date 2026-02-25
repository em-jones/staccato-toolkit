import { describe, it, expect, beforeAll, afterAll } from "vite-plus/test";
import { createTestPlatform, type TestPlatform } from "@op/platform/testing";
import { resolve } from "node:path";
// Import plugin directly from source since @op-plugin/* alias isn't configured
import duckIamPlugin from "../src/index.ts";
import {
  createAuthorizationService,
} from "../src/index.ts";

/**
 * Integration test for @op-plugin/authorization-duck-iam.
 *
 * Validates:
 * 1. Vite plugin pipeline (metadata extraction + type/OpenAPI generation)
 * 2. Full platform bootstrap (init → registerPlugin → start → stop) works
 *    with the duck-iam plugin, exercising the Awilix DI lifecycle
 * 3. The real @gentleduck/iam engine works correctly for role/policy/auth
 */

const PLUGIN_ENTRY = resolve(__dirname, "../src/index.ts");

describe("authorization-duck-iam platform integration (full bootstrap)", () => {
  let platform: TestPlatform;

  beforeAll(async () => {
    platform = await createTestPlatform({
      plugins: [duckIamPlugin],
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
    expect(platform.metadata[0].name).toBe("authorization-duck-iam");
  });

  it("should generate TypeScript types file", () => {
    expect(platform.generatedTypes).toContain("authorization-duck-iam");
  });

  it("should generate OpenAPI spec", () => {
    expect(platform.generatedOpenAPI).toContain("authorization-duck-iam");
  });

  it("should have configService available in the DI container", () => {
    const configService = platform.app.services.get("configService");
    expect(configService).toBeDefined();
  });
});

describe("authorization-duck-iam service integration with real engine", () => {
  it("should create authorization services with real duck-iam engine", () => {
    const services = createAuthorizationService();

    expect(services.roleAPI).toBeDefined();
    expect(services.policyAPI).toBeDefined();
    expect(services.authorizationService).toBeDefined();
  });

  it("should create a role with permissions", async () => {
    const { roleAPI } = createAuthorizationService();

    const role = await roleAPI.createRole({
      name: "test-editor",
      description: "A test editor role",
      permissions: [
        { resource: "post", actions: ["create", "read", "update"] },
        { resource: "comment", actions: ["create", "read"] },
      ],
    });

    expect(role.id).toBeDefined();
    expect(role.name).toBe("test-editor");
    expect(role.description).toBe("A test editor role");
    expect(role.permissions).toHaveLength(2);
  });

  it("should assign and revoke roles for users", async () => {
    const { roleAPI } = createAuthorizationService();

    const role = await roleAPI.createRole({
      name: "editor",
      description: "Editor role",
      permissions: [{ resource: "post", actions: ["create", "read", "update"] }],
    });

    await roleAPI.assignRole("user-123", role.id);
    const userRoles = await roleAPI.getRolesForUser("user-123");
    expect(userRoles).toHaveLength(1);
    expect(userRoles[0].id).toBe(role.id);

    await roleAPI.revokeRole("user-123", role.id);
    const revokedRoles = await roleAPI.getRolesForUser("user-123");
    expect(revokedRoles).toHaveLength(0);
  });

  it("should support scoped role assignments", async () => {
    const { roleAPI } = createAuthorizationService();

    const role = await roleAPI.createRole({
      name: "moderator",
      description: "Moderator role",
      permissions: [{ resource: "comment", actions: ["delete", "read"] }],
    });

    await roleAPI.assignRole("user-456", role.id, "org-abc");

    const scopedRoles = await roleAPI.getRolesForUser("user-456", "org-abc");
    expect(scopedRoles).toHaveLength(1);

    const unscopedRoles = await roleAPI.getRolesForUser("user-456");
    expect(unscopedRoles).toHaveLength(0);
  });

  it("should create and list policies", async () => {
    const { policyAPI } = createAuthorizationService();

    const policy = await policyAPI.createPolicy({
      name: "deny-external-posts",
      description: "Deny external users from creating posts",
      rules: [{ effect: "deny", action: "create", resource: "post" }],
      algorithm: "deny-overrides",
    });

    expect(policy.id).toBeDefined();
    expect(policy.name).toBe("deny-external-posts");

    const policies = await policyAPI.listPolicies();
    expect(policies.length).toBeGreaterThanOrEqual(1);
  });

  it("should update and delete policies", async () => {
    const { policyAPI } = createAuthorizationService();

    const policy = await policyAPI.createPolicy({
      name: "test-policy",
      description: "Original description",
      rules: [],
      algorithm: "deny-overrides",
    });

    const updated = await policyAPI.updatePolicy(policy.id, { description: "Updated description" });
    expect(updated.description).toBe("Updated description");

    await policyAPI.deletePolicy(policy.id);
    const deleted = await policyAPI.getPolicy(policy.id);
    expect(deleted).toBeNull();
  });

  it("should check effective permissions from role assignments", async () => {
    const { roleAPI, authorizationService } = createAuthorizationService();

    const role = await roleAPI.createRole({
      name: "admin",
      description: "Admin role",
      permissions: [
        { resource: "post", actions: ["create", "read", "update", "delete"] },
        { resource: "user", actions: ["read", "update"] },
      ],
    });

    await roleAPI.assignRole("admin-user", role.id);
    const perms = await authorizationService.getEffectivePermissions("admin-user");

    expect(perms["post"]).toContain("create");
    expect(perms["post"]).toContain("delete");
    expect(perms["user"]).toContain("read");
  });

  it("should deny access when user has no role", async () => {
    const { authorizationService } = createAuthorizationService();

    const result = await authorizationService.userCan({
      userId: "nobody",
      action: "delete",
      resource: "post",
    });

    expect(result).toBe(false);
  });

  it("should batch check permissions", async () => {
    const { roleAPI, authorizationService } = createAuthorizationService();

    const role = await roleAPI.createRole({
      name: "viewer",
      description: "Viewer role",
      permissions: [
        { resource: "post", actions: ["read"] },
        { resource: "comment", actions: ["read"] },
      ],
    });

    await roleAPI.assignRole("viewer-user", role.id);

    const checks = await authorizationService.checkPermissions("viewer-user", [
      { action: "read", resource: "post" },
      { action: "create", resource: "post" },
      { action: "read", resource: "comment" },
      { action: "delete", resource: "comment" },
    ]);

    const results = Object.fromEntries(checks.map((c) => [`${c.resource}:${c.action}`, c.allowed]));
    expect(results["post:read"]).toBe(true);
    expect(results["post:create"]).toBe(false);
    expect(results["comment:read"]).toBe(true);
    expect(results["comment:delete"]).toBe(false);
  });
});
