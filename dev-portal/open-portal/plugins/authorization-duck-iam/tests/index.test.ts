import { describe, it, expect, beforeEach } from "vitest";

import { createAuthorizationService } from "../src/index";

import type { Role as CoreRole } from "@op-plugin/auth-core";

describe("@op-plugin/authorization-duck-iam", () => {
  let roleAPI: ReturnType<typeof createAuthorizationService>["roleAPI"];
  let policyAPI: ReturnType<typeof createAuthorizationService>["policyAPI"];
  let authService: ReturnType<typeof createAuthorizationService>["authorizationService"];

  beforeEach(() => {
    const service = createAuthorizationService({
      adapter: "memory",
    });
    roleAPI = service.roleAPI;
    policyAPI = service.policyAPI;
    authService = service.authorizationService;
  });

  describe("RoleAPI", () => {
    it("should create a role with inheritance", async () => {
      const editor: CoreRole = {
        id: "editor",
        name: "Editor",
        permissions: [
          {
            resource: "post",
            actions: ["create", "update"],
          },
        ],
        inherits: ["viewer"],
      };

      const createdEditor = await roleAPI.createRole({
        name: editor.name,
        permissions: editor.permissions,
        inherits: editor.inherits,
      });

      expect(createdEditor).toBeDefined();
      expect(createdEditor.name).toBe("Editor");
      expect(createdEditor.inherits).toEqual(["viewer"]);
    });

    it("should assign and revoke scoped roles", async () => {
      const role = await roleAPI.createRole({
        name: "Admin",
        permissions: [
          {
            resource: "post",
            actions: ["create", "read", "update", "delete"],
          },
        ],
      });

      await roleAPI.assignRole("user-1", role.id, "org-acme");
      const roles = await roleAPI.getRolesForUser("user-1", "org-acme");

      expect(roles.length).toBeGreaterThan(0);
      expect(roles.some((r: CoreRole) => r.id === role.id)).toBe(true);

      await roleAPI.revokeRole("user-1", role.id, "org-acme");
      const afterRevoke = await roleAPI.getRolesForUser("user-1", "org-acme");
      expect(afterRevoke.some((r: CoreRole) => r.id === role.id)).toBe(false);
    });

    it("should get role by ID", async () => {
      const created = await roleAPI.createRole({
        name: "Test Role",
        permissions: [
          {
            resource: "post",
            actions: ["read"],
          },
        ],
      });

      const fetched = await roleAPI.getRole(created.id);
      expect(fetched).toBeDefined();
      expect(fetched?.name).toBe("Test Role");
    });

    it("should update a role", async () => {
      const role = await roleAPI.createRole({
        name: "Original",
        permissions: [],
      });

      const updated = await roleAPI.updateRole(role.id, {
        name: "Updated",
      });

      expect(updated.name).toBe("Updated");
    });

    it("should delete a role", async () => {
      const role = await roleAPI.createRole({
        name: "Temporary",
        permissions: [],
      });

      await roleAPI.deleteRole(role.id);
      const fetched = await roleAPI.getRole(role.id);
      expect(fetched).toBeNull();
    });
  });

  describe("PolicyAPI", () => {
    it("should create a deny-overrides policy", async () => {
      const policy = await policyAPI.createPolicy({
        name: "Owner Only",
        algorithm: "deny-overrides",
        rules: [
          {
            effect: "deny",
            actions: ["delete"],
            resources: ["post"],
            conditions: { isOwner: false },
            priority: 10,
          },
        ],
      });

      expect(policy).toBeDefined();
      expect(policy.name).toBe("Owner Only");
      expect(policy.algorithm).toBe("deny-overrides");
      expect(policy.rules.length).toBe(1);
      expect(policy.rules[0].effect).toBe("deny");
    });

    it("should list all policies", async () => {
      await policyAPI.createPolicy({
        name: "Policy 1",
        algorithm: "allow-overrides",
        rules: [],
      });

      await policyAPI.createPolicy({
        name: "Policy 2",
        algorithm: "deny-overrides",
        rules: [],
      });

      const policies = await policyAPI.listPolicies();
      expect(policies.length).toBeGreaterThanOrEqual(2);
    });

    it("should get a policy by ID", async () => {
      const created = await policyAPI.createPolicy({
        name: "Test Policy",
        algorithm: "first-match",
        rules: [
          {
            effect: "allow",
            actions: ["read"],
            resources: ["post"],
          },
        ],
      });

      const fetched = await policyAPI.getPolicy(created.id);
      expect(fetched).toBeDefined();
      expect(fetched?.name).toBe("Test Policy");
    });

    it("should update a policy", async () => {
      const policy = await policyAPI.createPolicy({
        name: "Original",
        algorithm: "allow-overrides",
        rules: [],
      });

      const updated = await policyAPI.updatePolicy(policy.id, {
        name: "Updated",
      });

      expect(updated.name).toBe("Updated");
    });

    it("should delete a policy", async () => {
      const policy = await policyAPI.createPolicy({
        name: "Temporary",
        algorithm: "deny-overrides",
        rules: [],
      });

      await policyAPI.deletePolicy(policy.id);
      const fetched = await policyAPI.getPolicy(policy.id);
      expect(fetched).toBeNull();
    });
  });

  describe("AuthorizationService", () => {
    it("should check user permissions", async () => {
      const allowed = await authService.userCan({
        userId: "user-1",
        action: "read",
        resource: "post",
      });

      expect(typeof allowed).toBe("boolean");
    });

    it("should batch check permissions", async () => {
      const results = await authService.checkPermissions("user-1", [
        { action: "read", resource: "post" },
        { action: "delete", resource: "post" },
      ]);

      expect(results.length).toBe(2);
      expect(results[0]).toHaveProperty("allowed");
      expect(results[0]).toHaveProperty("action");
      expect(results[0]).toHaveProperty("resource");
    });

    it("should get effective permissions for user with scoped roles", async () => {
      const role = await roleAPI.createRole({
        name: "Editor",
        permissions: [
          {
            resource: "post",
            actions: ["create", "read", "update"],
          },
          {
            resource: "comment",
            actions: ["create", "delete"],
          },
        ],
      });

      await roleAPI.assignRole("alice", role.id, "org-1");

      const perms = await authService.getEffectivePermissions("alice", "org-1");

      expect(perms).toBeDefined();
      // Verify structure is correct
      expect(typeof perms).toBe("object");
    });

    it("should handle ABAC conditions in permission checks", async () => {
      const result = await authService.userCan({
        userId: "user-2",
        action: "update",
        resource: "post",
        context: { ownerId: "user-1" },
      });

      expect(typeof result).toBe("boolean");
    });
  });

  describe("Multi-tenant scoped role assignments", () => {
    it("should support different roles per organization", async () => {
      const adminRole = await roleAPI.createRole({
        name: "Admin",
        permissions: [
          {
            resource: "organization",
            actions: ["manage"],
          },
        ],
      });

      const viewerRole = await roleAPI.createRole({
        name: "Viewer",
        permissions: [
          {
            resource: "post",
            actions: ["read"],
          },
        ],
      });

      // Alice is admin in org-1
      await roleAPI.assignRole("alice", adminRole.id, "org-1");

      // Alice is viewer in org-2
      await roleAPI.assignRole("alice", viewerRole.id, "org-2");

      // Get effective permissions in each scope
      const perms1 = await authService.getEffectivePermissions("alice", "org-1");
      const perms2 = await authService.getEffectivePermissions("alice", "org-2");

      expect(perms1).toBeDefined();
      expect(perms2).toBeDefined();
      // They should be different
      expect(perms1).not.toEqual(perms2);
    });
  });
});
