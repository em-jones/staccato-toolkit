import { describe, it, expect, vi, beforeAll, afterAll } from "vite-plus/test";
import { createTestPlatform, type TestPlatform } from "@op/platform/testing";
import { join, resolve } from "node:path";
import { DockerComposeEnvironment, Wait } from "testcontainers";
// Import plugin directly from source
import hatchetPlugin from "../src/index.ts";
import { createHatchetRuntime } from "../src/index.ts";
import type { WorkflowRuntime } from "@op-plugin/workflows-core";

/**
 * Integration test for @op-plugin/workflows-hatchet.
 *
 * Validates:
 * 1. Vite plugin pipeline (metadata extraction + type/OpenAPI generation)
 * 2. Full platform bootstrap (init → registerPlugin → start → stop) with workflows-hatchet
 * 3. In-memory fallback when Hatchet is not configured
 * 4. Workflows can be registered and triggered
 * 5. Workflow runs can be queried and cancelled
 * 6. Real Hatchet container integration via DockerComposeEnvironment
 */

const PLUGIN_ENTRY = resolve(__dirname, "../src/index.ts");
const COMPOSE_PATH = join(__dirname, "../../../");
const COMPOSE_FILE = "podman-compose.yaml";

async function isContainerRuntimeAvailable(): Promise<boolean> {
  try {
    const { GenericContainer } = await import("testcontainers");
    await new GenericContainer("alpine:latest")
      .withStartupTimeout(10_000)
      .withCommand(["echo", "test"])
      .start()
      .then(c => c.stop());
    return true;
  } catch {
    return false;
  }
}

describe("workflows-hatchet platform integration (full bootstrap)", () => {
  let platform: TestPlatform;

  beforeAll(async () => {
    platform = await createTestPlatform({
      plugins: [hatchetPlugin],
      pluginPaths: [PLUGIN_ENTRY],
      configYaml: `server:
  workflows_hatchet: {}
`,
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
    expect(platform.metadata[0].name).toBe("workflows-hatchet");
    expect(platform.metadata[0].type).toBe("workflow");
  });

  it("should generate TypeScript types file", () => {
    expect(platform.generatedTypes).toContain("workflows-hatchet");
  });

  it("should generate OpenAPI spec", () => {
    expect(platform.generatedOpenAPI).toContain("workflows-hatchet");
  });
});

describe("workflows-hatchet in-memory fallback", () => {
  it("should fall back to InMemoryWorkflowRunner when Hatchet is not configured", async () => {
    const runtime = await createHatchetRuntime({});
    expect(runtime).toBeDefined();

    await runtime.register({
      name: "fallback-test",
      description: "Fallback test workflow",
      handler: async (ctx) => `Fallback processed: ${ctx.input}`,
    });

    const runId = await runtime.trigger("fallback-test", "test-data");
    expect(runId).toBeDefined();

    const run = await runtime.getRun(runId);
    expect(run).not.toBeNull();
    expect(run!.workflowName).toBe("fallback-test");
  }, 15_000);

  it("should cancel a workflow run in in-memory mode", async () => {
    const runtime = await createHatchetRuntime({});

    await runtime.register({
      name: "cancel-fallback-test",
      description: "Cancel fallback test",
      handler: async (ctx) => `Done`,
    });

    const runId = await runtime.trigger("cancel-fallback-test", "data");
    await runtime.cancelRun(runId);

    const run = await runtime.getRun(runId);
    expect(run!.status).toBe("cancelled");
  });

  it("should register a multi-step workflow", async () => {
    const runtime = await createHatchetRuntime({});

    await runtime.register({
      name: "multi-step",
      description: "Multi-step workflow",
      steps: [
        { name: "step-1", handler: async (ctx) => `Step 1: ${ctx.input}` },
        { name: "step-2", handler: async (ctx) => `Step 2: processed` },
      ],
    });

    const runId = await runtime.trigger("multi-step", "test");
    expect(runId).toBeDefined();
  });

  it("should return null for non-existent run", async () => {
    const runtime = await createHatchetRuntime({});
    const run = await runtime.getRun("non-existent-run");
    expect(run).toBeNull();
  });
});

describe("workflows-hatchet plugin structure", () => {
  it("should have a valid plugin default export", async () => {
    expect(hatchetPlugin.name).toBe("workflows-hatchet");
    expect(hatchetPlugin.type).toBe("workflow");
    expect(hatchetPlugin.serverConfig).toBeUndefined(); // Plugin uses factory pattern
    expect(hatchetPlugin.serverServices).toHaveLength(0);
    expect(hatchetPlugin.serverLifecycle).toBeDefined();
  });
});

describe("workflows-hatchet with real Hatchet container", () => {
  let composeEnv: Awaited<ReturnType<typeof DockerComposeEnvironment.prototype.up>>;
  let hatchetUrl: string;
  let containerRuntimeAvailable = false;

  beforeAll(async () => {
    containerRuntimeAvailable = await isContainerRuntimeAvailable();
    if (!containerRuntimeAvailable) return;

    const composeEnvInstance = new DockerComposeEnvironment(COMPOSE_PATH, COMPOSE_FILE)
      .withWaitStrategy("postgres", Wait.forHealthCheck())
      .withWaitStrategy("hatchet-engine", Wait.forListeningPorts())
      .withStartupTimeout(120_000);

    composeEnv = await composeEnvInstance.up([
      "postgres",
      "migration",
      "setup-config",
      "hatchet-engine",
    ]);

    const engine = composeEnv.getContainer("hatchet-engine");
    const port = engine.getMappedPort(7070);
    hatchetUrl = `http://localhost:${port}`;
  }, 120_000);

  afterAll(async () => {
    if (containerRuntimeAvailable && composeEnv) {
      await composeEnv.down();
    }
  });

  it.skipIf(!containerRuntimeAvailable)("should connect to real Hatchet instance", async () => {
    const runtime = await createHatchetRuntime({
      serverUrl: hatchetUrl,
      token: "test-token",
    });

    expect(runtime).toBeDefined();
    expect(typeof runtime.register).toBe("function");
    expect(typeof runtime.start).toBe("function");
    expect(typeof runtime.trigger).toBe("function");
  }, 15_000);

  it.skipIf(!containerRuntimeAvailable)("should register and trigger a workflow against real Hatchet", async () => {
    const runtime = await createHatchetRuntime({
      serverUrl: hatchetUrl,
      token: "test-token",
    });

    await runtime.register({
      name: "compose-test-wf",
      description: "Workflow running against real Hatchet",
      handler: async (ctx) => `Processed: ${ctx.input}`,
    });

    const runId = await runtime.trigger("compose-test-wf", "real-hatchet-data");
    expect(runId).toMatch(/^run-/);

    const run = await runtime.getRun(runId);
    expect(run).not.toBeNull();
    expect(run!.workflowName).toBe("compose-test-wf");
  }, 15_000);

  it.skipIf(!containerRuntimeAvailable)("should cancel a workflow run against real Hatchet", async () => {
    const runtime = await createHatchetRuntime({
      serverUrl: hatchetUrl,
      token: "test-token",
    });

    await runtime.register({
      name: "compose-cancel-wf",
      description: "Cancel test workflow",
      handler: async () => "done",
    });

    const runId = await runtime.trigger("compose-cancel-wf", {});
    await runtime.cancelRun(runId);

    const run = await runtime.getRun(runId);
    expect(run!.status).toBe("cancelled");
  }, 15_000);
});
