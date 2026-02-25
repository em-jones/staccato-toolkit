---
name: openspec-bulk-archive-change
description: Archive multiple completed changes at once. Use when archiving several parallel changes.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.1.1"
  maturity: stable
---

Archive multiple completed changes in a single operation.

This skill allows you to batch-archive changes, handling spec conflicts intelligently by checking the codebase to determine what's actually implemented.

**Input**: None required (prompts for selection)

**Steps**

1. **Get active changes**

   Run `openspec list --json` to get all active changes.

   If no active changes exist, inform user and stop.

2. **Prompt for change selection**

   Use **AskUserQuestion tool** with multi-select to let user choose changes:
   - Show each change with its schema
   - Include an option for "All changes"
   - Allow any number of selections (1+ works, 2+ is the typical use case)

   **IMPORTANT**: Do NOT auto-select. Always let the user choose.

3. **Batch validation - gather status for all selected changes**

   For each selected change, collect:

   a. **Artifact status** - Run `openspec status --change "<name>" --json`
   - Parse `schemaName` and `artifacts` list
   - Note which artifacts are `done` vs other states

   b. **Task completion** - Read `openspec/changes/<name>/tasks.md`
   - Count `- [ ]` (incomplete) vs `- [x]` (complete)
   - If no tasks file exists, note as "No tasks"

   c. **Delta specs** - Check `openspec/changes/<name>/specs/` directory
   - List which capability specs exist
   - For each, extract requirement names (lines matching `### Requirement: <name>`)

4. **Detect spec conflicts**

   Build a map of `capability -> [changes that touch it]`:

   ```
   auth -> [change-a, change-b]  <- CONFLICT (2+ changes)
   api  -> [change-c]            <- OK (only 1 change)
   ```

   A conflict exists when 2+ selected changes have delta specs for the same capability.

5. **Resolve conflicts agentically**

   **For each conflict**, investigate the codebase:

   a. **Read the delta specs** from each conflicting change to understand what each claims to add/modify

   b. **Search the codebase** for implementation evidence:
   - Look for code implementing requirements from each delta spec
   - Check for related files, functions, or tests

   c. **Determine resolution**:
   - If only one change is actually implemented -> sync that one's specs
   - If both implemented -> apply in chronological order (older first, newer overwrites)
   - If neither implemented -> skip spec sync, warn user

   d. **Record resolution** for each conflict:
   - Which change's specs to apply
   - In what order (if both)
   - Rationale (what was found in codebase)

6. **Show consolidated status table**

   Display a table summarizing all changes:

   ```
   | Change               | Artifacts | Tasks | Specs   | Conflicts | Status |
   |---------------------|-----------|-------|---------|-----------|--------|
   | schema-management   | Done      | 5/5   | 2 delta | None      | Ready  |
   | project-config      | Done      | 3/3   | 1 delta | None      | Ready  |
   | add-oauth           | Done      | 4/4   | 1 delta | auth (!)  | Ready* |
   | add-verify-skill    | 1 left    | 2/5   | None    | None      | Warn   |
   ```

   For conflicts, show the resolution:

   ```
   * Conflict resolution:
     - auth spec: Will apply add-oauth then add-jwt (both implemented, chronological order)
   ```

   For incomplete changes, show warnings:

   ```
   Warnings:
   - add-verify-skill: 1 incomplete artifact, 3 incomplete tasks
   ```

7. **Confirm batch operation**

   Use **AskUserQuestion tool** with a single confirmation:
   - "Archive N changes?" with options based on status
   - Options might include:
     - "Archive all N changes"
     - "Archive only N ready changes (skip incomplete)"
     - "Cancel"

   If there are incomplete changes, make clear they'll be archived with warnings.

8. **Execute archive for each confirmed change**

   Process changes in the determined order (respecting conflict resolution):

   a. **Sync specs** if delta specs exist:
   - Use the openspec-sync-specs approach (agent-driven intelligent merge)
   - For conflicts, apply in resolved order
   - Track if sync was done

   b. **Perform the archive**:

   ```bash
   mkdir -p openspec/changes/archive
   mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>
   ```

   c. **Create ADR symlink(s)** (same logic as `openspec-archive-change` step 6):
   - Read `component` field from the now-archived `design.md` frontmatter
   - For each declared component path, create `<repo-root>/<component-path>/docs/adrs/` if absent (Backstage ADR plugin path)
   - Determine next sequence number from existing entries in `docs/adrs/` (start at 0001 if empty)
   - Compute symlink name: `NNNN-YYYY-MM-DD-<change-name>.md`
   - Compute relative path from `docs/adrs/` dir to the archived `design.md`:
     ```bash
     python3 -c "import os; print(os.path.relpath('<archive-design-md-abs>', '<adrs-dir-abs>'))"
     ```
   - Create symlink: `ln -s "<relative-target>" "<adrs-dir>/<symlink-name>"` (skip if exists)
   - If `component` field absent, skip silently

   d. **Create post-archive Backstage tasks** (same logic as `openspec-archive-change` step 7):
   - Read `td-issue` from `proposal.md` frontmatter as the change root id
   - When `component` is declared: create ADR annotation task and TechDocs nav task under the change root
   - When `## Technology Adoption & Usage Rules` has non-n/a entries: create Tech Radar task
   - Link all created tasks to the archived `design.md`
   - Track task IDs for summary output

   d. **Track outcome** for each change:
   - Success: archived successfully
   - Failed: error during archive (record error)
   - Skipped: user chose not to archive (if applicable)

