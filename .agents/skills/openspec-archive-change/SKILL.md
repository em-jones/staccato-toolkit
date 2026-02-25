---
name: openspec-archive-change
description: Archive a completed change in the experimental workflow. Use when the user wants to finalize and archive a change after implementation is complete.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.1.1"
---

Archive a completed change in the experimental workflow.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run `openspec list --json` to get available changes. Use the **AskUserQuestion tool** to let the user select.

   Show only active changes (not already archived).
   Include the schema used for each change if available.

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Check artifact completion status**

   Run `openspec status --change "<name>" --json` to check artifact completion.

   Parse the JSON to understand:
   - `schemaName`: The workflow being used
   - `artifacts`: List of artifacts with their status (`done` or other)

   **If any artifacts are not `done`:**
   - Display warning listing incomplete artifacts
   - Use **AskUserQuestion tool** to confirm user wants to proceed
   - Proceed if user confirms

3. **Check task completion status**

   Read `proposal.md` from the change directory. Parse its YAML frontmatter to get `td-board`.

   **If `td-board` is present:**
   - Run `td board show "<td-board>"` to list all issues
   - Identify any issues not in `closed` status
   - **Separately identify open `Gate:` tasks** (title prefix `Gate:`) from other open issues

   **If open `Gate:` tasks found:**
   - Display a **blocking warning** listing each open gate task with its prerequisite change name
   - Explain: "Gate tasks represent prerequisite changes that must be archived first."
   - Use **AskUserQuestion tool** with options: "Archive prerequisite changes first (recommended)", "Force archive anyway (breaks dependency chain)"
   - **Only proceed if user explicitly chooses to force** — this is a dependency chain violation, not a routine confirmation

   **If other open (non-Gate) issues found:**
   - Display warning listing the title and status of each open issue
   - Use **AskUserQuestion tool** to confirm user wants to proceed
   - Proceed if user confirms

   **If no `td-board` in frontmatter:** Proceed without task-related warning.

4. **Assess delta spec sync state**

   Check for delta specs at `openspec/changes/<name>/specs/`. If none exist, proceed without sync prompt.

   **If delta specs exist:**
   - Compare each delta spec with its corresponding main spec at `openspec/specs/<capability>/spec.md`
   - Determine what changes would be applied (adds, modifications, removals, renames)
   - Show a combined summary before prompting

   **Prompt options:**
   - If changes needed: "Sync now (recommended)", "Archive without syncing"
   - If already synced: "Archive now", "Sync anyway", "Cancel"

   If user chooses sync, execute /opsx-sync logic (use the openspec-sync-specs skill). Proceed to archive regardless of choice.

5. **Perform the archive**

   Create the archive directory if it doesn't exist:

   ```bash
   mkdir -p openspec/changes/archive
   ```

   Generate target name using current date: `YYYY-MM-DD-<change-name>`

   **Check if target already exists:**
   - If yes: Fail with error, suggest renaming existing archive or using different date
   - If no: Move the change directory to archive

   ```bash
   mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>
   ```

6. **Create ADR symlink(s)**

   After the directory is moved to its archive location, check whether the archived `design.md` declares a `component` field in its YAML frontmatter.

   **If `component` field is absent or empty**: skip silently — not every change maps to a single component.

   **For each component path declared** (handle both scalar and list forms):

   a. Resolve `<repo-root>/<component-path>/docs/adrs/` — this is the target directory (Backstage ADR plugin path). If it does not exist, create it:

   ```bash
   mkdir -p <repo-root>/<component-path>/docs/adrs
   ```

   b. Determine the next available sequence number by listing existing entries in `docs/adrs/`:

   ```bash
   ls <adr-dir> | grep -E '^[0-9]{4}-' | sort | tail -1
   # Increment the numeric prefix by 1; start at 0001 if directory is empty
   ```

   c. Compute the symlink name: `NNNN-YYYY-MM-DD-<change-name>.md`
   (e.g. `0003-2026-02-24-initialize-dagger-devops.md`)

   d. Compute the symlink target as a **relative path** from the `docs/adrs/` directory to the archived `design.md`.
   For example, if the archive is at `openspec/changes/archive/2026-02-24-my-change/design.md`
   and the `docs/adrs/` dir is at `src/ops/workloads/docs/adrs/`, the relative path would be:
   `../../../../../openspec/changes/archive/2026-02-24-my-change/design.md`

   Use Python to compute the relative path:

   ```bash
   python3 -c "import os; print(os.path.relpath('<archive-design-md-abs>', '<adrs-dir-abs>'))"
   ```

   e. Create the symlink (skip if target symlink already exists):

   ```bash
   ln -s "<relative-target>" "<adrs-dir>/<symlink-name>"
   ```

   f. Record each symlink created for the summary.

7. **Sync Tech Radar**

   After ADR symlinks are created, run the tech radar sync script to update `docs/tech-radar.json` with any `tech-radar` frontmatter entries from the archived change:

   ```bash
   bash .opencode/skills/dev-portal-manager/scripts/sync-tech-radar.sh
   ```

   The script will:
   - Scan all `design.md` files (including the newly archived one)
   - Extract `tech-radar` frontmatter blocks
   - Update `docs/tech-radar.json` with deduplicated entries
   - Report a summary: "N added, M updated, K unchanged"

   **If the script produces changes to `docs/tech-radar.json`:**
   - Stage the file for inclusion in the archive commit
   - Note in the commit message that tech radar was updated

   **If no changes are produced:**
   - Proceed without staging (idempotent operation)

