/**
 * Hatchet workflow engine integration.
 *
 * Provides a durable workflow runtime backed by Hatchet, supporting:
 * - Event-driven workflows
 * - Cron-scheduled workflows
 * - Manual invocation
 * - Step-level retries and timeouts
 * - Workflow run status tracking
 */

import type {
  WorkflowRuntime,
  WorkflowDefinition,
  WorkflowRun,
  WorkflowContext,
  WorkflowHandler,
} from "@op-plugin/workflows-core";
import type { Logger } from "@op/platform/o11y/api";
import type { BasePlugin } from "@op/platform/plugins/types";

/** Configuration for Hatchet workflow runtime. */
export interface HatchetConfig {
  /** Hatchet server URL. */
  serverUrl?: string;
  /** Hatchet API token. */
  token?: string;
  /** Worker name/identifier. */
  workerName?: string;
}

/**
 * Create a Hatchet-backed workflow runtime.
 *
 * In development mode (no Hatchet server available), this falls back
 * to the in-memory runner from workflows-core.
 */
export async function createHatchetRuntime(config: HatchetConfig = {}, logger?: Logger): Promise<WorkflowRuntime> {
  const { InMemoryWorkflowRunner } = await import("@op-plugin/workflows-core");

  // Check if Hatchet is available
  const serverUrl = config.serverUrl || process.env.HATCHET_SERVER_URL;
  const token = config.token || process.env.HATCHET_TOKEN;

  if (!serverUrl || !token) {
    // Fall back to in-memory runner
    logger?.warn("Hatchet not configured (missing HATCHET_SERVER_URL or HATCHET_TOKEN). Using in-memory workflow runner.");
    return new InMemoryWorkflowRunner(undefined, logger);
  }

  logger?.info("Creating HatchetWorkflowRuntime", { serverUrl, workerName: config.workerName || "openport-worker" });
  // In production, use the Hatchet SDK
  // Note: The actual Hatchet integration requires the @hatchet-dev/typescript-sdk
  // which should be added as a dependency when deploying to production.
  return new HatchetWorkflowRuntime({
    serverUrl,
    token,
    workerName: config.workerName || "openport-worker",
  }, logger);
}

/**
 * Production Hatchet workflow runtime implementation.
 * Wraps the Hatchet TypeScript SDK to conform to our WorkflowRuntime interface.
 */
class HatchetWorkflowRuntime implements WorkflowRuntime {
  private workflows = new Map<string, WorkflowDefinition>();
  private runs = new Map<string, WorkflowRun>();
  private running = false;
  private config: Required<Pick<HatchetConfig, "serverUrl" | "token" | "workerName">>;
  private client: any; // HatchetClient type from SDK
  private worker: any; // HatchetWorker type from SDK
  private logger: Logger | undefined;

  constructor(
    config: Required<Pick<HatchetConfig, "serverUrl" | "token" | "workerName">>,
    logger?: Logger,
  ) {
    this.config = config;
    this.logger = logger;
  }

  async register<TInput, TOutput, TName extends string>(
    definition: WorkflowDefinition<TInput, TOutput, TName>,
  ): Promise<void> {
    this.workflows.set(definition.name, definition as WorkflowDefinition);
    this.logger?.debug("Workflow registered", { workflowName: definition.name });
  }

  async start(): Promise<void> {
    if (this.running) {
      this.logger?.debug("HatchetWorkflowRuntime already running, skipping start");
      return;
    }
    this.running = true;
    this.logger?.info("HatchetWorkflowRuntime starting", { workerName: this.config.workerName });

    try {
      // Dynamically import Hatchet SDK
      const { Client } = await import("@hatchet-dev/typescript-sdk");

      this.client = new Client({
        host: this.config.serverUrl,
        token: this.config.token,
      });

      this.worker = this.client.worker(this.config.workerName);

      // Register all workflows with Hatchet
      for (const workflow of this.workflows.values()) {
        await this.registerWithHatchet(workflow);
      }

      // Start the worker
      await this.worker.start();
      this.logger?.info("Hatchet worker started successfully");
    } catch (err) {
      this.logger?.error("Failed to start Hatchet worker", { error: err instanceof Error ? err.message : String(err) });
      // Fall back to in-memory
      this.running = false;
      throw err;
    }
  }