9. **Display summary**

   Show final results:

   ```
   ## Bulk Archive Complete

   Archived 3 changes:
   - schema-management -> archive/2026-01-19-schema-management-cli/
   - project-config -> archive/2026-01-19-project-config/
   - add-oauth -> archive/2026-01-19-add-oauth/

   Skipped 1 change:
   - add-verify-skill (user chose not to archive incomplete)

   Spec sync summary:
   - 4 delta specs synced to main specs
   - 1 conflict resolved (auth: applied both in chronological order)

   ADR symlinks:
   - src/<component>/docs/adrs/0001-2026-01-19-schema-management-cli.md → openspec/changes/archive/...
   - src/<component>/docs/adrs/0002-2026-01-19-project-config.md → openspec/changes/archive/...
   - add-oauth: no component declared (skipped)

   Post-archive Backstage tasks:
   - schema-management-cli: td-aaaaa (adr-location annotation), td-bbbbb (mkdocs nav), td-ccccc (Tech Radar)
   - project-config: td-ddddd (adr-location annotation), td-eeeee (mkdocs nav)
   - add-oauth: none (no component declared)
   ```

   If any failures:

   ```
   Failed 1 change:
   - some-change: Archive directory already exists
   ```

   ## Bulk Archive Complete

   Archived 3 changes:
   - schema-management-cli -> archive/2026-01-19-schema-management-cli/
   - project-config -> archive/2026-01-19-project-config/
   - add-oauth -> archive/2026-01-19-add-oauth/

   Skipped 1 change:
   - add-verify-skill (user chose not to archive incomplete)

   Spec sync summary:
   - 4 delta specs synced to main specs
   - 1 conflict resolved (auth: applied both in chronological order)

   ```

   If any failures:
   ```

   Failed 1 change:
   - some-change: Archive directory already exists

   ```

   ```

**Conflict Resolution Examples**

Example 1: Only one implemented

```
Conflict: specs/auth/spec.md touched by [add-oauth, add-jwt]

Checking add-oauth:
- Delta adds "OAuth Provider Integration" requirement
- Searching codebase... found src/auth/oauth.ts implementing OAuth flow

Checking add-jwt:
- Delta adds "JWT Token Handling" requirement
- Searching codebase... no JWT implementation found

Resolution: Only add-oauth is implemented. Will sync add-oauth specs only.
```

Example 2: Both implemented

```
Conflict: specs/api/spec.md touched by [add-rest-api, add-graphql]

Checking add-rest-api (created 2026-01-10):
- Delta adds "REST Endpoints" requirement
- Searching codebase... found src/api/rest.ts

Checking add-graphql (created 2026-01-15):
- Delta adds "GraphQL Schema" requirement
- Searching codebase... found src/api/graphql.ts

Resolution: Both implemented. Will apply add-rest-api specs first,
then add-graphql specs (chronological order, newer takes precedence).
```

**Output On Success**

```
## Bulk Archive Complete

Archived N changes:
- <change-1> -> archive/YYYY-MM-DD-<change-1>/
- <change-2> -> archive/YYYY-MM-DD-<change-2>/

Spec sync summary:
- N delta specs synced to main specs
- No conflicts (or: M conflicts resolved)
```

**Output On Partial Success**

```
## Bulk Archive Complete (partial)

Archived N changes:
- <change-1> -> archive/YYYY-MM-DD-<change-1>/

Skipped M changes:
- <change-2> (user chose not to archive incomplete)

Failed K changes:
- <change-3>: Archive directory already exists
```

**Output When No Changes**

```
## No Changes to Archive

No active changes found. Use `/opsx-new` to create a new change.
```

**Guardrails**

- Allow any number of changes (1+ is fine, 2+ is the typical use case)
- Always prompt for selection, never auto-select
- Detect spec conflicts early and resolve by checking codebase
- When both changes are implemented, apply specs in chronological order
- Skip spec sync only when implementation is missing (warn user)
- Show clear per-change status before confirming
- Use single confirmation for entire batch
- Track and report all outcomes (success/skip/fail)
- Preserve .openspec.yaml when moving to archive
- Archive directory target uses current date: YYYY-MM-DD-<name>
- If archive target exists, fail that change but continue with others
- ADR symlink uses the **archive** path (post-move), never the pre-archive path
- ADR symlink target is always a **relative path** (not absolute)
- ADR symlinks go into `docs/adrs/` (not `adr/`); the Backstage ADR plugin reads `backstage.io/adr-location: docs/adrs`
- ADR symlink name includes sequence number prefix: `NNNN-YYYY-MM-DD-<change-name>.md`; sequence is determined per-component at creation time
- If `component` field absent, skip symlink creation silently — do not error or warn
- If the symlink already exists at the target path, skip creation silently
- Post-archive Backstage tasks are created per-change regardless of whether the board has open issues
- Tech Radar task is only created when `## Technology Adoption & Usage Rules` has non-n/a entries
