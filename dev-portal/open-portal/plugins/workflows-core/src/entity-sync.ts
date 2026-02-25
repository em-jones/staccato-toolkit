/**
 * Entity sync task registration — defines scheduled tasks for
 * keeping catalog entities in sync with external sources.
 */

import * as v from "valibot";
import type { WorkflowDefinition } from "./index.js";

/** Entity sync task configuration. */
export const EntitySyncTaskSchema = v.object({
  /** Unique task identifier. */
  id: v.pipe(v.string(), v.minLength(1)),
  /** Human-readable name. */
  name: v.pipe(v.string(), v.minLength(1)),
  /** Cron expression for scheduling. */
  cron: v.pipe(v.string(), v.minLength(1)),
  /** Source type (e.g. "github", "gitlab", "url"). */
  sourceType: v.picklist(["github", "gitlab", "url", "file"]),
  /** Source location (URL, org name, or file path). */
  sourceLocation: v.pipe(v.string(), v.minLength(1)),
  /** Whether to delete entities no longer present in the source. */
  pruneMissing: v.optional(v.boolean(), false),
});

export type EntitySyncTask = v.InferOutput<typeof EntitySyncTaskSchema>;

/**
 * Register an entity sync task as a workflow.
 *
 * @param task - Entity sync task configuration
 * @returns WorkflowDefinition ready for registration with the workflow runtime
 */
export function registerEntitySyncTask(task: EntitySyncTask): WorkflowDefinition {
  return {
    name: `entity-sync-${task.id}`,
    description: `Sync entities from ${task.sourceType}:${task.sourceLocation}`,
    trigger: {
      type: "cron",
      schedule: task.cron,
    },
    inputSchema: v.object({}),
    handler: async () => {
      // Implementation is provided by the workflow engine plugin
      // This is a placeholder that gets replaced at registration time
      return { synced: 0, errors: [] };
    },
  };
}
