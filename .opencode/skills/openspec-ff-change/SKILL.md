---
name: openspec-ff-change
description: Fast-forward through OpenSpec artifact creation. Use when the user wants to quickly create all artifacts needed for implementation without stepping through each one individually.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.1"
  generatedBy: "1.1.1"
---

Fast-forward through artifact creation - generate everything needed to start implementation in one go.

> **Maintainer note**: The audit sections in this skill (Rule-Coverage, Quality Tooling, Radar Prerequisite, Catalog Entity, Skill, Prerequisite Changes) are intentionally kept in sync with `openspec-continue-change`. If you update audit logic in one skill, update the other. The canonical descriptions live in `openspec-continue-change`; this skill's versions are adapted for inline fast-forward output format.

**Input**: The user's request should include a change name (kebab-case) OR a description of what they want to build.

**Steps**

1. **If no clear input provided, ask what they want to build**

   Use the **AskUserQuestion tool** (open-ended, no preset options) to ask:
   > "What change do you want to work on? Describe what you want to build or fix."

   From their description, derive a kebab-case name (e.g., "add user authentication" → `add-user-auth`).

   **IMPORTANT**: Do NOT proceed without understanding what the user wants to build.

2. **Create the change directory**
   ```bash
   openspec new change "<name>"
   ```
   This creates a scaffolded change at `openspec/changes/<name>/`.

3. **Get the artifact build order**
   ```bash
   openspec status --change "<name>" --json
   ```
   Parse the JSON to get:
   - `applyRequires`: array of artifact IDs needed before implementation (e.g., `["specs", "design"]`)
   - `artifacts`: list of all artifacts with their status and dependencies

