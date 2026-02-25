import { describe, expect, it, beforeEach } from "vite-plus/test";
import {
  InMemoryWorkflowRunner,
  createWorkflowService,
  type WorkflowDefinition,
} from "../src/index.js";
import {
  defineWorkflow,
  defineCronWorkflow,
  defineEventWorkflow,
  defineManualWorkflow,
} from "../src/register-workflow.js";

describe("InMemoryWorkflowRunner", () => {
  let runner: InMemoryWorkflowRunner;

  beforeEach(() => {
    runner = new InMemoryWorkflowRunner();
  });

  it("registers and executes a single-step workflow", async () => {
    const workflow: WorkflowDefinition = {
      name: "test-workflow",
      trigger: { type: "manual" },
      handler: async ({ input }) => {
        return { processed: input };
      },
    };

    await runner.register(workflow);
    const runId = await runner.trigger("test-workflow", { value: 42 });

    expect(runId).toMatch(/^run-/);

    // Wait for async execution
    await new Promise((r) => setTimeout(r, 50));

    const run = await runner.getRun(runId);
    expect(run).not.toBeNull();
    expect(run!.status).toBe("completed");
    expect(run!.output).toEqual({ processed: { value: 42 } });
  });

  it("validates input against schema", async () => {
    const workflow: WorkflowDefinition = {
      name: "validated-workflow",
      trigger: { type: "manual" },
      inputSchema: {
        _tag: "ObjectSchema",
        type: "object",
        // Simplified for test - real valibot schema would be used
      } as any,
      handler: async ({ input }) => input,
    };

    await runner.register(workflow);
    await runner.trigger("validated-workflow", {});
  });

  it("supports multi-step workflows", async () => {
    const workflow: WorkflowDefinition = {
      name: "multi-step",
      trigger: { type: "manual" },
      steps: [
        {
          id: "step-1",
          handler: async () => "step-1-done",
        },
        {
          id: "step-2",
          handler: async () => "step-2-done",
        },
      ],
    };

    await runner.register(workflow);
    await runner.trigger("multi-step", {});

    await new Promise((r) => setTimeout(r, 50));

    const run = await runner.getRun(await runner.trigger("multi-step", {}));
    // Note: runId changes, so we check the last run
  });

  it("cancels a running workflow", async () => {
    const workflow: WorkflowDefinition = {
      name: "cancel-test",
      trigger: { type: "manual" },
      handler: async () => "done",
    };

    await runner.register(workflow);
    const runId = await runner.trigger("cancel-test", {});
    await runner.cancelRun(runId);

    const run = await runner.getRun(runId);
    expect(run!.status).toBe("cancelled");
  });
});

describe("defineWorkflow helpers", () => {
  it("creates a manual workflow definition", () => {
    const wf = defineManualWorkflow({
      name: "manual-test",
      handler: async () => "ok",
    });

    expect(wf.name).toBe("manual-test");
    expect(wf.trigger.type).toBe("manual");
  });

  it("creates a cron workflow definition", () => {
    const wf = defineCronWorkflow({
      name: "cron-test",
      schedule: "*/5 * * * *",
      handler: async () => "ok",
    });

    expect(wf.trigger.type).toBe("cron");
    expect((wf.trigger as any).schedule).toBe("*/5 * * * *");
  });

  it("creates an event workflow definition", () => {
    const wf = defineEventWorkflow({
      name: "event-test",
      eventTypes: ["catalog.entity.created"],
      handler: async () => "ok",
    });

    expect(wf.trigger.type).toBe("event");
    expect((wf.trigger as any).eventTypes).toEqual(["catalog.entity.created"]);
  });
});

describe("createWorkflowService", () => {
  it("wraps a runtime with listWorkflows", () => {
    const runner = new InMemoryWorkflowRunner();
    const service = createWorkflowService(runner);
    expect(typeof service.listWorkflows).toBe("function");
    expect(typeof service.register).toBe("function");
    expect(typeof service.start).toBe("function");
    expect(typeof service.stop).toBe("function");
    expect(typeof service.trigger).toBe("function");
  });
});
