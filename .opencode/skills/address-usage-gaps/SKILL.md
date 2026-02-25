---
name: address-usage-gaps
description: Research skills for tasks
---

## Workflow

For each assigned task id:

1. **Identify gaps** — Run `td context <id>` to read the full task context. From the task body, identify every technology, library, tool, or pattern the task requires. For each one, check whether a usage rule already exists:

   ```bash
   ls .opencode/rules/<domain>/<name>.md 2>/dev/null
   ```

2. **Create missing rules** — For each technology with no existing rule, invoke the `create-usage-rules` skill with:
   - `$TECHNICAL_DOMAIN` — the domain category (e.g., `technologies/go`, `patterns/delivery`)
   - `$PACKAGE_NAME` — the specific tool, library, or pattern name
   - `$CHANGE_NAME` — from the task context (the OpenSpec change that triggered this research task)

3. **Apply label** — After the rule file is written, apply the skill label to the task:

   ```bash
   td update <id> --labels "skill:<skill_name>"
   ```

## Notes

- Each task should be assigned only one skill label. If a task requires multiple skills, create a composite skill that encompasses all required capabilities.
- The `skill_name` in the label should match the filename of the rule created (without extension), e.g. `skill:zerolog`, `skill:chi`.
- Log progress with `td log` as you work through each task.
