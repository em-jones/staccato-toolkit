import { describe, expect, it } from "vite-plus/test";
import { createHatchetRuntime } from "../src/index.js";

describe("createHatchetRuntime", () => {
  it("falls back to in-memory runner when Hatchet is not configured", async () => {
    // Clear env variables
    const oldUrl = process.env.HATCHET_SERVER_URL;
    const oldToken = process.env.HATCHET_TOKEN;
    delete process.env.HATCHET_SERVER_URL;
    delete process.env.HATCHET_TOKEN;

    const runtime = await createHatchetRuntime();

    expect(runtime).toBeDefined();
    expect(typeof runtime.register).toBe("function");
    expect(typeof runtime.start).toBe("function");
    expect(typeof runtime.trigger).toBe("function");

    // Restore env
    if (oldUrl) process.env.HATCHET_SERVER_URL = oldUrl;
    if (oldToken) process.env.HATCHET_TOKEN = oldToken;
  });

  it("registers and triggers a workflow", async () => {
    const runtime = await createHatchetRuntime();
    await runtime.start();

    await runtime.register({
      name: "test-wf",
      trigger: { type: "manual" },
      handler: async () => "done",
    });

    const runId = await runtime.trigger("test-wf", {});
    expect(runId).toMatch(/^run-/);

    await runtime.stop();
  });
});
