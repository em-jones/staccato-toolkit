import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vite-plus/test";
import { createTestPlatform, type TestPlatform } from "@op/platform/testing";
import { resolve } from "node:path";
import betterAuthPlugin, {
  initializeBetterAuth,
  createBetterAuthAdapter,
  createOrganizationManagement,
  type BetterAuthInstance,
} from "../src/index.ts";

/**
 * Integration test for @op-plugin/authentication-better-auth.
 *
 * Validates:
 * 1. Vite plugin pipeline (metadata extraction + type/OpenAPI generation)
 * 2. Full platform bootstrap (init → registerPlugin → start → stop)
 * 3. initializeBetterAuth() creates a Better Auth instance with proper config
 * 4. Configuration validation (missing secret throws)
 * 5. Environment variable fallbacks work correctly
 * 6. createBetterAuthAdapter() returns an AuthAPI with all expected methods
 * 7. createOrganizationManagement() returns an OrganizationManagement with all expected methods
 * 8. Memory adapter is available for dev/test without external database
 *
 * NOTE: Database-level CRUD tests require a running PostgreSQL instance.
 * Those are best validated through E2E tests with the full platform.
 */

const PLUGIN_ENTRY = resolve(__dirname, "../src/index.ts");

describe("authentication-better-auth platform integration (full bootstrap)", () => {
  let platform: TestPlatform;

  beforeAll(async () => {
    vi.stubEnv("AUTH_SECRET", "test-platform-secret");

    platform = await createTestPlatform({
      plugins: [betterAuthPlugin],
      pluginPaths: [PLUGIN_ENTRY],
      configYaml: `server:
  authentication_better_auth:
    databaseType: memory
    secret: test-platform-secret
    baseUrl: "http://localhost:3000"
`,
    });
  }, 15_000);

  afterAll(async () => {
    vi.unstubAllEnvs();
    await platform.cleanup();
  });

  it("should complete platform bootstrap without errors", () => {
    expect(platform.app).toBeDefined();
    expect(platform.app.services).toBeDefined();
  });

  it("should extract plugin metadata via the vite plugin pipeline", () => {
    expect(platform.metadata).toHaveLength(1);
    expect(platform.metadata[0].name).toBe("authentication-better-auth");
  });

  it("should generate TypeScript types file", () => {
    expect(platform.generatedTypes).toContain("authentication-better-auth");
  });

  it("should generate OpenAPI spec", () => {
    expect(platform.generatedOpenAPI).toContain("authentication-better-auth");
  });
});

describe("authentication-better-auth initialization", () => {
  it("should throw when secret is missing", () => {
    delete process.env.AUTH_DATABASE_URL;
    delete process.env.AUTH_SECRET;

    expect(() => {
      initializeBetterAuth({
        secret: "",
      });
    }).toThrow("Missing required AUTH_SECRET");
  });

  it("should throw when neither secret nor env var is set", () => {
    vi.stubEnv("AUTH_SECRET", "");
    expect(() => {
      initializeBetterAuth({});
    }).toThrow("Missing required AUTH_SECRET");
    vi.unstubAllEnvs();
  });

  it("should use memory adapter for dev/test without external database", () => {
    const instance = initializeBetterAuth({
      databaseType: "memory",
      secret: "test-secret",
    });

    expect(instance).toBeDefined();
    expect(instance.auth).toBeDefined();
  });

  it("should use environment variables when config is partial", () => {
    vi.stubEnv("AUTH_DATABASE_URL", "postgres://test:test@localhost/testdb");
    vi.stubEnv("AUTH_SECRET", "env-test-secret");

    const instance = initializeBetterAuth({});

    expect(instance).toBeDefined();
    expect(instance.auth).toBeDefined();

    vi.unstubAllEnvs();
  });

  it("should accept postgres database type", () => {
    expect(() => {
      initializeBetterAuth({
        databaseType: "postgres",
        databaseUrl: "postgres://test:test@localhost/test",
        secret: "test-secret",
      });
    }).not.toThrow();
  });

  it("should use baseUrl default when not specified", () => {
    vi.stubEnv("AUTH_DATABASE_URL", "postgres://test:test@localhost/testdb");
    vi.stubEnv("AUTH_SECRET", "test-secret");
    vi.stubEnv("AUTH_BASE_URL", "");

    const instance = initializeBetterAuth({});
    expect(instance).toBeDefined();

    vi.unstubAllEnvs();
  });
});

describe("authentication-better-auth adapter creation", () => {
  let authInstance: BetterAuthInstance;

  beforeEach(() => {
    authInstance = initializeBetterAuth({
      databaseType: "memory",
      secret: "test-secret-for-adapter",
      baseUrl: "http://localhost:3000",
    });
  });

  it("should create an AuthAPI adapter with all expected methods", () => {
    const authAPI = createBetterAuthAdapter(authInstance);

    expect(typeof authAPI.createUser).toBe("function");
    expect(typeof authAPI.getUser).toBe("function");
    expect(typeof authAPI.updateUser).toBe("function");
    expect(typeof authAPI.deleteUser).toBe("function");
    expect(typeof authAPI.getOrganizations).toBe("function");
    expect(typeof authAPI.getOrganization).toBe("function");
    expect(typeof authAPI.createOrganization).toBe("function");
    expect(typeof authAPI.updateOrganization).toBe("function");
    expect(typeof authAPI.mapProviderUserToCoreUser).toBe("function");
  });

  it("should create an OrganizationManagement with all expected methods", () => {
    const orgMgmt = createOrganizationManagement(authInstance);

    expect(typeof orgMgmt.addMemberToOrganization).toBe("function");
    expect(typeof orgMgmt.removeMemberFromOrganization).toBe("function");
    expect(typeof orgMgmt.getOrganizationMembers).toBe("function");
    expect(typeof orgMgmt.getUserOrganizations).toBe("function");
    expect(typeof orgMgmt.inviteUserToOrganization).toBe("function");
    expect(typeof orgMgmt.updateMemberRole).toBe("function");
  });
});
