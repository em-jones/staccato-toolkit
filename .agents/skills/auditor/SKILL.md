---
name: auditor
description:
  Continuous background audit loop. Runs incremental audits every 10 minutes (when git changes are
  detected) and a comprehensive full audit every hour. Emits a heartbeat to a shared state file so
  the development-orchestrator can detect and restart a dead auditor.
metadata:
  author: platform-architect
  version: "1.0"
---

# Skill: auditor

Run a continuous background audit loop. The loop has two cadences:

- **Incremental** (every 10 minutes): detect git changes since the last run; run only the audits
  that could be affected by those changes.
- **Comprehensive** (every hour): run the full technology audit regardless of git changes.

Emit a heartbeat on every iteration so the development-orchestrator can detect a dead auditor and
restart it.

---

## Heartbeat Protocol

The auditor writes a heartbeat file on every successful iteration. The
development-orchestrator reads this file to determine whether the auditor is alive.

### Heartbeat file location

```
.opencode/auditor/heartbeat.json
```

### Heartbeat format

```json
{
  "pid": <process-id>,
  "session": "<session-id>",
  "iteration": <integer>,
  "cadence": "incremental" | "comprehensive",
  "last_run_utc": "<ISO-8601-timestamp>",
  "next_run_utc": "<ISO-8601-timestamp>",
  "status": "alive" | "completing",
  "last_audit_summary": {
    "critical": <n>,
    "warning": <n>,
    "info": <n>,
    "changes_detected": ["<file>", ...]
  }
}
```

### Writing the heartbeat

After every audit iteration (incremental or comprehensive), write the heartbeat:

```bash
mkdir -p .opencode/auditor
cat > .opencode/auditor/heartbeat.json <<EOF
{
  "pid": $$,
  "session": "<td-session-id>",
  "iteration": <n>,
  "cadence": "<cadence>",
  "last_run_utc": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "next_run_utc": "<computed>",
  "status": "alive",
  "last_audit_summary": {
    "critical": <n>,
    "warning": <n>,
    "info": <n>,
    "changes_detected": [<list>]
  }
}
EOF
```

The heartbeat file is gitignored (`.opencode/auditor/` is in `.gitignore`) — do NOT commit it.

---

## Startup

On launch, immediately:

1. Get or create the current td session:

   ```bash
   td usage 2>&1 | head -5
   ```

2. Write an initial heartbeat with `status: "alive"` and `iteration: 0`.

3. Record the current git commit as the baseline for incremental diffing:

   ```bash
   git rev-parse HEAD > .opencode/auditor/last-seen-commit
   ```

4. Announce startup:

   ```
   [auditor] started — session <id>, pid <pid>
   [auditor] incremental: every 10 min | comprehensive: every 1 hr
   [auditor] heartbeat: .opencode/auditor/heartbeat.json
   ```

5. Enter the main loop (see below).

---

## Main Loop

```
loop forever:
  sleep 10 minutes

  if (elapsed since last comprehensive) >= 60 minutes:
    run comprehensive audit
    reset comprehensive timer
    reset incremental timer
  else:
    detect git changes since last-seen-commit
    if changes detected:
      run incremental audit for affected domains
    else:
      log "no changes detected — skipping incremental"

  write heartbeat
  update last-seen-commit to HEAD
```

### Sleep implementation

Use a 10-minute sleep between iterations. Because agents don't have native `sleep`, simulate with
repeated `date` comparisons anchored to wall-clock start time:

```bash
LOOP_START=$(date -u +%s)
TARGET=$((LOOP_START + 600))   # 600 seconds = 10 minutes
while [ $(date -u +%s) -lt $TARGET ]; do
  sleep 30
done
```

Use the same pattern scaled to 3600 seconds (1 hour) for the comprehensive cadence timer.

---

## Detecting Git Changes (Incremental)