8. **Verify Backstage portal tasks exist** (fallback creation if design-phase audit was skipped)

   The design phase should have already created these tasks during the Catalog Entity Audit. At archive time, verify they exist and create any that are missing as a safety net.

   Read `td-issue` from `proposal.md` frontmatter to get the change root id.

   Check what Backstage tasks already exist on the change board:

   ```bash
   td board show "<td-board>" | grep -E "^(Backstage:|TecDocs:)"
   ```

   **For each Component declared in `design.md` (`component` field or `## Catalog Entities` table)**:

   a. **ADR annotation task** — if not already on the board, create:

   ```bash
   td create "Backstage: add adr-location annotation to <component-name> entity" \
     --type task --parent <change-root-id> \
     --body "Ensure .entities/component-<name>.yaml has:
     annotations:
       backstage.io/adr-location: docs/adrs
   ADR symlink created at: <component-path>/docs/adrs/<symlink-name>"
   td link <task-id> openspec/changes/archive/YYYY-MM-DD-<name>/design.md --role reference
   ```

   b. **TechDocs scaffolding task** — if not already on the board, create:

   ```bash
   td create "Backstage: scaffold TechDocs for <component-name>" \
     --type task --parent <change-root-id> \
     --body "Ensure <component-path> has:
   - mkdocs.yml (with techdocs-core plugin and nav entries for any new docs pages added by this change)
   - docs/index.md (at minimum)
   - annotation in .entities/component-<name>.yaml: backstage.io/techdocs-ref: dir:.
   Verify TechDocs renders correctly in Backstage after scaffolding."
   td link <task-id> openspec/changes/archive/YYYY-MM-DD-<name>/design.md --role reference
   ```

   c. **TecDocs content task** — if not already on the board, create:

   ```bash
   td create "TecDocs: write documentation for <change-name> in <component-name>" \
     --type task --parent <change-root-id> \
     --body "Write or update docs pages in <component-path>/docs/ for the changes introduced:
   - Document key design decisions, configuration, and usage
   - Add entries to mkdocs.yml nav for any new pages
   - Verify pages render in Backstage TechDocs"
   td link <task-id> openspec/changes/archive/YYYY-MM-DD-<name>/design.md --role reference
   ```

   **For every change (regardless of component count or technology adoption):**

   d. **Tech Radar review task** — if not already on the board, create (once per change):

   ```bash
   td create "Backstage: review Tech Radar for <change-name>" \
     --type task --parent <change-root-id> \
     --body "Review docs/tech-radar.json for any decisions made in this change.
   For technologies in '## Technology Adoption & Usage Rules': add or update entries with ring Adopt|Trial|Assess|Hold.
   For changes with no new technology adoption: confirm existing entries are still accurate."
   td link <task-id> openspec/changes/archive/YYYY-MM-DD-<name>/design.md --role reference
   ```

   **Note**: If all tasks already exist from the design phase (the normal case), no new tasks are created — log "All Backstage tasks already created at design time."

9. **Display summary**

   Show archive completion summary including:
   - Change name
   - Schema that was used
   - Archive location
   - Whether specs were synced (if applicable)
   - ADR symlink(s) created (path and target), or "No component declared" if skipped
   - Backstage tasks status: created (fallback), already existed (design-phase), or none
   - Note about any warnings (incomplete artifacts/tasks)

**Output On Success**

```
## Archive Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Archived to:** openspec/changes/archive/YYYY-MM-DD-<name>/
**Specs:** ✓ Synced to main specs (or "No delta specs" or "Sync skipped")
**ADR symlink:** src/<component>/docs/adrs/NNNN-YYYY-MM-DD-<name>.md → openspec/changes/archive/YYYY-MM-DD-<name>/design.md
             (or "No component declared" if component field absent)
**Backstage tasks:**
  ✓ All Backstage tasks already created at design time (or list fallback-created tasks)
  Pending: td-xxxxx Backstage: add adr-location annotation to <component-name> entity
  Pending: td-yyyyy Backstage: scaffold TechDocs for <component-name>
  Pending: td-zzzzz TecDocs: write documentation for <change-name> in <component-name>
  Pending: td-aaaaa Backstage: review Tech Radar for <change-name>

   All artifacts complete. All td issues closed.
```

**Guardrails**

- Always prompt for change selection if not provided
- Use artifact graph (openspec status --json) for completion checking
- Open `Gate:` tasks are **blocking** — require explicit force confirmation; they represent prerequisite dependency violations, not routine warnings
- Non-gate open issues: inform and confirm (non-blocking)
- Preserve .openspec.yaml when moving to archive (it moves with the directory)
- Show clear summary of what happened
- If sync is requested, use openspec-sync-specs approach (agent-driven)
- If delta specs exist, always run the sync assessment and show the combined summary before prompting
- ADR symlink uses the **archive** path (post-move), never the pre-archive change path — the symlink must point to the permanent location
- ADR symlink target is always a **relative path** (not absolute) so the repo stays portable
- ADR symlinks go into `docs/adrs/` (not `adr/`); the Backstage ADR plugin reads `backstage.io/adr-location: docs/adrs`
- ADR symlink name includes sequence number prefix: `NNNN-YYYY-MM-DD-<change-name>.md`
- If `component` field is absent, skip symlink creation silently — do not error
- If the symlink already exists at the target path, skip creation silently
- Backstage tasks (ADR annotation, TechDocs scaffolding, TecDocs content, Tech Radar review) are standard — they MUST exist for every change. Prefer tasks created at design time; only create at archive time as fallback
- Tech Radar review task is always created — even for changes with no new technology adoption
