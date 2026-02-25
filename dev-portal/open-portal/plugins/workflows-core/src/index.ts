/**
 * Workflow engine core — defines the contract for durable workflow execution.
 *
 * Workflows are triggered by events or cron schedules and executed by a
 * pluggable workflow engine (e.g. Hatchet, Temporal, Inngest).
 *
 * This plugin provides:
 * - Workflow definition types with valibot validation
 * - Trigger abstractions (event, cron, manual)
 * - Registration API for declaring workflows at startup
 * - In-memory workflow runner for development
 */

import * as v from "valibot";

// ---------------------------------------------------------------------------
// Trigger schemas
// ---------------------------------------------------------------------------

/** Cron trigger — schedules workflow execution on a cron expression. */
export const CronTriggerSchema = v.object({
  type: v.literal("cron"),
  /** Cron expression, e.g. "0 0 * * *" for daily at midnight */
  schedule: v.pipe(v.string(), v.minLength(1)),
  /** Optional timezone for cron evaluation. */
  timezone: v.optional(v.string(), "UTC"),
});

export type CronTrigger = v.InferOutput<typeof CronTriggerSchema>;

/** Event trigger — executes workflow when a matching event is published. */
export const EventTriggerSchema = v.object({
  type: v.literal("event"),
  /** Event type(s) to listen for. */
  eventTypes: v.array(v.string()),
  /** Optional source filter (glob pattern). */
  sourceFilter: v.optional(v.string()),
});

export type EventTrigger = v.InferOutput<typeof EventTriggerSchema>;

/** Manual trigger — workflow can only be invoked directly. */
export const ManualTriggerSchema = v.object({
  type: v.literal("manual"),
});

export type ManualTrigger = v.InferOutput<typeof ManualTriggerSchema>;

/** Union of all trigger types. */
export const TriggerSchema = v.variant("type", [
  CronTriggerSchema,
  EventTriggerSchema,
  ManualTriggerSchema,
]);

export type Trigger = v.InferOutput<typeof TriggerSchema>;

// ---------------------------------------------------------------------------
// Workflow definition
// ---------------------------------------------------------------------------

/** Workflow execution context — passed to every workflow handler. */
export interface WorkflowContext<TInput = unknown> {
  /** Unique workflow run ID. */
  runId: string;
  /** The input payload that triggered this workflow. */
  input: TInput;
  /** ISO-8601 timestamp when the workflow started. */
  startedAt: string;
  /** Attempt number (1-based, incremented on retries). */
  attempt: number;
}

/** Workflow handler function signature. */
export type WorkflowHandler<TInput = unknown, TOutput = unknown> = (
  ctx: WorkflowContext<TInput>,
) => Promise<TOutput>;

/** Workflow step for building multi-step workflows. */
export interface WorkflowStep<TInput = unknown, TOutput = unknown> {
  /** Unique step identifier within the workflow. */
  id: string;
  /** Step handler — receives the workflow context and returns output. */
  handler: WorkflowHandler<TInput, TOutput>;
  /** Optional condition — step is skipped if this returns false. */
  condition?: (ctx: WorkflowContext<TInput>) => Promise<boolean>;
  /** Retry configuration for this step. */
  retry?: RetryConfig;
  /** Timeout in milliseconds (0 = no timeout). */
  timeoutMs?: number;
}

/** Retry configuration. */
export interface RetryConfig {
  /** Maximum number of retries. */
  maxAttempts: number;
  /** Initial backoff in milliseconds. */
  initialBackoffMs: number;
  /** Maximum backoff in milliseconds. */
  maxBackoffMs: number;
  /** Backoff multiplier (e.g. 2 for exponential). */
  multiplier: number;
}

/** Default retry configuration. */
export const DEFAULT_RETRY: RetryConfig = {
  maxAttempts: 3,
  initialBackoffMs: 1000,
  maxBackoffMs: 30000,
  multiplier: 2,
};

/** Workflow definition — the complete specification of a workflow. */
export interface WorkflowDefinition<
  TInput = unknown,
  TOutput = unknown,
  TName extends string = string,
> {
  /** Unique workflow name (used for registration and invocation). */
  name: TName;
  /** Human-readable description. */
  description?: string;
  /** What triggers this workflow. */
  trigger: Trigger;
  /** Valibot schema for validating workflow input. */
  inputSchema?: v.GenericSchema<TInput>;
  /** Main workflow handler (single-step). */
  handler?: WorkflowHandler<TInput, TOutput>;
  /** Multi-step workflow definition (alternative to handler). */
  steps?: WorkflowStep<TInput, TOutput>[];
  /** Retry configuration for the entire workflow. */
  retry?: RetryConfig;
  /** Timeout in milliseconds for the entire workflow. */
  timeoutMs?: number;
  /** Whether to allow concurrent executions (default: true). */
  allowConcurrency?: boolean;
  /** Concurrency key — only one execution per key at a time. */
  concurrencyKey?: (input: TInput) => string;
}

