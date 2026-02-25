---
name: structured-data
description: Patterns for extracting and processing structured data from CLI tools. Use jq for JSON, yq for YAML, and md-tree for Markdown. Apply these patterns instead of manual parsing to reduce token usage and improve clarity.
compatibility: opencode
metadata:
  maturity: stable
---

# Structured Data Patterns

Use these tools for all structured data operations. Avoid manual parsing with grep/awk/sed.

## `jq` — JSON

Parse JSON output from CLI tools:

```bash
# Extract a single field
openspec status --change "my-change" --json | jq -r '.schemaName'

# Extract array elements
openspec list --json | jq -r '.[].name'

# Conditional check (exit 1 if empty)
td ls --ancestor <id> --status open --json | jq -e 'length > 0'

# Filter and transform
td ls --board "<board>" --json | jq -r '.[] | select(.status == "open") | .id + " " + .title'
```

## `yq` — YAML

Read YAML frontmatter and entity files:

```bash
# Read a frontmatter field from a markdown file
yq -r '.td-board' openspec/changes/my-change/proposal.md

# Read a field from a catalog entity
yq -r '.metadata.name' .entities/component-platform.yaml

# List all entity names
for f in .entities/*.yaml; do
  yq -r '"\(.kind): \(.metadata.name)"' "$f"
done

# Check if a field exists
yq -r '.component // empty' openspec/changes/my-change/design.md
```

## `md-tree` — Markdown

Extract sections from markdown files by heading. Use this instead of grep for markdown content.

The `read-from-md-link` skill demonstrates the canonical pattern:

```bash
# Extract a section by heading name
md-tree extract README.md "Vision"

# Extract from a change artifact
md-tree extract openspec/changes/my-change/design.md "Technology Adoption & Usage Rules"

# Extract from a spec
md-tree extract openspec/changes/my-change/specs/api/spec.md "Requirements"
```

Link format shorthand: `README.md#Vision` → `md-tree extract README.md "Vision"`

## When to Use Each Tool

| Data source | Tool |
|---|---|
| `openspec` CLI output | `jq` |
| `td` CLI output (`--json`) | `jq` |
| YAML entity files (`.entities/`) | `yq` |
| Markdown frontmatter | `yq` |
| Markdown section content | `md-tree extract` |
| `devbox.json`, `package.json` | `jq` |
| `go.mod` | `grep` (no structured tool; direct text) |

## Guardrails

- Always use `--json` / `-o yaml` flags when available on CLI tools
- Prefer `jq -r` (raw output, no quotes) for string values; omit `-r` when piping JSON to next command
- Use `yq -r` for scalar values; omit `-r` when the output will be further processed as YAML
- `md-tree extract` returns the full subtree under the heading — pipe to `md-tree` again to narrow further if needed
- Do not use `cat` + manual parsing when a structured tool is available
