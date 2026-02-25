import { expect, test, describe, beforeEach } from "vite-plus/test";
import {
  initializeBetterAuth,
  createBetterAuthAdapter,
  createOrganizationManagement,
} from "../src/index.ts";
import type { RoleAPI, Role } from "@op-plugin/auth-core";

describe("Better Auth Plugin", () => {
  describe("initializeBetterAuth", () => {
    test("throws error when databaseUrl is missing", () => {
      // Clear env vars
      delete process.env.AUTH_DATABASE_URL;
      delete process.env.AUTH_SECRET;

      expect(() => {
        initializeBetterAuth({
          secret: "test-secret",
        });
      }).toThrow("Missing required AUTH_DATABASE_URL");
    });

    test("throws error when secret is missing", () => {
      // Clear env vars
      delete process.env.AUTH_DATABASE_URL;
      delete process.env.AUTH_SECRET;

      expect(() => {
        initializeBetterAuth({
          databaseUrl: "postgres://localhost/test",
        });
      }).toThrow("Missing required AUTH_SECRET");
    });

    test("initializes with provided config and memory adapter", () => {
      const config = {
        databaseType: "memory" as const,
        secret: "test-secret",
        baseUrl: "http://localhost:3000",
      };

      const instance = initializeBetterAuth(config);
      expect(instance).toBeDefined();
      expect(instance.auth).toBeDefined();
    });

    test("uses environment variables when config is not provided", () => {
      process.env.AUTH_DATABASE_URL = "postgres://env-db/test";
      process.env.AUTH_SECRET = "env-secret";

      const instance = initializeBetterAuth();
      expect(instance).toBeDefined();
      expect(instance.auth).toBeDefined();
    });

    test("uses default baseUrl when not provided", () => {
      const instance = initializeBetterAuth({
        databaseType: "memory",
        secret: "test-secret",
      });

      expect(instance).toBeDefined();
      expect(instance.auth).toBeDefined();
    });
  });

  describe("createBetterAuthAdapter", () => {
    test("returns an AuthAPI implementation", () => {
      const instance = initializeBetterAuth({
        databaseType: "memory",
        secret: "test-secret",
      });
      }).toThrow("Missing required AUTH_SECRET");
    });

    test("initializes with provided config and memory adapter", () => {
      const config = {
        databaseType: "memory" as const,
        secret: "test-secret",
        baseUrl: "http://localhost:3000",
      };

      const instance = initializeBetterAuth(config);
      expect(instance).toBeDefined();
      expect(instance.auth).toBeDefined();
    });

    test("uses environment variables when config is not provided", () => {
      process.env.AUTH_DATABASE_URL = "postgres://env-db/test";
      process.env.AUTH_SECRET = "env-secret";

      const instance = initializeBetterAuth();
      expect(instance).toBeDefined();
      expect(instance.auth).toBeDefined();
    });

    test("uses default baseUrl when not provided", () => {
      const instance = initializeBetterAuth({
        databaseType: "memory",
        secret: "test-secret",
      });

      expect(instance).toBeDefined();
      expect(instance.auth).toBeDefined();
    });
  });

  describe("createBetterAuthAdapter", () => {
    test("returns an AuthAPI implementation", () => {
      const instance = initializeBetterAuth({
        databaseType: "memory",
        secret: "test-secret",
      });

      const adapter = createBetterAuthAdapter(instance);

      // Check that all required methods exist
      expect(typeof adapter.createUser).toBe("function");
      expect(typeof adapter.getUser).toBe("function");
      expect(typeof adapter.updateUser).toBe("function");
      expect(typeof adapter.deleteUser).toBe("function");
      expect(typeof adapter.getOrganizations).toBe("function");
      expect(typeof adapter.getOrganization).toBe("function");
      expect(typeof adapter.createOrganization).toBe("function");
      expect(typeof adapter.updateOrganization).toBe("function");
      expect(typeof adapter.mapProviderUserToCoreUser).toBe("function");
    });

    test("mapProviderUserToCoreUser maps better-auth user to core User", async () => {
      const instance = initializeBetterAuth({
        databaseType: "memory",
        secret: "test-secret",
      });

      const adapter = createBetterAuthAdapter(instance);

      const mockProviderUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
      };

      const coreUser = await adapter.mapProviderUserToCoreUser(mockProviderUser);

      expect(coreUser.id).toBe("user-123");
      expect(coreUser.email).toBe("test@example.com");
      expect(coreUser.name).toBe("Test User");
      expect(coreUser.role).toBe("user");
    });

    test("mapProviderUserToCoreUser includes role from RoleAPI", async () => {
      const instance = initializeBetterAuth({
        databaseType: "memory",
        secret: "test-secret",
      });

      const mockRoleApi: RoleAPI = {
        getRolesForOrg: async () => [],
        getRole: async () => null,
        createRole: async () => ({
          id: "role-1",
          name: "admin",
          permissions: [],
        }),
        updateRole: async () => ({
          id: "role-1",
          name: "admin",
          permissions: [],
        }),
        deleteRole: async () => {},
        assignRole: async () => {},
        revokeRole: async () => {},
        getRolesForUser: async (userId: string) => [
          {
            id: "role-1",
            name: "admin",
            permissions: [],
          },
        ],
      };

      const adapter = createBetterAuthAdapter(instance, mockRoleApi);

      const mockProviderUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
      };

      const coreUser = await adapter.mapProviderUserToCoreUser(mockProviderUser);

      expect(coreUser.id).toBe("user-123");
      expect(coreUser.email).toBe("test@example.com");
      expect(coreUser.name).toBe("Test User");
      expect(coreUser.role).toBe("admin");
    });

    test("mapProviderUserToCoreUser accepts override RoleAPI", async () => {
      const instance = initializeBetterAuth({
        databaseType: "memory",
        secret: "test-secret",
      });

      const mockRoleApi1: RoleAPI = {
        getRolesForOrg: async () => [],
        getRole: async () => null,
        createRole: async () => ({
          id: "role-1",
          name: "user",
          permissions: [],
        }),
        updateRole: async () => ({
          id: "role-1",
          name: "user",
          permissions: [],
        }),
        deleteRole: async () => {},
        assignRole: async () => {},
        revokeRole: async () => {},
        getRolesForUser: async () => [
          {
            id: "role-1",
            name: "user",
            permissions: [],
          },
        ],
      };

      const mockRoleApi2: RoleAPI = {
        getRolesForOrg: async () => [],
        getRole: async () => null,
        createRole: async () => ({
          id: "role-2",
          name: "editor",
          permissions: [],
        }),
        updateRole: async () => ({
          id: "role-2",
          name: "editor",
          permissions: [],
        }),
        deleteRole: async () => {},
        assignRole: async () => {},
        revokeRole: async () => {},
        getRolesForUser: async () => [
          {
            id: "role-2",
            name: "editor",
            permissions: [],
          },
        ],
      };

      const adapter = createBetterAuthAdapter(instance, mockRoleApi1);

      const mockProviderUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
      };

      // Use override roleApi
      const coreUser = await adapter.mapProviderUserToCoreUser(mockProviderUser, mockRoleApi2);

      expect(coreUser.role).toBe("editor");
    });
  });

  describe("createOrganizationManagement", () => {
    test("returns an OrganizationManagement implementation", () => {
      const instance = initializeBetterAuth({
        databaseType: "memory",
        secret: "test-secret",
      });

      const management = createOrganizationManagement(instance);

      // Check that all required methods exist
      expect(typeof management.addMemberToOrganization).toBe("function");
      expect(typeof management.removeMemberFromOrganization).toBe("function");
      expect(typeof management.getOrganizationMembers).toBe("function");
      expect(typeof management.getUserOrganizations).toBe("function");
      expect(typeof management.inviteUserToOrganization).toBe("function");
      expect(typeof management.updateMemberRole).toBe("function");
    });
  });
});
