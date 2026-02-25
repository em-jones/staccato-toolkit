---
name: technology-audit
description:
  Audit the codebase and catalog for undocumented technologies, patterns, libraries, CLI tools, and
  components. Surfaces gaps where a tool/language/framework/library/pattern is in use but has no
  corresponding OpenSpec change, ADR, usage rule, or catalog entity.
metadata:
  author: platform-architect
  version: "1.0"
---

# Skill: technology-audit

Perform a comprehensive technology audit of the platform. The contract:

> **Don't use a tool, language, framework, library, or pattern without it existing as a change.**

This skill surfaces every gap between what is _actually_ in use in the codebase and what is
_formally documented_ via OpenSpec changes, usage rules, ADRs, and catalog entities. Each gap
becomes either a new change (if the technology should be kept) or a refactoring recommendation (if a
better alternative exists).

This skill is used together with the `dev-portal-manager` skill for catalog gap resolution.

---

## When to Use This Skill

- Periodic platform housekeeping
- After inheriting a codebase that predates the OpenSpec workflow
- When a code review surfaces an undocumented technology choice
- After a fast-moving sprint where "we'll document it later" was said
- Invoked via `/tech-audit` custom command

---

## Inputs

- **`$SCOPE`** _(optional)_: Narrow the audit to a specific layer — `code`, `catalog`, `rules`,
  `changes`, or `all` (default: `all`)
- **`$PATH`** _(optional)_: Subdirectory to scan (default: repo root)

If neither is provided the audit runs in full-scope mode across the entire repository.

---

## Step 1: Orient

Run the session-start orientation:

```bash
td usage --new-session
```

Then announce the audit scope and begin. Do NOT wait for confirmation — proceed immediately.

```
## Technology Audit

Scope: <scope>
Path:  <path>
Date:  <today>

Scanning...
```

---

## Step 2: Collect Evidence — What Is Actually In Use

Gather raw evidence across five lenses. Run all collection steps before analysis.

### 2a. Languages & Runtimes

```bash
# Detect languages by file extension and toolchain files
find . \
  -not -path './.git/*' \
  -not -path './node_modules/*' \
  -not -path './.devbox/*' \
  \( -name "go.mod" -o -name "package.json" -o -name "Cargo.toml" \
     -o -name "pyproject.toml" -o -name "*.tf" -o -name "Makefile" \
     -o -name "*.sh" -o -name "Dockerfile" -o -name "devbox.json" \) \
  2>/dev/null
```

For each `package.json` found (excluding `node_modules`):

```bash
# Extract all dependencies (prod + dev)
jq -r '(.dependencies // {}) + (.devDependencies // {}) | keys[]' <path>/package.json
```

For each `go.mod` found:

```bash
# Extract DIRECT (non-indirect) module dependencies only
grep -E '^require' -A9999 <path>/go.mod | grep -v '^require' | grep -v '// indirect' | awk '{print $1}' | grep -v ')'
```

**IMPORTANT**: Filter out transitive/indirect dependencies. A transitive dependency is one that:

- Is marked `// indirect` in go.mod
- Is only used by another dependency, not directly by platform code
- Would be removed if we removed its parent dependency

