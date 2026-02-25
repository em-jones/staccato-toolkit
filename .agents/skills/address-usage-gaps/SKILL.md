---
name: address-usage-gaps
description: Research skills for tasks
---

## Workflow

For each assigned task id:

1. **Identify gaps** — Run `td context <id>` to read the full task context. From the task body,
   identify every technology, library, tool, or pattern the task requires. Determin if you already
   have the skills.

2. **Create missing skills** — For each technology with no existing skill, use the `find-skills`
   skill to download any relevant existing skills.
   - Use `uvx skill-audit ./.agents/skills/<skill_name>/` to check each skill for vulnerabilities
     and edit the skill based on the findings
   - If you had to create more than one skill, create a composite skill that encompasses all
     required capabilities, e.g. `go-http-service` that includes both `go-developer` and
     `observability-instrumentation` guidance.
   - If you aren't able to find a skill using the `find-skills` skill, use the `auto-skill-creator`
     skill to build one. Run `auto-skill-creator` in **autonomous mode** — research the technology
     using `jcodemunch_*` and `jdocmunch_*` tools, then author and iterate on the skill to
     completion without waiting for user input.

3. **Apply label** —

   **IMPORTANT**

- The `skill_name` in the label should match the directory name of the skill created, e.g.
  `skill:zerolog`, `skill:chi`.
- Skills are stored in `.agents/skills/<skill-name>/SKILL.md`.
- Log progress with `td log` as you work through each task.

  ```bash
  td update <id> --labels "skill:<skill_name>"
  ```