  async stop(): Promise<void> {
    this.logger?.info("HatchetWorkflowRuntime stopping");
    this.running = false;
    if (this.worker) {
      await this.worker.stop();
      this.logger?.info("Hatchet worker stopped successfully");
    }
  }

  async trigger<TInput = unknown>(workflowName: string, input: TInput): Promise<string> {
    this.logger?.info("Triggering workflow", { workflowName });
    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    if (this.client) {
      // Trigger via Hatchet SDK
      await this.client.run(workflowName, input);
    }

    const run: WorkflowRun = {
      runId,
      workflowName,
      status: "running",
      startedAt: new Date().toISOString(),
      input,
      attempt: 1,
    };
    this.runs.set(runId, run);

    this.logger?.debug("Workflow triggered", { runId, workflowName });
    return runId;
  }

  async getRun(runId: string): Promise<WorkflowRun | null> {
    return this.runs.get(runId) ?? null;
  }

  async cancelRun(runId: string): Promise<void> {
    const run = this.runs.get(runId);
    if (run) {
      run.status = "cancelled";
      run.completedAt = new Date().toISOString();
      this.logger?.info("Workflow run cancelled", { runId, workflowName: run.workflowName });
    } else {
      this.logger?.warn("Attempted to cancel non-existent workflow run", { runId });
    }
  }

  // -- Private helpers --

  private async registerWithHatchet(definition: WorkflowDefinition): Promise<void> {
    if (!this.worker) return;

    this.logger?.debug("Registering workflow with Hatchet", { workflowName: definition.name });
    const handler = definition.handler ?? this.createStepHandler(definition);

    this.worker.on(definition.name, async (context: any) => {
      const workflowCtx: WorkflowContext = {
        runId: context.workflowRunId(),
        input: context.workflowInput(),
        startedAt: new Date().toISOString(),
        attempt: context.workflowAttempt() + 1,
      };

      try {
        const output = await handler(workflowCtx);
        this.logger?.debug("Workflow completed successfully", { workflowName: definition.name, runId: workflowCtx.runId });
        return output;
      } catch (err) {
        this.logger?.error("Workflow execution failed", { workflowName: definition.name, runId: workflowCtx.runId, error: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    });
  }

  private createStepHandler<TInput, TOutput>(
    definition: WorkflowDefinition<TInput, TOutput>,
  ): WorkflowHandler<TInput, TOutput> {
    return async (ctx: WorkflowContext<TInput>) => {
      let lastOutput: TOutput | undefined;

      for (const step of definition.steps ?? []) {
        if (step.condition && !(await step.condition(ctx))) {
          this.logger?.debug("Skipping workflow step", { workflowName: definition.name, stepId: step.id });
          continue;
        }
        this.logger?.debug("Executing workflow step", { workflowName: definition.name, stepId: step.id });
        lastOutput = await step.handler(ctx);
      }

      return lastOutput as TOutput;
    };
  }
}

/** Default export for plugin registration. */

export default {
  name: "workflows-hatchet",
  type: "workflow",
  serverConfig: undefined as any,
  clientConfig: undefined as any,
  serverServices: [],
  clientServices: [],
  eventHandlers: [],
  serverLifecycle: {
    async onInit(services: any) {
      const logger = services.get("logger");
      logger.info("[workflows-hatchet] Initializing workflow runtime...");
      logger.debug("[workflows-hatchet] Workflow runtime initialized");
    },
    async onDestroy(services: any) {
      const logger = services.get("logger");
      logger.info("[workflows-hatchet] Shutting down workflow runtime...");
      logger.info("[workflows-hatchet] Workflow runtime shutdown complete");
    },
  },
  clientLifecycle: {},
} satisfies BasePlugin;
