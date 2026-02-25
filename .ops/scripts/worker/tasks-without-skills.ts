#!/usr/bin/env bun
/**
 * tasks-without-skills.ts
 *
 * Recursively traverses a task tree and filters for tasks that don't have
 * a "skill:<skill-name>" label.
 *
 * Usage:
 *   bun tasks-without-skills.ts <task-id>
 *
 * Output (stdout):
 *   JSON array of tasks without skill labels, each with:
 *   {
 *     id: string;
 *     title: string;
 *     status: string;
 *     priority: string;
 *     path: string[];  // breadcrumb path from root to this task
 *   }
 */

import { spawnSync } from "child_process";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TreeNode {
  id: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  children?: TreeNode[];
}

interface TaskDetails {
  id: string;
  title: string;
  status: string;
  priority: string;
  labels?: string[];
}

interface TaskWithoutSkill {
  id: string;
  title: string;
  status: string;
  priority: string;
  path: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function td(...args: string[]): string {
  const result = spawnSync("td", args, { encoding: "utf8" });
  if (result.error) throw new Error(`td exec error: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`td ${args.join(" ")} failed (exit ${result.status}): ${result.stderr}`);
  }
  return result.stdout.trim();
}

function hasSkillLabel(labels: string[] | undefined): boolean {
  if (!labels) return false;
  return labels.some((label) => label.startsWith("skill:"));
}

/**
 * Retrieve full task details including labels
 */
function getTaskDetails(taskId: string): TaskDetails {
  try {
    const raw = td("show", taskId, "--json");
    return JSON.parse(raw) as TaskDetails;
  } catch (err) {
    throw new Error(`Failed to fetch details for task ${taskId}: ${err}`);
  }
}

/**
 * Recursively traverse the tree and collect tasks without skill labels
 */
function collectTasksWithoutSkills(
  node: TreeNode,
  path: string[] = []
): TaskWithoutSkill[] {
  const results: TaskWithoutSkill[] = [];
  const currentPath = [...path, node.id];

  // Retrieve full task details to get labels
  const taskDetails = getTaskDetails(node.id);

  // Check if current node lacks a skill label
  if (!hasSkillLabel(taskDetails.labels)) {
    results.push({
      id: taskDetails.id,
      title: taskDetails.title,
      status: taskDetails.status,
      priority: taskDetails.priority,
      path: currentPath,
    });
  }

  // Recursively process children
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      results.push(...collectTasksWithoutSkills(child, currentPath));
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const taskId = args.find((a) => !a.startsWith("--"));

if (!taskId) {
  console.error("Usage: bun tasks-without-skills.ts <task-id>");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

try {
  // Fetch the tree
  const raw = td("tree", taskId, "--json");
  const tree = JSON.parse(raw) as TreeNode;

  // Collect all tasks without skill labels
  const tasksWithoutSkills = collectTasksWithoutSkills(tree);

  // Output as JSON array
  console.log(JSON.stringify(tasksWithoutSkills, null, 2));
} catch (err) {
  console.error(`Error: ${err}`);
  process.exit(1);
}