```bash
LAST=$(cat .opencode/auditor/last-seen-commit 2>/dev/null || echo "")
CURRENT=$(git rev-parse HEAD)

if [ "$LAST" = "$CURRENT" ]; then
  echo "no changes"
else
  git diff --name-only "$LAST" "$CURRENT" 2>/dev/null || git diff --name-only HEAD~1 HEAD
fi
```

Store results in a variable `CHANGED_FILES`.

### Map changed files to affected audit domains

| Changed path pattern | Affected audit domains |
|---|---|
| `src/**/*.go`, `*/go.mod`, `go.work` | go-libraries, go-patterns, observability |
| `src/**/*.ts`, `src/**/*.tsx`, `*/package.json` | node-libraries, typescript-patterns |
| `.github/workflows/**` | ci-cd, github-actions |
| `src/**/Dockerfile*`, `src/**/Containerfile*` | container-images, base-images |
| `.entities/**` | catalog |
| `.opencode/rules/**` | usage-rules |
| `openspec/specs/**`, `openspec/changes/**` | spec-coverage |
| `devbox.json` | devbox-tools, catalog |
| `**/*.yaml`, `**/*.yml` (excluding `.github/`) | infrastructure |

A single changed file may map to multiple domains. Collect the union of all domains from all changed
files — that is the **incremental audit scope** for this iteration.

---

## Incremental Audit

Run only the sub-audits relevant to the affected domains. For each domain in the scope:

### `go-libraries`

Check all direct Go imports in changed `.go` files against the OpenSpec change registry:

```bash
# Extract imports from changed Go files
for f in $CHANGED_GO_FILES; do
  grep -E '"github\.com/[^"]+"' "$f" 2>/dev/null
done | sort -u
```

For each import, verify it appears in at least one `design.md` Technology Adoption table or has a
usage rule at `.opencode/rules/technologies/`.

### `go-patterns`

Scan changed Go files for pattern violations:

```bash
# Check for patterns that need usage rules
grep -E '(slog\.|log\.With|zap\.|logrus\.)' $CHANGED_GO_FILES 2>/dev/null
grep -E '(otel\.|opentelemetry|tracer\.|meter\.)' $CHANGED_GO_FILES 2>/dev/null
```

Cross-reference against `.opencode/rules/patterns/` to confirm coverage.

### `observability`

Verify any new OTel instrumentation in changed files follows the span-instrumentation and
trace-context-propagation rules:

```bash
cat .opencode/rules/patterns/observability/span-instrumentation.md 2>/dev/null | head -5
```

Flag any instrumentation that doesn't match the rule structure.

### `node-libraries` / `typescript-patterns`

For changed `package.json` files, extract new direct dependencies and check coverage.

### `ci-cd` / `github-actions`

For changed workflow files, verify they use only approved actions from the catalog:

```bash
cat .opencode/rules/patterns/actions/approved-actions-catalog.md 2>/dev/null
grep -rh "uses:" $CHANGED_WORKFLOW_FILES 2>/dev/null | sed 's/.*uses: //' | sort -u
```

### `container-images`

For changed Dockerfiles/Containerfiles, verify base images comply with the base-images rule:

```bash
cat .opencode/rules/patterns/infrastructure/base-images.md 2>/dev/null | head -20
grep "^FROM" $CHANGED_CONTAINER_FILES 2>/dev/null
```

### `catalog`

For changed `.entities/*.yaml` files, verify entity structure is valid (has required fields:
`apiVersion`, `kind`, `metadata.name`, `spec.type`).

### `usage-rules`

For changed `.opencode/rules/**` files, check they follow the rule template structure:

```bash
cat .opencode/rules/TEMPLATE.md 2>/dev/null | head -20
```

### `spec-coverage`

For changed spec files, verify all requirements have corresponding `td` tasks:

```bash
# Check for requirements without task IDs in the spec
grep -E "^### Requirement:" $CHANGED_SPEC_FILES 2>/dev/null | grep -v "td-"
```

### `devbox-tools`

For changed `devbox.json`, extract newly added packages and check catalog and usage rule coverage.

### `infrastructure`