4. **Create artifacts in sequence until apply-ready**

   Use the **TodoWrite tool** to track progress through the artifacts.

   Loop through artifacts in dependency order (artifacts with no pending dependencies first):

   a. **For each artifact that is `ready` (dependencies satisfied)**:
      - Get instructions:
        ```bash
        openspec instructions <artifact-id> --change "<name>" --json
        ```
      - The instructions JSON includes:
        - `context`: Project background (constraints for you - do NOT include in output)
        - `rules`: Artifact-specific rules (constraints for you - do NOT include in output)
        - `template`: The structure to use for your output file
        - `instruction`: Schema-specific guidance for this artifact type
        - `outputPath`: Where to write the artifact
        - `dependencies`: Completed artifacts to read for context
      - Read any completed dependency files for context
      - Create the artifact file using `template` as the structure
      - Apply `context` and `rules` as constraints - but do NOT copy them into the file
      - **After creating the artifact, run the rule-coverage audit for that artifact type** (see below)
      - Show brief progress: "✓ Created <artifact-id>"

    b. **After creating the artifact, run the quality tooling audit for that artifact type** (see [Quality Tooling Audit](#quality-tooling-audit-fast-forward) below).

    b2. **After creating all requirement tasks for a `specs` artifact, create the worker epic** (follow the same steps as `openspec-continue-change` — see its Worker Epic section): create `worker: <capability>` feature under `<change-id>`, re-parent all requirement tasks under it. For the `design` artifact, create `worker: cross-cutting` and re-parent cross-cutting tasks under it. Skip cross-cutting worker epic if no cross-cutting tasks were created. The worker epic is the entry point for a `worker` subagent spawned by the **Task tool** (`subagent_type: "worker"`) during execution.

    c. **Continue until all `applyRequires` artifacts are complete**
       - After creating each artifact, re-run `openspec status --change "<name>" --json`
       - Check if every artifact ID in `applyRequires` has `status: "done"` in the artifacts array
       - Stop when all `applyRequires` artifacts are done

   c. **If an artifact requires user input** (unclear context):
      - Use **AskUserQuestion tool** to clarify
      - Then continue with creation

5. **Show final status**
   ```bash
   openspec status --change "<name>"
   ```

**Output**

After completing all artifacts, summarize:
- Change name and location
- List of artifacts created with brief descriptions
- Rule-coverage audit summary: domains covered, research tasks created (if any)
- Quality tooling audit summary: technologies checked, parallel changes created (if any)
- Radar prerequisite check summary: radar prerequisite changes spawned, gate tasks created (if any)
- Prerequisite changes summary: prerequisite changes spawned, gate tasks created (if any)
- What's ready: "All artifacts created! Ready for implementation."
- If research tasks were created: "⚠ N research tasks created for missing rules — these gate their dependent implementation tasks. Run them in parallel before starting implementation."
- If tooling changes were created: "⚠ N quality tooling changes created — these gate completion of this change. Run them in parallel alongside implementation."
- If radar prerequisite changes were spawned: "⚠ N radar prerequisite changes created — complete and archive before archiving this change."
- If prerequisite changes were created: "⚠ N prerequisite changes created — complete and archive before archiving this change."
- Prompt: "Run `/opsx-apply` or ask me to implement to start working on the tasks."

---

## Rule-Coverage Audit (Fast-Forward)

Logic identical to `openspec-continue-change` (see SKILL.md lines 329-429). Runs inline after specs and design artifacts.

For the **specs phase**: audit each capability per the canonical process. De-duplicate research tasks across capabilities in the same fast-forward.

For the **design phase**: populate `component` frontmatter in design.md, review Technology Adoption table, and create supplementary research tasks.

### Fast-Forward Progress Output (inline format)

```
✓ Created proposal
✓ Created specs
  Rule coverage (capability: user-auth):
    ✓ code/testing (exists)
    ⚠ architecture/api-design (missing) → td-xxxxx created, blocks td-yyyyy
  Rule coverage (capability: data-export):
    ✓ code/testing (exists, shared)
✓ Created design
  Design-phase supplement:
    ⚠ delivery/observability (missing) → td-aaaaa created, blocks td-bbbbb

All artifacts created! Ready for implementation.
⚠ 2 research tasks created — run in parallel before starting implementation.
```

## Complete Audit Specifications

See `openspec-continue-change` SKILL.md for canonical audit logic:
- **Skill Audit** (line 434-481)
- **Quality Tooling Audit** (line 484-557)
- **Radar Prerequisite Check** (line 561-639)
- **Catalog Entity Audit** (line 643-743)
- **Prerequisite Changes** (line 747-809)

Fast-forward runs these audits inline during artifact creation. Output format is inline (showing progress per artifact) rather than sequential, but logic and guardrails are identical.

---

**Artifact Creation Guidelines**

- Follow the `instruction` field from `openspec instructions` for each artifact type
- The schema defines what each artifact should contain - follow it
- Read dependency artifacts for context before creating new ones
- Use `template` as the structure for your output file - fill in its sections
- **IMPORTANT**: `context` and `rules` are constraints for YOU, not content for the file
  - Do NOT copy `<context>`, `<rules>`, `<project_context>` blocks into the artifact
  - These guide what you write, but should never appear in the output

**Guardrails**
- Create ALL artifacts needed for implementation (as defined by schema's `apply.requires`)
- Always read dependency artifacts before creating a new one
- If context is critically unclear, ask the user - but prefer making reasonable decisions to keep momentum
- If a change with that name already exists, suggest continuing that change instead
- Verify each artifact file exists after writing before proceeding to next
- **Rule-coverage audit is not optional** — run it after specs and after design. If the canonical document is absent, warn and skip — do not silently omit.
- **Quality tooling audit is not optional** — run it after the rule-coverage audit for each specs capability and after the design-phase supplement. If tooling is missing, create parallel OpenSpec changes — do not defer.
- **Radar prerequisite check is not optional** — run it after the `## Technology Adoption & Usage Rules` table is populated during design authoring. If `docs/tech-radar.json` is absent, warn and skip.
- **Skill audit is not optional** — run it after the design-phase quality tooling supplement. If the `## Agent Skills` table is absent, warn and skip — do not silently omit.
- **Catalog entity audit is not optional** — run it after the radar prerequisite check. ADR annotation, TechDocs scaffolding, and TecDocs content tasks are always created per Component. If the `## Catalog Entities` table is absent, warn and skip — do not silently omit.
- **Prerequisite changes step is not optional** — run it after the catalog entity audit. If the `## Prerequisite Changes` table is absent from design.md, warn and skip.
- Research task td hierarchy MUST match `openspec-continue-change` exactly — `td-research` feature as sibling to capability nodes under the change root
- Prerequisite gate task structure MUST be identical to that produced by `openspec-continue-change` — same title format, same parent, same body
