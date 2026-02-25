---
name: Create Usage Rules
description: Instructions on how to create usage rules for a given package/technology/tool/pattern
metadata:
  workflow: design
---

## Inputs

- $TECHNICAL_DOMAIN: the technical domain to which the package belongs (e.g., "orchestration",
  "monitoring", "infrastructure-as-code", etc.)
- $PACKAGE_NAME: name of the package, technology, tool, or pattern for which usage rules are being
  created
- $CHANGE_NAME: the openspec change name that is triggering this rule creation

## Goal

Create a comprehensive set of rules for the specified package/technology/tool/pattern.

> **Note for workers**: If you identify a knowledge gap while implementing a task (e.g., no usage
> rules exist for a library or tool you need to use), invoke this skill to create them before
> proceeding.

## Operating constraints

- MUST follow [domain management](../../rules/README.md)
- Write a `markdown` file in a condensed format that would be useful for agents to work with your
  tool.
- MANDATORY: aggressively prune and edit it for clarity, conciseness, and relevance.
- MANDATORY: use [Ash Framework's usage-rules.md](./reference/example.md) as a reference example.
- **Technology aggregation**: all rules for a given technology ecosystem (e.g., `go`, `node`, `k8s`,
  `bash`) MUST be written into a **single file** for that technology. Do NOT create subdirectory
  files. If rules for multiple tools or sub-topics exist within the same technology, combine them
  into sections within the single file with a table of contents.
- The files are always written to the `.opencode/rules/[$TECHNICAL_DOMAIN]/[$PACKAGE_NAME].md` path
- **MANDATORY**: include lifecycle frontmatter at the top of every rule file created:

  ```yaml
  ---
  created-by-change: <change> # The $CHANGE_NAME that triggered this rule
  last-validated: <YYYY-MM-DD> # Set to today's date at creation; updated at verify
  ---
  ```

- **MANDATORY**: include a table of contents for any file with more than 2 sections. Use anchor
  links matching the section headers.

## References

Include a **References** section at the end of your usage rules file with links to all external sources used:

- Official documentation links for the package/tool/technology
- Framework specifications or guidelines
- Related OpenSpec rules or artifacts in this repository
- Best practices guides or architectural decision records (ADRs)

Format references as a markdown list with descriptive link text and URLs. This helps agents and future maintainers trace the source of the rules and verify accuracy.

Example:

```markdown
## References

- [Official Package Documentation](https://example.com/docs)
- [Best Practices Guide](https://example.com/best-practices)
- [Related ADR: Architecture Decision](../../adr/0001-example.md)
- [Framework Specification](https://spec.example.com)
```