For changed YAML/YML files outside `.github/`, check for:
- Valid Kubernetes `apiVersion` patterns
- KubeVela component types against the known list

---

## Comprehensive Audit

Run the full `technology-audit` skill logic (Steps 2–5 from that skill), but in read-only mode —
do NOT create tasks or changes during the audit loop. Instead, write findings to the audit log file
and create a summary in the heartbeat.

```bash
mkdir -p .opencode/auditor
AUDIT_LOG=".opencode/auditor/audit-$(date -u +%Y%m%dT%H%M%SZ).log"
```

### Comprehensive scope

Run all domains:
- go-libraries, go-patterns, observability
- node-libraries, typescript-patterns
- ci-cd, github-actions
- container-images, base-images
- catalog, usage-rules, spec-coverage
- devbox-tools, infrastructure

### Output format

Write to `$AUDIT_LOG`:

```
## Comprehensive Audit — <ISO-8601-timestamp>

### Critical Gaps 🔴
<list>

### Warning Gaps 🟡
<list>

### Info Gaps 🟢
<list>

### Fully Documented ✓
<list>
```

Also write a compact JSON summary to `.opencode/auditor/latest-findings.json`:

```json
{
  "timestamp": "<ISO-8601>",
  "cadence": "comprehensive",
  "critical": <n>,
  "warning": <n>,
  "info": <n>,
  "gaps": [
    { "severity": "critical", "technology": "<name>", "category": "<cat>", "missing": ["change", "usage-rule"] },
    ...
  ]
}
```

Keep only the 10 most recent audit log files (prune older ones after writing):

```bash
ls -t .opencode/auditor/audit-*.log | tail -n +11 | xargs rm -f 2>/dev/null
```

---

## Incremental Audit Output

For each affected domain that finds a gap, append to the current incremental log:

```bash
INCR_LOG=".opencode/auditor/incremental-$(date -u +%Y%m%dT%H%M%SZ).log"
```

Write findings in the same format as the comprehensive audit, scoped to the affected domains. Keep
only the 20 most recent incremental log files.

---

## Findings That Need Immediate Escalation

These findings are urgent enough that the auditor should create `td` tasks immediately rather than
waiting for a human to review the audit log:

| Condition | Action |
|---|---|
| A Go file imports a module that has **no** OpenSpec change AND **no** usage rule | `td create "Critical: undocumented dependency <import>" --type task` |
| A workflow uses an **unapproved** GitHub Action | `td create "Critical: unapproved action <action> in <file>" --type task` |
| A container uses a base image NOT in the approved list | `td create "Critical: non-compliant base image <image> in <file>" --type task` |
| A spec requirement has no corresponding `td` task | `td create "Gap: requirement without task in <spec>" --type task` |

For all other gaps, log them and let humans triage via the audit log.

---

## Graceful Shutdown

If the auditor receives a termination signal or is about to exit:

1. Write a final heartbeat with `status: "completing"`.
2. Flush any open log files.
3. Exit cleanly.

```bash
trap 'write_final_heartbeat; exit 0' SIGTERM SIGINT
```

---

## Guardrails

- **Never commit** heartbeat or log files — they live under `.opencode/auditor/` which is in
  `.gitignore` paths
- **Read-only by default** — comprehensive audits do NOT create changes or tasks unless a finding
  meets the immediate-escalation criteria
- **Incremental audits** only look at the diff since the last seen commit — do not re-audit the
  entire repo on every 10-minute tick
- **Heartbeat is mandatory** — write it after every iteration, even if no changes were detected and
  no audit ran
- **No duplicate tasks** — before creating an escalation task, check for an open task with the same
  title:
  ```bash
  td ls --status open | grep "<title fragment>"
  ```
- **Cadence discipline** — the 10-minute incremental and 60-minute comprehensive timers are
  independent; a comprehensive run resets both timers

Base directory for this skill: file:///home/em/repos/oss/openspec-td/.opencode/skills/auditor
Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.
