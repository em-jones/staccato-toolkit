# Usage Rules

Usage rules are the authoritative guidance for how agents approach solution domains and technology decisions in the staccato-toolkit platform. Each rule follows a consistent structure and focuses on a single solution domain, following the DRY (Don't Repeat Yourself) principle.

## Directory Structure

```
.opencode/rules/
├── technologies/          # Domain-specific rules for specific technologies (flat files, one per ecosystem)
│   ├── go.md              # Go: chi, servicedefaults, testing, golangci-lint
│   ├── node.md            # Node.js: TypeScript, npm, Express, Jest, Playwright, ESLint, Prettier
│   ├── k8s.md             # Kubernetes: kubectl, k9s, kube-linter, KubeVela, Skaffold
│   ├── bash.md            # Bash: script standards, shellcheck, shfmt
│   ├── rpc.md             # RPC: gRPC, Protocol Buffers
│   ├── dagger.md          # Dagger CI/CD automation
│   ├── yq.md              # yq YAML/JSON processor
│   ├── backstage.md       # Backstage: entity model, plugins, TechDocs, React, security
│   └── ...                # Other standalone technology files
└── patterns/              # Cross-cutting patterns used across multiple technologies
    ├── architecture/
    ├── code/
    ├── delivery/
    ├── observability/
    └── operations/
```

## File Format

Each usage rule file documents a single technology **ecosystem** (not a single tool). When a technology has multiple related tools or sub-topics, they are combined into sections within a single file with a table of contents.

**Aggregation rule**: All rules for a technology ecosystem (e.g., `go`, `node`, `k8s`) MUST be in one file. Do not create subdirectories.

Each file follows this structure:

1. **Frontmatter** - Lifecycle metadata (created-by-change, last-validated)
2. **Title and Description** - What is this ecosystem and what problem does it solve?
3. **Table of Contents** - Anchor links to all major sections (required for files with >2 sections)
4. **Per-Tool or Per-Topic Sections** - Core Principle, Setup, Key Guidelines, Common Issues
5. **See Also** - Links to related rules and resources

See [TEMPLATE.md](./TEMPLATE.md) for the complete template.

## Automated Discovery

Usage rules are discovered automatically by the agent coordination system using the **filesystem-walk** pattern. No index or registry file is required or maintained. The coordination skill resolves all `.md` files under `.opencode/rules/` at runtime and surfaces them to the agent's context.

## Creating New Usage Rules

When a new technology is adopted in an openspec change:

1. **Triggered by:** Technology adoption documented in `design.md` → `## Technology Adoption & Usage Rules` table (status: `pending`)
2. **Who creates:** The platform-architect, or a worker agent that identifies a gap during implementation
3. **When:** During the design phase, before the design artifact is marked complete
4. **Where:** `.opencode/rules/technologies/<ecosystem>.md` (all tools for an ecosystem in one file) or `.opencode/rules/patterns/<pattern>/<name>.md`
5. **Format:** Follow the structure in [TEMPLATE.md](./TEMPLATE.md) — frontmatter fields are required
6. **Record:** Add an entry to `design.md`'s `## Technology Adoption & Usage Rules` table with status `created`

## Maintaining Usage Rules

- **Review:** Rules are validated at the verify phase of the change that created or modified them
- **Updates:** `last-validated` is updated in frontmatter when the platform-architect confirms accuracy at verify
- **Lifecycle tracking:** Use frontmatter fields — `created-by-change`, `last-validated`
- **Linking:** Rules are referenced from design documents in the `## Technology Adoption & Usage Rules` table

## Deprecating Usage Rules

When a technology is no longer in use:

1. Mark the rule as deprecated at the top:
   ```markdown
   **DEPRECATED** (Reason: Technology replaced by [alternative], Deprecated: YYYY-MM-DD)
   ```
2. If there's a replacement, link to it:
   ```markdown
   See [Replacement Rule](./replacement.md) for current guidance.
   ```
3. Deprecated rules remain in git history for reference
4. Rules without active usage after 6 months may be archived

## Discovery and Linking

Usage rules are discovered and referenced through:

1. **Automated surfacing:** Agent coordination skill walks `.opencode/rules/` at session start — no manual lookup needed
2. **From design documents:** `## Technology Adoption & Usage Rules` table links to rule files
3. **From code comments:** Implementation code can reference rules for context

Example frontmatter in a rule file:
```yaml
---
created-by-change: add-monitoring-stack
last-validated: 2026-02-20
---
```
