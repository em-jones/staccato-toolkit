#!/usr/bin/env bun
/**
 * td-next-task.ts
 *
 * Given a worker epic ID, finds the next actionable task using:
 *   1. Priority  (P0 > P1 > P2 > P3 > P4)
 *   2. No open blockers  (all dependencies closed or absent)  [next_implement only]
 *   3. Fewest remaining dependencies  (tie-break: least blocked-by count)  [next_implement only]
 *
 * Usage:
 *   bun td-next-task.ts <worker-epic-id>
 *
 * Mode inference:
 *   The mode is automatically determined from the epic's status:
 *   - "in_progress"  →  next_implement  (find open/blocked tasks with no open deps)
 *   - "in_review"    →  reviewable      (find highest-priority in_review tasks)
 *
 * Output (stdout):
 *   On success:  single line  →  <id>  <title>
 *   No work:     exits 0, prints "NO_TASKS"
 *   Error:       exits 1, prints to stderr
 *
 * The script shells out to `td` — it must be on PATH.
 */

import { spawnSync } from "child_process";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Mode = "next_implement" | "reviewable";

interface TreeNode {
  id: string;
  title: string;
  status: "open" | "in_progress" | "in_review" | "blocked" | "closed";
  priority: string; // "P0" | "P1" | "P2" | "P3" | "P4"
  type: string;
  labels?: string[];
  body?: string;
  children?: TreeNode[];
}

interface DepResult {
  dependencies: string[] | null;
  issue: { id: string; status: string };
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

function priorityRank(p: string): number {
  const map: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 };
  return map[p] ?? 99;
}

/** Collect all leaf-level nodes matching the target statuses from a tree */
function collectCandidates(node: TreeNode, targetStatuses: Set<string>, acc: TreeNode[] = []): TreeNode[] {
  const isLeaf = !node.children || node.children.length === 0;

  if (targetStatuses.has(node.status) && isLeaf) {
    acc.push(node);
  }

  if (node.children) {
    for (const child of node.children) {
      collectCandidates(child, targetStatuses, acc);
    }
  }
  return acc;
}

interface Candidate {
  node: TreeNode;
  openDepCount: number;   // number of deps not yet closed
  blockedByCount: number; // number of issues that depend ON this one
}

function getDeps(id: string): DepResult {
  const raw = td("dep", id, "--json");
  return JSON.parse(raw) as DepResult;
}

function isDepClosed(depId: string): boolean {
  try {
    const raw = td("show", depId, "--json");
    const issue = JSON.parse(raw) as { status: string };
    return issue.status === "closed";
  } catch {
    return false;
  }
}

function getBlockedByCount(id: string): number {
  try {
    const raw = td("dep", id, "--blocking", "--json");
    const result = JSON.parse(raw) as { blocked: string[] | null };
    return result.blocked?.length ?? 0;
  } catch {
    return 0;
  }
}

function extractSkillFromLabels(labels: string[] | undefined): string | null {
  if (!labels) return null;
  const skillLabel = labels.find((label) => label.startsWith("skill:"));
  return skillLabel ?? null;
}

function getTaskContext(node: TreeNode): string {
  return node.body || node.title;
}

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

const epicId = args.find((a) => !a.startsWith("--"));
if (!epicId) {
  console.error("Usage: bun td-next-task.ts <worker-epic-id>");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

// 1. Fetch the epic's status to determine mode
let mode: Mode;
try {
  const raw = td("show", epicId, "--json");
  const epic = JSON.parse(raw) as { status: string };
  
  if (epic.status === "in_review") {
    mode = "reviewable";
  } else if (epic.status === "in_progress") {
    mode = "next_implement";
  } else {
    throw new Error(
      `Epic status "${epic.status}" does not map to a valid mode. ` +
      `Expected "in_progress" (→ next_implement) or "in_review" (→ reviewable).`
    );
  }
} catch (err) {
  console.error(`Failed to determine mode from epic ${epicId}: ${err}`);
  process.exit(1);
}

// 2. Fetch the tree
let tree: TreeNode;
try {
  const raw = td("tree", epicId, "--json");
  tree = JSON.parse(raw) as TreeNode;
} catch (err) {
  console.error(`Failed to fetch tree for ${epicId}: ${err}`);
  process.exit(1);
}

// 3. Collect candidates by mode
const targetStatuses: Set<string> =
  mode === "reviewable"
    ? new Set(["in_review"])
    : new Set(["open", "blocked"]);

const rawCandidates = collectCandidates(tree, targetStatuses);

if (rawCandidates.length === 0) {
  console.log("NO_TASKS");
  process.exit(0);
}

// 4. reviewable mode: no dep enrichment needed — sort by priority and return
if (mode === "reviewable") {
  rawCandidates.sort(
    (a, b) => priorityRank(a.priority) - priorityRank(b.priority)
  );
  const winner = rawCandidates[0];
  const skill = extractSkillFromLabels(winner.labels);
  const context = getTaskContext(winner);
  
  if (!skill) {
    throw new Error(`Task ${winner.id} has no skill label`);
  }
  
  console.log(JSON.stringify({
    id: winner.id,
    context,
    skill
  }));
  process.exit(0);
}

// 5. next_implement mode: enrich with dep data
const enriched: Candidate[] = rawCandidates.map((node) => {
  let openDepCount = 0;
  let blockedByCount = 0;

  try {
    const depResult = getDeps(node.id);
    const deps = depResult.dependencies ?? [];
    openDepCount = deps.filter((d) => !isDepClosed(d)).length;
  } catch {
    openDepCount = 0;
  }

  try {
    blockedByCount = getBlockedByCount(node.id);
  } catch {
    blockedByCount = 0;
  }

  return { node, openDepCount, blockedByCount };
});

// 6. Filter: only issues with zero open deps (truly unblocked)
const unblocked = enriched.filter((c) => c.openDepCount === 0);

if (unblocked.length === 0) {
  // All candidates have open deps — report the least-blocked one for diagnostics
  enriched.sort(
    (a, b) =>
      priorityRank(a.node.priority) - priorityRank(b.node.priority) ||
      a.openDepCount - b.openDepCount
  );
  const top = enriched[0];
  console.error(
    `All tasks are blocked. Least-blocked candidate: ${top.node.id} "${top.node.title}" (${top.openDepCount} open deps)`
  );
  console.log("NO_TASKS");
  process.exit(0);
}

// 7. Sort by: priority ASC, then openDepCount ASC (always 0 here), then blockedByCount ASC
unblocked.sort(
  (a, b) =>
    priorityRank(a.node.priority) - priorityRank(b.node.priority) ||
    a.openDepCount - b.openDepCount ||
    a.blockedByCount - b.blockedByCount
);

const winner = unblocked[0];
const skill = extractSkillFromLabels(winner.node.labels);
const context = getTaskContext(winner.node);

if (!skill) {
  throw new Error(`Task ${winner.node.id} has no skill label`);
}

console.log(JSON.stringify({
  id: winner.node.id,
  context,
  skill
}));
process.exit(0);
