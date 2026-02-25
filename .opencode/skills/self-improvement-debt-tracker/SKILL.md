---
name: self-improvement-debt-tracker
description: Track technical debt tasks for the development-orchestrator skill.
compatibility: opencode
metadata:
  maturity: experimental
  note: "Minimal skill — error detection heuristics are not yet integrated into development-orchestrator. Expand before relying on this in production."
---

# Self-improvement debt tracker

Track technical debt tasks for the development-orchestrator skill.

**Purpose**: Create tasks in an "agent-tech-debt" epic whenever errors occur or large token parsing operations are needed.

---

## Error Detection and Task Creation

When an error occurs during development-orchestrator execution:

1. **Capture error context**:
   - Error message and stack trace
   - Phase where error occurred (artifact authoring, task execution, review, etc.)
   - Change name being worked on
   - Timestamp

2. **Create technical debt task**:

   ````bash
   td create "Fix: <error-summary>" --type task --epic agent-tech-debt \
     --body "**Error occurred during:** <phase>\n\n**Change:** <change-name>\n\n**Error details:**\n\n```
   ````

   <error-message>\n <stack-trace>\n `\n\n**Context:**\n- Phase: <phase>\n- Change: <change-name>\n- Timestamp: <timestamp>\n\n**Sample:**\n`\n<error-sample>\n```"

   ```

   ```

3. **Link to relevant artifacts**:
   - Link to the change proposal.md
   - Link to any spec.md files involved
   - Link to design.md if applicable

## Large Token Parsing Detection

When parsing large amounts of tokens (detected by token count or processing time):

1. **Capture parsing context**:
   - Operation being performed (reading large files, processing complex data)
   - Estimated token count
   - Duration of operation
   - Phase where parsing occurred

2. **Create optimization task**:

   ````bash
   td create "Optimize: <operation-description>" --type task --epic agent-tech-debt \
     --body "**Large token parsing detected during:** <phase>\n\n**Operation:** <description>\n\n**Metrics:**\n- Estimated tokens: <count>\n- Duration: <time>\n- Phase: <phase>\n\n**Context:**\n- Change: <change-name>\n- Timestamp: <timestamp>\n\n**Sample:**\n```\n<operation-sample>\n```"
   ````

3. **Link to relevant files**:
   - Link to files being parsed
   - Link to any templates or patterns used

## Task Management

- **Epic creation**: Ensure "agent-tech-debt" epic exists:

  ```bash
  td epic create "agent-tech-debt" --desc "Technical debt tasks for agent improvements"
  ```

- **Task prioritization**: All tasks default to medium priority
- **Task assignment**: Tasks are unassigned (agent will handle them)
- **Task tracking**: Tasks remain in "agent-tech-debt" epic until resolved

## Integration Points

This skill integrates with development-orchestrator at these points:

1. **Before artifact creation**: Monitor for potential large token operations
2. **During task execution**: Monitor for errors and performance issues
3. **During review**: Monitor for complex review scenarios requiring large context

## Usage Examples

**Error scenario**:

````bash
# During artifact authoring, a template fails to render
# Skill creates task:
td create "Fix: template rendering failure" --type task --epic agent-tech-debt \
  --body "**Error occurred during:** artifact authoring\n\n**Change:** add-user-auth\n\n**Error details:**\n\n```\nTemplate rendering failed: invalid syntax in template file\nStack trace: ...\n```\n\n**Context:**\n- Phase: artifact authoring\n- Change: add-user-auth\n- Timestamp: 2026-02-24T10:30:00Z\n\n**Sample:**\n```\nTemplate error: unexpected token in template file\n```"
````

**Large token parsing scenario**:

````bash
# During design phase, parsing 50k+ token design document
# Skill creates task:
td create "Optimize: large design document parsing" --type task --epic agent-tech-debt \
  --body "**Large token parsing detected during:** design phase\n\n**Operation:** parsing design.md with 50,000+ tokens\n\n**Metrics:**\n- Estimated tokens: 50,000+\n- Duration: 15 seconds\n- Phase: design\n\n**Context:**\n- Change: add-user-auth\n- Timestamp: 2026-02-24T10:45:00Z\n\n**Sample:**\n```\nParsing design.md took 15 seconds with 50,000+ tokens\n```"
````

## Activation Logic

This skill is only active when:

1. development-orchestrator skill is loaded
2. Agent is performing development-orchestrator tasks
3. Errors occur or large token operations are detected

## Base directory for this skill: file:///home/em/repos/oss/openspec-td/.opencode/skills/self-improvement-debt-tracker

Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.
Note: file list is sampled.

<skill_files>

</skill_files>

