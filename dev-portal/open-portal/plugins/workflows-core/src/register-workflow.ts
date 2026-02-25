/**
 * Workflow registration API — provides a declarative way to define
 * workflows with valibot-validated triggers and inputs.
 */

import * as v from "valibot";
import type { WorkflowDefinition, WorkflowHandler, Trigger, RetryConfig } from "./index.js";

/** Configuration for registering a workflow. */
export interface WorkflowRegistrationConfig<
  TInput = unknown,
  TOutput = unknown,
  TName extends string = string,
> {
  /** Unique workflow name. */
  name: TName;
  /** Human-readable description. */
  description?: string;
  /** What triggers this workflow. */
  trigger: Trigger;
  /** Valibot schema for input validation (optional). */
  inputSchema?: v.GenericSchema<TInput>;
  /** Main workflow handler. */
  handler: WorkflowHandler<TInput, TOutput>;
  /** Retry configuration. */
  retry?: RetryConfig;
  /** Timeout in milliseconds. */
  timeoutMs?: number;
}

/**
 * Register a workflow with the workflow runtime.
 *
 * @param config - Workflow registration configuration
 * @returns Workflow definition ready for registration
 */
export function defineWorkflow<TInput, TOutput, TName extends string>(
  config: WorkflowRegistrationConfig<TInput, TOutput, TName>,
): WorkflowDefinition<TInput, TOutput, TName> {
  return {
    name: config.name,
    description: config.description,
    trigger: config.trigger,
    inputSchema: config.inputSchema,
    handler: config.handler,
    retry: config.retry,
    timeoutMs: config.timeoutMs,
    allowConcurrency: true,
  };
}

/**
 * Define a cron-triggered workflow.
 */
export function defineCronWorkflow<TInput, TOutput, TName extends string>(
  config: Omit<WorkflowRegistrationConfig<TInput, TOutput, TName>, "trigger"> & {
    schedule: string;
    timezone?: string;
  },
): WorkflowDefinition<TInput, TOutput, TName> {
  return defineWorkflow({
    ...config,
    trigger: {
      type: "cron",
      schedule: config.schedule,
      timezone: config.timezone ?? "UTC",
    },
  });
}

/**
 * Define an event-triggered workflow.
 */
export function defineEventWorkflow<TInput, TOutput, TName extends string>(
  config: Omit<WorkflowRegistrationConfig<TInput, TOutput, TName>, "trigger"> & {
    eventTypes: string[];
    sourceFilter?: string;
  },
): WorkflowDefinition<TInput, TOutput, TName> {
  return defineWorkflow({
    ...config,
    trigger: {
      type: "event",
      eventTypes: config.eventTypes,
      sourceFilter: config.sourceFilter,
    },
  });
}

/**
 * Define a manually-triggered workflow.
 */
export function defineManualWorkflow<TInput, TOutput, TName extends string>(
  config: Omit<WorkflowRegistrationConfig<TInput, TOutput, TName>, "trigger">,
): WorkflowDefinition<TInput, TOutput, TName> {
  return defineWorkflow({
    ...config,
    trigger: { type: "manual" },
  });
}