// ---------------------------------------------------------------------------
// Workflow runtime interface
// ---------------------------------------------------------------------------

/** Workflow run status. */
export type WorkflowRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "timed_out";

/** Workflow run record. */
export interface WorkflowRun<TOutput = unknown> {
  runId: string;
  workflowName: string;
  status: WorkflowRunStatus;
  startedAt: string;
  completedAt?: string;
  input?: unknown;
  output?: TOutput;
  error?: string;
  attempt: number;
}

/**
 * WorkflowRuntime — the core interface for executing workflows.
 * Implementations (Hatchet, Temporal, in-memory) provide durable execution.
 */
export interface WorkflowRuntime {
  /**
   * Register a workflow definition with the runtime.
   * Must be called before the runtime is started.
   */
  register<TInput, TOutput, TName extends string>(
    definition: WorkflowDefinition<TInput, TOutput, TName>,
  ): Promise<void>;

  /**
   * Start the workflow runtime.
   * Begins listening for event triggers and scheduling cron triggers.
   */
  start(): Promise<void>;

  /**
   * Stop the workflow runtime gracefully.
   * Waits for in-progress workflows to complete.
   */
  stop(): Promise<void>;

  /**
   * Manually trigger a workflow by name.
   * Returns the run ID.
   */
  trigger<TInput = unknown>(workflowName: string, input: TInput): Promise<string>;

  /**
   * Get the status of a workflow run.
   */
  getRun(runId: string): Promise<WorkflowRun | null>;

