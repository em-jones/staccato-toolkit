---
# Lifecycle metadata — required for all usage rule files
created-by-change: <change> # The openspec change that introduced this rule (e.g., add-monitoring-stack)
last-validated: <YYYY-MM-DD> # Date the platform-architect last confirmed this rule reflects reality
---

# [Technology/Pattern Name] Usage Rules

_One to three sentence description of what this technology is and what problem it solves._

## Core Principle

State the guiding philosophy behind why we use this technology or pattern. Include:

- The primary benefit and non-negotiable decisions
- How it aligns with platform values
- One or two sentences maximum

**Example:**

> TypeScript is the standard for all new Node.js code. Strict type checking is mandatory. The `skipLibCheck` setting is false to catch issues in dependencies.

## Setup (if applicable)

Provide boilerplate configuration, templates, or starter code needed to use this technology. Include:

- Configuration file examples (package.json, tsconfig.json, etc.)
- Required dependencies or versions
- Minimal setup to get started

**Example:**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "strict": true,
    "skipLibCheck": false
  }
}
```

## Key Guidelines

Organized guidance on how to use this technology effectively. Break into topics like:

### Topic 1: [Key Aspect]

- Guidance point 1
- Guidance point 2
- Include both positive ✓ and negative ✗ examples

**Example:**

```
// ✓ Good
export function createClient(config: Config): Client { ... }

// ✗ Avoid
export function createClient(config: any): any { ... }
```

### Topic 2: [Another Key Aspect]

Continue with additional topics as needed.

## Common Issues

Document known problems, their solutions, and debugging approaches:

**"[Error message]"**
→ [Solution or debugging steps]

**"[Common question]"**
→ [Answer with context]

## See Also

Link to related rules and external resources:

- [Example Usage Rule](./technologies/go.md) - Related technology
- [Pattern Example](./patterns/architecture/api-design.md) - Cross-cutting pattern
- [External Reference](https://example.com) - Official documentation