Only report technologies that are **direct platform choices** (see
[Transitive Dependency Exclusion](#transitive-dependencies)).

For `devbox.json`:

```bash
jq -r '.packages[]' devbox.json
```

### 2b. CLI Tools & Utilities

```bash
# Commands invoked in shell scripts and Makefiles
grep -rh --include="*.sh" --include="Makefile" --include="*.mk" \
  -oE '\b(kubectl|helm|kustomize|dagger|jq|yq|bun|node|go|docker|kind|skaffold|k9s|trivy|openspec|td)\b' \
  . 2>/dev/null | sort -u
```

Also scan CI/CD pipeline definitions:

```bash
find . -name "*.yml" -o -name "*.yaml" | \
  xargs grep -lh "uses:\|run:\|steps:" 2>/dev/null | \
  grep -v node_modules
```

### 2c. Frameworks & Libraries (beyond package managers)

Look for **direct** framework usage in source code — exclude transitive dependencies pulled in by
generated code:

```bash
# Go: HTTP routers, ORMs, test libraries (direct imports in .go files)
grep -rh --include="*.go" -oE '"(github\.com/[^"]+)"' . \
  --exclude-dir=node_modules --exclude-dir=.devbox \
  2>/dev/null | sort -u | head -60

# TypeScript/JS: framework imports (direct imports in .ts/.tsx/.js files)
grep -rh --include="*.ts" --include="*.tsx" --include="*.js" \
  -oE "from '(@[a-z0-9-]+/[a-z0-9-]+|[a-z0-9-]+)'" \
  --exclude-dir=node_modules \
  . 2>/dev/null | sort -u | head -60
```

**IMPORTANT**: Filter out imports from:

- Generated files (e.g., `dagger.gen.go`, `*.generated.ts`)
- Node_modules transitive packages
- Test-only libraries with no adoption decision needed

Only report libraries that appear as direct imports in the platform's own code.

### 2d. Infrastructure & Platform Technologies

```bash
# Helm charts in use
find . -name "Chart.yaml" 2>/dev/null

# Kubernetes API versions in use
grep -rh --include="*.yaml" --include="*.yml" "apiVersion:" . 2>/dev/null | \
  sort -u | grep -v node_modules

# KubeVela OAM component types
grep -rh --include="*.yaml" --include="*.yml" "type:" . 2>/dev/null | \
  grep -E "(webservice|worker|cron-task|k8s-objects)" | sort -u

# Dagger modules
find . -name "dagger.json" 2>/dev/null
```

### 2e. Patterns in Use

Identify patterns by their structural signatures:

```bash
# Feature flags (env var gates, config toggles)
grep -rh --include="*.go" --include="*.ts" \
  -E "(FeatureFlag|feature_flag|isEnabled|getFlag)" . 2>/dev/null | wc -l

# Structured logging
grep -rh --include="*.go" -E '(slog\.|log\.With|zap\.|logrus\.)' . 2>/dev/null | wc -l

# Observability (traces, metrics)
grep -rh --include="*.go" --include="*.ts" \
  -E "(otel\.|opentelemetry|tracer\.|meter\.)" . 2>/dev/null | wc -l
```

---

## Step 3: Collect Evidence — What Is Formally Documented

### 3a. OpenSpec Changes (active + archived)

```bash
openspec list --json 2>/dev/null
```

Also walk the changes directory for archived ones:

```bash
ls openspec/changes/ 2>/dev/null
ls openspec/archive/ 2>/dev/null
```

Read each `design.md` to extract the **Technology Adoption & Usage Rules** table:

```bash
grep -h "| " openspec/changes/*/design.md 2>/dev/null | \
  grep -v "^| Technology\|^| ---" | head -80
```

### 3b. Usage Rules

```bash
find .opencode/rules/ -name "*.md" -not -name "README.md" -not -name "TEMPLATE.md" | sort
```

### 3c. Catalog Entities

```bash
ls .entities/ 2>/dev/null
```

Read each entity's `metadata.name` and `spec.type`:

```bash
for f in .entities/*.yaml; do
  yq -r '"\(.kind): \(.metadata.name) (\(.spec.type // "n/a"))"' "$f" 2>/dev/null
done
```

### 3d. ADRs

```bash
find docs/adrs/ -name "*.md" 2>/dev/null | sort
```

---

## Step 4: Gap Analysis

Compare the evidence sets. For each item discovered in Step 2, check:

| Check                     | Pass condition                                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Has a change?**         | An OpenSpec change (active or archived) names this technology or includes it in its Technology Adoption table        |
| **Has a usage rule?**     | A file exists at `.opencode/rules/technologies/<domain>/<name>.md` or `.opencode/rules/patterns/<layer>/<domain>.md` |
| **Has a catalog entity?** | A `.entities/resource-<name>.yaml` (or component/system) exists                                                      |
| **Has an ADR?**           | A symlinked or native ADR in `docs/adrs/` covers the adoption decision                                               |

A technology "passes" if **all four checks pass** (or the check is explicitly N/A for its kind —
e.g., a pattern doesn't need a catalog entity).

### Gap severity levels

| Severity        | Meaning                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------ |
| 🔴 **Critical** | Technology is in active use with no change, no usage rule, AND no ADR                      |
| 🟡 **Warning**  | Technology has a change or ADR but is missing a usage rule or catalog entity               |
| 🟢 **Info**     | Technology has a usage rule but the catalog entity is missing (mechanically derivable gap) |

---

## Step 5: Produce the Audit Report

Output a structured report:

```
## Technology Audit Report
Date: <YYYY-MM-DD>
Repo: <path>

### Summary
Total technologies detected:   N
  Fully documented:             N  ✓
  Warning gaps:                 N  🟡
  Critical gaps:                N  🔴

### Critical Gaps 🔴
<For each critical gap:>

**<technology-name>** (`<category>`)
- Detected in: <file paths or locations>
- Missing: change, usage rule, ADR, catalog entity (list which)
- Recommended action: <see Step 6>

### Warning Gaps 🟡
<For each warning gap:>

**<technology-name>** (`<category>`)
- Detected in: <file paths>
- Missing: <which checks failed>
- Recommended action: <see Step 6>

### Info Gaps 🟢
<For each info gap:>

**<technology-name>**
- Missing: catalog entity only
- Recommended action: run derivation script or create entity manually

### Fully Documented ✓
<List technology names only — no details needed>
```

---

## Step 6: Resolution Actions

For each gap, determine the appropriate resolution:

### Action A — Create a new OpenSpec change (preferred for critical gaps)

When the technology is clearly the right choice and should be kept:

```bash
openspec new change "adopt-<technology-name>"
```

Then use `/opsx-ff adopt-<technology-name>` to author all artifacts, including:

- Proposal explaining why the technology was adopted
- Spec with requirements for its usage
- Design with Technology Adoption table entry and usage rule creation task

### Action B — Create a usage rule immediately (for warning gaps)

When a change already exists but the usage rule is missing:

Load the `create-usage-rules` skill and create the rule:

```
skill: create-usage-rules
$TECHNICAL_DOMAIN: <domain>
$PACKAGE_NAME: <name>
$CHANGE_NAME: <nearest-related-change>
```

### Action C — Create catalog entities (for info gaps)

When the technology has a change and usage rule but no catalog entity:

For CLI tools/utilities from `devbox.json`:

```bash
.opencode/skills/dev-portal-manager/scripts/derive-from-devbox.sh
```

For npm packages:

```bash
.opencode/skills/dev-portal-manager/scripts/derive-from-package-json.sh
```

For manual entities, load `dev-portal-manager` skill and author the entity YAML.

### Action D — Refactor recommendation (for technologies that should be replaced)

When a better alternative already has formal documentation:

1. Note the gap in the audit report as a refactoring candidate
2. Create a `td` issue: `td create "Refactor: replace <old> with <new>" --type task`
3. Optionally open an OpenSpec change: `openspec new change "replace-<old>-with-<new>"`

### Action E — Explicit exclusion (for intentionally undocumented items)

When a technology is intentionally not documented (e.g., a transitive dependency, a test-only tool
with no usage decisions):

1. Add an entry to the audit exclusion list (see [Exclusions](#exclusions))
2. Document the reason

---

## Step 7: Create Resolution Tasks

After producing the report, create `td` tasks for all non-trivial resolutions:

```bash
# Create an audit root issue to group resolution tasks
td create "Technology Audit: <date>" --type feature
# → <audit-root-id>

# For each critical gap
td create "Adopt: <technology-name> — create change + usage rule" \
  --type task --parent <audit-root-id>

# For each warning gap
td create "Gap: <technology-name> — missing <what>" \
  --type task --parent <audit-root-id>

# For each refactoring candidate
td create "Refactor: replace <old> with <new>" \
  --type task --parent <audit-root-id>
```

Show the board:

```bash
td board create "tech-audit-<date>" --query "descendant_of(<audit-root-id>)"
td board show "tech-audit-<date>"
```

---

## Step 8: Dispatch researchers for warning gaps

After creating the task board, automatically dispatch `researcher` subagents for **warning gaps** (missing usage rules where a change already exists). Do not wait for user input — this dispatch is automatic.

Collect all warning-gap tasks created in Step 7 that require Action B (create usage rule):

```bash
td ls --ancestor <audit-root-id> --status open --type task | grep "^Gap:"
```

For each warning-gap task that needs a usage rule, dispatch a researcher:

- `subagent_type: "researcher"`
- `description: "Create usage rules for <domain>"` (5–10 words)
- `prompt`: the task id and domain, e.g.:

```
Your assigned task ids: <gap-task-id>
```

Dispatch all researcher tasks in a **single message** (parallel). Announce:

```
Dispatching N researcher(s) for warning gaps...
```

Wait for all researchers to return, then mark their corresponding tasks done:

```bash
td handoff <task-id> --done "Usage rule created" --remaining "none"
td review <task-id>
```

## Step 9: Immediate Resolutions (optional, user-directed)

After researchers complete (or if there were no warning gaps), offer:

> "I can resolve remaining gaps immediately. Which would you like me to address now?"
>
> - `all` — resolve everything in severity order (critical → info)
> - `critical` — critical gaps only
> - `<technology-name>` — resolve a specific gap
> - `none` — just the report and tasks (default if no input provided)

**If resolving immediately:**

For each selected gap, execute the resolution action (A–D) from Step 6. For Action A (new change),
use the `development-orchestrator` skill to fast-forward through artifact authoring. Do NOT
implement code changes — this is a design + documentation activity.

After each resolution, mark the corresponding `td` task done:

```bash
td handoff <task-id> --done "<what was created>" --remaining "none"
td review <task-id>
```

---

## Transitive Dependencies

**Transitive dependencies are EXCLUDED from technology audit.** A transitive dependency is a
technology that is:

1. **Pulled in indirectly** — Required by a dependency, not directly by platform code
2. **Not a direct platform choice** — Would be removed if we stopped using the parent dependency
3. **Not invoked explicitly** — Not called by name in platform code, scripts, or manifests

### Examples

**EXCLUDED (transitive)**:

- GraphQL generators in `gqlgen` (pulled in by gqlgen-using dependencies)
- Protocol Buffer compiler in build tools (pulled in by a build dependency)
- AWS SDK v3 in Amplify (pulled in by Amplify package)

**INCLUDED (direct)**:

- `chi` router — explicitly imported and used in service code
- `opentelemetry` SDK — directly called in instrumentation code
- `dagger` CLI — directly invoked in build scripts
- `kubectl` — directly run in deployment automation

### How to Identify Transitive Dependencies

**In Go**:

```bash
# Look for '// indirect' marker in go.mod
grep '// indirect' go.mod
```

**In npm**:

- Check `package-lock.json` for nested structure (transitive packages appear deeper in the tree)
- Run `npm ls --depth=0` to see only direct dependencies

**In code**:

- Search for direct imports/calls: `import`, `from`, command-line invocation
- If not found in source, it's transitive

### Verification Process

When reporting a detected technology:

1. Find where it's declared (go.mod, package.json, etc.)
2. Check if marked as indirect/transitive
3. Grep source code for direct usage or explicit imports
4. **Only report if it passes both checks** — it's a direct platform choice

To add a custom exclusion, document it here with a rationale.

---

## Integration with dev-portal-manager

After Step 6 resolutions, always check if new catalog entities are needed:

1. Load the `dev-portal-manager` skill
2. For any technology resolved via Action A or B, author the corresponding `Resource` entity
3. If a new component was introduced, author the `Component` entity
4. If a new system boundary was identified, author the `System` entity
5. Run both derivation scripts to catch mechanically-derivable gaps:

   ```bash
   .opencode/skills/dev-portal-manager/scripts/derive-from-devbox.sh
   .opencode/skills/dev-portal-manager/scripts/derive-from-package-json.sh
   ```

6. Verify all new entities reference existing `spec.owner` and `spec.system` entities

---

## Guardrails

- **Read-only collection phase** — Steps 2–4 are analysis only; no files are created or modified
- **Report first, act second** — Always produce the full report before taking any resolution actions
- **Don't implement code** — This skill creates OpenSpec artifacts, usage rules, and catalog
  entities; it does NOT write application code
- **One change per technology** — Don't merge multiple undocumented technologies into a single
  catch-all change; each needs its own traceable decision record
- **Prefer Action A for critical gaps** — A proper OpenSpec change creates the full audit trail
  (proposal → spec → design → ADR)
- **Never silently exclude** — If something looks like it should be excluded, document the exclusion
  reason explicitly
- **Re-run after resolutions** — After resolving gaps, run the audit again to verify the gap count
  reaches zero