  /**
   * Cancel a running workflow.
   */
  cancelRun(runId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Workflow service — combines registration and runtime
// ---------------------------------------------------------------------------

/**
 * WorkflowService is the interface registered with the DI container.
 * It provides both workflow registration and runtime execution.
 */
export interface WorkflowService extends WorkflowRuntime {
  /** List all registered workflows. */
  listWorkflows(): WorkflowDefinition[];
}

// ---------------------------------------------------------------------------
// Logger interface (inline to avoid circular dependency with @op/platform)
// ---------------------------------------------------------------------------

export interface Logger {
  trace(message: string, attributes?: Record<string, unknown>): void;
  info(message: string, attributes?: Record<string, unknown>): void;
  warn(message: string, attributes?: Record<string, unknown>): void;
  error(message: string, attributes?: Record<string, unknown>): void;
  debug(message: string, attributes?: Record<string, unknown>): void;
}

// ---------------------------------------------------------------------------
// In-memory workflow runner (development default)
// ---------------------------------------------------------------------------

/**
 * Simple in-memory workflow runner for development and testing.
 * Executes workflows immediately without durability guarantees.
 */
export class InMemoryWorkflowRunner implements WorkflowRuntime {
  private workflows = new Map<string, WorkflowDefinition>();
  private runs = new Map<string, WorkflowRun>();
  private running = false;
  private cronTimers: NodeJS.Timeout[] = [];
  private logger: Logger | undefined;

  constructor(_config?: Record<string, unknown>, logger?: Logger) {
    this.logger = logger;
  }

  async register<TInput, TOutput, TName extends string>(
    definition: WorkflowDefinition<TInput, TOutput, TName>,
  ): Promise<void> {
    this.workflows.set(definition.name, definition as WorkflowDefinition);
    this.logger?.debug("Workflow registered", { workflowName: definition.name, triggerType: definition.trigger.type });
  }

  async start(): Promise<void> {
    this.logger?.info("InMemoryWorkflowRunner starting");
    this.running = true;

    // Schedule cron triggers
    let cronCount = 0;
    for (const workflow of this.workflows.values()) {
      if (workflow.trigger.type === "cron") {
        // Simple cron scheduling (in production, use a proper cron library)
        const intervalMs = parseCronToMs(workflow.trigger.schedule);
        if (intervalMs > 0) {
          const timer = setInterval(async () => {
            if (this.running) {
              this.logger?.debug("Cron trigger firing", { workflowName: workflow.name });
              await this.trigger(workflow.name, { __cron: true });
            }
          }, intervalMs);
          this.cronTimers.push(timer);
          cronCount++;
          this.logger?.info("Cron workflow scheduled", { workflowName: workflow.name, schedule: workflow.trigger.schedule, intervalMs });
        }
      }
    }

    this.logger?.info("InMemoryWorkflowRunner started", {
      workflowCount: this.workflows.size,
      cronCount,
    });
  }

  async stop(): Promise<void> {
    this.logger?.info("InMemoryWorkflowRunner stopping");
    this.running = false;
    for (const timer of this.cronTimers) {
      clearInterval(timer);
    }
    const clearedCount = this.cronTimers.length;
    this.cronTimers = [];
    this.logger?.info("InMemoryWorkflowRunner stopped", { clearedCronTimers: clearedCount });
  }

  async trigger<TInput = unknown>(workflowName: string, input: TInput): Promise<string> {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      this.logger?.warn("Attempted to trigger non-existent workflow", { workflowName });
      throw new Error(`Workflow "${workflowName}" not found`);
    }

    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const run: WorkflowRun = {
      runId,
      workflowName,
      status: "running",
      startedAt: new Date().toISOString(),
      input,
      attempt: 1,
    };
    this.runs.set(runId, run);

    this.logger?.info("Workflow triggered", { runId, workflowName, triggerType: workflow.trigger.type });

    // Execute asynchronously
    this.executeWorkflow(workflow, runId, input).catch((err) => {
      run.status = "failed";
      run.error = err.message;
      run.completedAt = new Date().toISOString();
      this.logger?.error("Workflow execution failed", { runId, workflowName, error: run.error });
    });

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

  private async executeWorkflow<TInput>(
    workflow: WorkflowDefinition,
    runId: string,
    input: TInput,
  ): Promise<void> {
    const run = this.runs.get(runId)!;

    try {
      // Validate input if schema is provided
      if (workflow.inputSchema) {
        const result = v.safeParse(workflow.inputSchema, input);
        if (!result.success) {
          const errMsg = `Input validation failed: ${result.issues.map((i) => i.message).join(", ")}`;
          this.logger?.warn("Workflow input validation failed", { runId, workflowName: workflow.name });
          throw new Error(errMsg);
        }
      }

      const ctx: WorkflowContext<TInput> = {
        runId,
        input,
        startedAt: run.startedAt,
        attempt: run.attempt,
      };

      let output: unknown;

      if (workflow.handler) {
        // Single-step workflow
        this.logger?.debug("Executing single-step workflow", { workflowName: workflow.name, runId });
        output = await workflow.handler(ctx);
      } else if (workflow.steps && workflow.steps.length > 0) {
        // Multi-step workflow
        this.logger?.debug("Executing multi-step workflow", { workflowName: workflow.name, runId, stepCount: workflow.steps.length });
        for (const step of workflow.steps) {
          if (step.condition && !(await step.condition(ctx))) {
            this.logger?.debug("Skipping workflow step (condition not met)", { workflowName: workflow.name, runId, stepId: step.id });
            continue; // Skip this step
          }
          output = await step.handler(ctx);
        }
      } else {
        this.logger?.warn("Workflow has no handler or steps", { workflowName: workflow.name });
        throw new Error(`Workflow "${workflow.name}" has no handler or steps`);
      }

      run.status = "completed";
      run.output = output;
      run.completedAt = new Date().toISOString();
      this.logger?.info("Workflow completed", { runId, workflowName: workflow.name });
    } catch (err) {
      run.status = "failed";
      run.error = err instanceof Error ? err.message : String(err);
      run.completedAt = new Date().toISOString();
      this.logger?.error("Workflow execution failed", {
        runId,
        workflowName: workflow.name,
        error: run.error,
        attempt: run.attempt,
      });
    }
  }
}

/**
 * Create a WorkflowService backed by the given WorkflowRuntime.
 * This is the primary factory used by the DI container.
 */
export function createWorkflowService(runtime: WorkflowRuntime, logger?: Logger): WorkflowService {
  logger?.debug("Creating WorkflowService");
  return {
    ...runtime,
    listWorkflows(): WorkflowDefinition[] {
      // This requires access to the runtime's internal registry
      // For in-memory runner, we expose it directly
      if (runtime instanceof InMemoryWorkflowRunner) {
        return Array.from((runtime as any).workflows.values());
      }
      return [];
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a simple cron expression to milliseconds (approximate).
 * Supports: * * * * * (minute-level granularity)
 * For production, use a proper cron library like cron-parser.
 */
function parseCronToMs(cron: string): number {
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return 0;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Simple patterns only — production should use cron-parser
  if (minute === "*" && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return 60 * 1000; // Every minute
  }

  if (minute.startsWith("*/")) {
    const interval = parseInt(minute.slice(2), 10);
    return interval * 60 * 1000;
  }

  if (hour === "*" && minute !== "*") {
    return 60 * 60 * 1000; // Every hour
  }

  // Default: 1 hour
  return 60 * 60 * 1000;
}

// ---------------------------------------------------------------------------
// Re-export register-workflow and entity-sync for backward compatibility
// ---------------------------------------------------------------------------

export * from "./register-workflow.ts";
export * from "./entity-sync.ts";
