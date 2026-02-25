#!/usr/bin/env bun
/**
 * tasks-without-skills.test.ts
 *
 * Comprehensive validation tests for tasks-without-skills.ts
 * 
 * Tests:
 * 1. Tasks without skills are returned
 * 2. Tasks with skills are filtered out
 * 3. Nested tasks are properly traversed
 * 4. Path breadcrumbs are correctly maintained
 * 5. Edge cases (empty trees, single tasks, etc.)
 */

import { describe, it, expect } from "bun:test";

// ---------------------------------------------------------------------------
// Mock Types
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
// Logic Functions (copied from main script)
// ---------------------------------------------------------------------------

function hasSkillLabel(labels: string[] | undefined): boolean {
  if (!labels) return false;
  return labels.some((label) => label.startsWith("skill:"));
}

function collectTasksWithoutSkills(
  node: TreeNode,
  taskDetailsMap: Map<string, TaskDetails>,
  path: string[] = []
): TaskWithoutSkill[] {
  const results: TaskWithoutSkill[] = [];
  const currentPath = [...path, node.id];

  // Retrieve full task details to get labels
  const taskDetails = taskDetailsMap.get(node.id);
  if (!taskDetails) {
    throw new Error(`Task details not found for ${node.id}`);
  }

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
      results.push(...collectTasksWithoutSkills(child, taskDetailsMap, currentPath));
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Test Scenarios
// ---------------------------------------------------------------------------

describe("tasks-without-skills", () => {
  describe("filtering tasks with/without skills", () => {
    it("should return a task without skill labels", () => {
      const tree: TreeNode = {
        id: "task-1",
        title: "No Skills Task",
        status: "pending",
        priority: "high",
        type: "task",
      };

      const taskDetailsMap = new Map<string, TaskDetails>([
        [
          "task-1",
          {
            id: "task-1",
            title: "No Skills Task",
            status: "pending",
            priority: "high",
            labels: [],
          },
        ],
      ]);

      const result = collectTasksWithoutSkills(tree, taskDetailsMap);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "task-1",
        title: "No Skills Task",
        status: "pending",
        priority: "high",
        path: ["task-1"],
      });
    });

    it("should filter out a task with skill labels", () => {
      const tree: TreeNode = {
        id: "task-1",
        title: "Skilled Task",
        status: "pending",
        priority: "high",
        type: "task",
      };

      const taskDetailsMap = new Map<string, TaskDetails>([
        [
          "task-1",
          {
            id: "task-1",
            title: "Skilled Task",
            status: "pending",
            priority: "high",
            labels: ["skill:go-developer"],
          },
        ],
      ]);

      const result = collectTasksWithoutSkills(tree, taskDetailsMap);

      expect(result).toHaveLength(0);
    });

    it("should filter out tasks with multiple skill labels including skill: prefix", () => {
      const tree: TreeNode = {
        id: "task-1",
        title: "Multi-Skill Task",
        status: "pending",
        priority: "high",
        type: "task",
      };

      const taskDetailsMap = new Map<string, TaskDetails>([
        [
          "task-1",
          {
            id: "task-1",
            title: "Multi-Skill Task",
            status: "pending",
            priority: "high",
            labels: ["bug-fix", "skill:typescript", "urgent"],
          },
        ],
      ]);

      const result = collectTasksWithoutSkills(tree, taskDetailsMap);

      expect(result).toHaveLength(0);
    });

    it("should return task when labels array is undefined", () => {
      const tree: TreeNode = {
        id: "task-1",
        title: "No Labels Task",
        status: "pending",
        priority: "high",
        type: "task",
      };

      const taskDetailsMap = new Map<string, TaskDetails>([
        [
          "task-1",
          {
            id: "task-1",
            title: "No Labels Task",
            status: "pending",
            priority: "high",
            // undefined labels
          },
        ],
      ]);

      const result = collectTasksWithoutSkills(tree, taskDetailsMap);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("task-1");
    });
  });

  describe("nested task tree traversal", () => {
    it("should traverse multiple levels and filter correctly", () => {
      const tree: TreeNode = {
        id: "root",
        title: "Root Task",
        status: "pending",
        priority: "high",
        type: "task",
        children: [
          {
            id: "child-1",
            title: "Child Without Skill",
            status: "in_progress",
            priority: "medium",
            type: "task",
          },
          {
            id: "child-2",
            title: "Child With Skill",
            status: "pending",
            priority: "low",
            type: "task",
          },
          {
            id: "child-3",
            title: "Another Child Without Skill",
            status: "completed",
            priority: "high",
            type: "task",
          },
        ],
      };

      const taskDetailsMap = new Map<string, TaskDetails>([
        ["root", { id: "root", title: "Root Task", status: "pending", priority: "high", labels: [] }],
        ["child-1", { id: "child-1", title: "Child Without Skill", status: "in_progress", priority: "medium", labels: [] }],
        ["child-2", { id: "child-2", title: "Child With Skill", status: "pending", priority: "low", labels: ["skill:orchestrator"] }],
        ["child-3", { id: "child-3", title: "Another Child Without Skill", status: "completed", priority: "high", labels: [] }],
      ]);

      const result = collectTasksWithoutSkills(tree, taskDetailsMap);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe("root");
      expect(result[1].id).toBe("child-1");
      expect(result[2].id).toBe("child-3");

      // Verify child-2 (with skill) is filtered out
      const hasChild2 = result.some((t) => t.id === "child-2");
      expect(hasChild2).toBeFalse();
    });

    it("should maintain correct path breadcrumbs for nested tasks", () => {
      const tree: TreeNode = {
        id: "root",
        title: "Root",
        status: "pending",
        priority: "high",
        type: "task",
        children: [
          {
            id: "parent",
            title: "Parent",
            status: "pending",
            priority: "high",
            type: "task",
            children: [
              {
                id: "grandchild",
                title: "Grandchild",
                status: "pending",
                priority: "high",
                type: "task",
              },
            ],
          },
        ],
      };

      const taskDetailsMap = new Map<string, TaskDetails>([
        ["root", { id: "root", title: "Root", status: "pending", priority: "high", labels: [] }],
        ["parent", { id: "parent", title: "Parent", status: "pending", priority: "high", labels: [] }],
        ["grandchild", { id: "grandchild", title: "Grandchild", status: "pending", priority: "high", labels: [] }],
      ]);

      const result = collectTasksWithoutSkills(tree, taskDetailsMap);

      expect(result).toHaveLength(3);
      expect(result[0].path).toEqual(["root"]);
      expect(result[1].path).toEqual(["root", "parent"]);
      expect(result[2].path).toEqual(["root", "parent", "grandchild"]);
    });

    it("should handle deep nesting with mixed skill labels", () => {
      const tree: TreeNode = {
        id: "level-0",
        title: "Level 0",
        status: "pending",
        priority: "high",
        type: "task",
        children: [
          {
            id: "level-1-a",
            title: "Level 1A (no skill)",
            status: "pending",
            priority: "high",
            type: "task",
            children: [
              {
                id: "level-2-a",
                title: "Level 2A (with skill)",
                status: "pending",
                priority: "high",
                type: "task",
              },
              {
                id: "level-2-b",
                title: "Level 2B (no skill)",
                status: "pending",
                priority: "high",
                type: "task",
              },
            ],
          },
          {
            id: "level-1-b",
            title: "Level 1B (with skill)",
            status: "pending",
            priority: "high",
            type: "task",
          },
        ],
      };

      const taskDetailsMap = new Map<string, TaskDetails>([
        ["level-0", { id: "level-0", title: "Level 0", status: "pending", priority: "high", labels: [] }],
        ["level-1-a", { id: "level-1-a", title: "Level 1A (no skill)", status: "pending", priority: "high", labels: [] }],
        ["level-1-b", { id: "level-1-b", title: "Level 1B (with skill)", status: "pending", priority: "high", labels: ["skill:dev"] }],
        ["level-2-a", { id: "level-2-a", title: "Level 2A (with skill)", status: "pending", priority: "high", labels: ["skill:worker"] }],
        ["level-2-b", { id: "level-2-b", title: "Level 2B (no skill)", status: "pending", priority: "high", labels: [] }],
      ]);

      const result = collectTasksWithoutSkills(tree, taskDetailsMap);

      expect(result).toHaveLength(3);
      expect(result.map((t) => t.id)).toEqual(["level-0", "level-1-a", "level-2-b"]);
      expect(result.map((t) => t.path)).toEqual([
        ["level-0"],
        ["level-0", "level-1-a"],
        ["level-0", "level-1-a", "level-2-b"],
      ]);
    });
  });

  describe("edge cases", () => {
    it("should handle a single task with no children", () => {
      const tree: TreeNode = {
        id: "single",
        title: "Single Task",
        status: "pending",
        priority: "high",
        type: "task",
      };

      const taskDetailsMap = new Map<string, TaskDetails>([
        ["single", { id: "single", title: "Single Task", status: "pending", priority: "high", labels: [] }],
      ]);

      const result = collectTasksWithoutSkills(tree, taskDetailsMap);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("single");
    });

    it("should handle empty children array", () => {
      const tree: TreeNode = {
        id: "parent",
        title: "Parent",
        status: "pending",
        priority: "high",
        type: "task",
        children: [],
      };

      const taskDetailsMap = new Map<string, TaskDetails>([
        ["parent", { id: "parent", title: "Parent", status: "pending", priority: "high", labels: [] }],
      ]);

      const result = collectTasksWithoutSkills(tree, taskDetailsMap);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("parent");
    });

    it("should handle all descendants with skills", () => {
      const tree: TreeNode = {
        id: "root",
        title: "Root",
        status: "pending",
        priority: "high",
        type: "task",
        children: [
          {
            id: "child-1",
            title: "Child 1",
            status: "pending",
            priority: "high",
            type: "task",
          },
          {
            id: "child-2",
            title: "Child 2",
            status: "pending",
            priority: "high",
            type: "task",
          },
        ],
      };

      const taskDetailsMap = new Map<string, TaskDetails>([
        ["root", { id: "root", title: "Root", status: "pending", priority: "high", labels: ["skill:orchestrator"] }],
        ["child-1", { id: "child-1", title: "Child 1", status: "pending", priority: "high", labels: ["skill:go"] }],
        ["child-2", { id: "child-2", title: "Child 2", status: "pending", priority: "high", labels: ["skill:ts"] }],
      ]);

      const result = collectTasksWithoutSkills(tree, taskDetailsMap);

      expect(result).toHaveLength(0);
    });

    it("should handle non-skill labels correctly", () => {
      const tree: TreeNode = {
        id: "task-1",
        title: "Task with non-skill labels",
        status: "pending",
        priority: "high",
        type: "task",
      };

      const taskDetailsMap = new Map<string, TaskDetails>([
        [
          "task-1",
          {
            id: "task-1",
            title: "Task with non-skill labels",
            status: "pending",
            priority: "high",
            labels: ["bug", "urgent", "documentation", "refactor"],
          },
        ],
      ]);

      const result = collectTasksWithoutSkills(tree, taskDetailsMap);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("task-1");
    });

    it("should properly preserve task metadata in results", () => {
      const tree: TreeNode = {
        id: "task-1",
        title: "Complex Task",
        status: "in_progress",
        priority: "critical",
        type: "task",
      };

      const taskDetailsMap = new Map<string, TaskDetails>([
        [
          "task-1",
          {
            id: "task-1",
            title: "Complex Task",
            status: "in_progress",
            priority: "critical",
            labels: ["documentation"],
          },
        ],
      ]);

      const result = collectTasksWithoutSkills(tree, taskDetailsMap);

      expect(result).toHaveLength(1);
      const task = result[0];
      expect(task.id).toBe("task-1");
      expect(task.title).toBe("Complex Task");
      expect(task.status).toBe("in_progress");
      expect(task.priority).toBe("critical");
    });
  });

  describe("skill label detection", () => {
    it("should detect skill: prefix case-sensitively", () => {
      expect(hasSkillLabel(["skill:go"])).toBeTrue();
      expect(hasSkillLabel(["skill:typescript"])).toBeTrue();
      expect(hasSkillLabel(["SKILL:go"])).toBeFalse();
      expect(hasSkillLabel(["Skill:go"])).toBeFalse();
    });

    it("should handle labels with only skill: prefix", () => {
      expect(hasSkillLabel(["skill:"])).toBeTrue();
    });

    it("should not match partial skill: strings", () => {
      expect(hasSkillLabel(["my-skill:label"])).toBeFalse();
      expect(hasSkillLabel(["label:skill"])).toBeFalse();
    });
  });
});
