# Unit Tests: Agents

**ALWAYS**: Adhere to the [readme.md](./README.md) guidelines for writing and performing unit tests.

Tests for verifying that agents are dispatched correctly and execute their responsibilities as
defined in their agent definition files and the skills they load.

---

## Agent: researcher

Tests to ensure the researcher agent correctly performs the `address-usage-gaps` skill: reading task
context, identifying technology gaps, creating or downloading skills, and applying skill labels.

### Requirement: Task context is read before any action

The researcher SHALL run `td context <id>` for each assigned task id before performing any research
or skill-creation work.

#### Scenario: td context is called for each assigned task

- **GIVEN** the researcher is dispatched with two task ids (e.g., `td-abc123` and `td-def456`)
- **WHEN** the researcher begins work
- **THEN** it runs `td context td-abc123`
- **AND** it runs `td context td-def456`
- **AND** it does not begin researching technologies for a task before its context is read

#### Scenario: Researcher reads task body to identify technologies

- **GIVEN** a task context that mentions a specific technology (e.g., "implement gRPC service using
  protobuf")
- **WHEN** the researcher reads the task body
- **THEN** it identifies `gRPC` and `protobuf` as technologies requiring skill coverage
- **AND** it checks whether skills for those technologies already exist under `.agents/skills/`

---

### Requirement: All research uses jCodemunch and jDocmunch exclusively

The researcher SHALL use `jcodemunch_*` tools for all local code exploration and `jdocmunch_*` tools
for all documentation exploration. It SHALL NOT fall back to Read, Grep, Glob, or Bash for these
purposes — this policy applies at all times, including within the `auto-skill-creator` workflow.

#### Scenario: Code exploration uses jCodemunch only

- **GIVEN** the researcher needs to inspect a local code file to understand a technology's usage
- **WHEN** the researcher explores the codebase
- **THEN** it calls `jcodemunch_resolve_repo` first, then `jcodemunch_index_folder` if not indexed
- **AND** it calls `jcodemunch_get_file_outline` or `jcodemunch_get_file_content` to read files
- **AND** it does NOT use Read, Grep, Glob, or Bash for any code exploration action

#### Scenario: Documentation exploration uses jDocmunch only

- **GIVEN** the researcher needs to read documentation (e.g., a markdown spec or external docs)
- **WHEN** the researcher explores documentation
- **THEN** it calls `jdocmunch_*` tools exclusively
- **AND** it does not use Read, Grep, Glob, or Bash to open, search, or inspect any documentation
  file

#### Scenario: Remote source code fetched via headless-web-navigation then indexed

- **GIVEN** a technology whose source code and documentation are not available locally
- **WHEN** the researcher cannot find it via jCodemunch
- **THEN** it loads the `headless-web-navigation` skill to locate the repository URL
- **AND** it uses `jcodemunch_*` tools to explore the remote codebase once found
- **AND** it uses `jdocmunch_*` tools to explore the documentation repository if separate

#### Scenario: jCodemunch/jDocmunch policy is enforced inside auto-skill-creator

- **GIVEN** the researcher has loaded the `auto-skill-creator` skill to build a missing skill
- **WHEN** `auto-skill-creator` performs its research phase
- **THEN** all code exploration within that workflow uses `jcodemunch_*` tools only
- **AND** all documentation exploration within that workflow uses `jdocmunch_*` tools only
- **AND** the tool exclusivity policy is not relaxed for the nested skill-creation context

---

### Requirement: Missing skills are discovered before being created from scratch

The researcher SHALL use the `find-skills` skill to search for an existing downloadable skill
before authoring a new one. Only when `find-skills` returns no result SHALL it fall back to
`auto-skill-creator` to build the skill.

#### Scenario: find-skills is consulted for each identified technology gap

- **GIVEN** the researcher has identified that a task requires a skill for technology X
- **AND** no skill for X exists under `.agents/skills/`
- **WHEN** the researcher addresses the gap
- **THEN** it loads the `find-skills` skill and runs `npx skills find <technology>` (or equivalent)
- **AND** it does NOT immediately invoke `auto-skill-creator` without first consulting `find-skills`

#### Scenario: Skill installed via find-skills is audited before use

- **GIVEN** `find-skills` returns a downloadable skill for technology X
- **WHEN** the researcher installs the skill
- **THEN** it runs `uvx skill-audit ./.agents/skills/<skill_name>/` on the installed skill
- **AND** it edits the skill file to address any vulnerabilities surfaced by the audit
- **AND** only then proceeds to apply the skill label to the task

#### Scenario: auto-skill-creator is used when find-skills returns no result

- **GIVEN** `find-skills` returns no matching skill for technology X
- **WHEN** the researcher cannot find a pre-built skill
- **THEN** it loads the `auto-skill-creator` skill
- **AND** it runs `auto-skill-creator` in **autonomous mode** (no user-input gates)
- **AND** research within `auto-skill-creator` uses `jcodemunch_*` and `jdocmunch_*` tools
- **AND** the skill is authored and iterated to completion before the label is applied
- **AND** it does NOT silently skip labeling the task

---

### Requirement: Composite skills are created when a task requires multiple technologies

The researcher SHALL create a single composite skill (e.g., `go-grpc-service`) when a task requires
more than one technology and no existing skill already covers the combination.

#### Scenario: Multiple technologies in one task produce one composite skill

- **GIVEN** a task context that requires both `go-developer` knowledge and
  `observability-instrumentation` knowledge
- **AND** no existing skill covers both together
- **WHEN** the researcher resolves the gap
- **THEN** it creates a composite skill file under `.agents/skills/<composite-name>/SKILL.md`
- **AND** the composite skill references or incorporates guidance from both constituent skills
- **AND** it applies ONE label (`skill:<composite-name>`) to the task, not two separate labels

#### Scenario: Each task receives at most one skill label

- **GIVEN** the researcher is processing any task
- **WHEN** it applies a skill label via `td update <id> --labels`
- **THEN** the task has exactly one `skill:*` label applied to it
- **AND** the label value matches the directory name of the skill under `.agents/skills/`

---

### Requirement: Skills are stored at the canonical path with the correct file name

The researcher SHALL create skills at `.agents/skills/<skill-name>/SKILL.md` and the `skill_name`
in the label SHALL match the directory name exactly.

#### Scenario: Skill directory name matches label value

- **GIVEN** the researcher creates a new skill for technology X stored at
  `.agents/skills/my-skill/SKILL.md`
- **WHEN** it applies the skill label to the task
- **THEN** the label is `skill:my-skill` (matching the directory name)
- **AND** not `skill:My-Skill` or any other casing variant

#### Scenario: Skill file is named SKILL.md

- **GIVEN** the researcher creates any new skill
- **WHEN** it writes the skill to disk
- **THEN** the file is created at `.agents/skills/<skill-name>/SKILL.md`
- **AND** not at any other path (e.g., `skill.md`, `README.md`, or a subdirectory)

---

### Requirement: Progress is logged with td throughout execution

The researcher SHALL use `td log` to record progress, decisions, blockers, and uncertainty as it
works through each task, following the td-task-management skill logging conventions.

#### Scenario: Researcher logs progress after each significant step

- **GIVEN** the researcher completes the gap-identification step for a task
- **THEN** it calls `td log` with a message describing what technologies were found
- **AND** when a skill is created or downloaded, it calls `td log` again recording the outcome
- **AND** when a label is applied, it calls `td log` confirming the label applied

#### Scenario: Uncertain findings are flagged with --uncertain

- **GIVEN** the researcher is unsure whether an existing skill covers a task's requirements
- **WHEN** it logs that uncertainty
- **THEN** it passes `--uncertain` to the `td log` call
- **AND** it does NOT silently assume the skill is sufficient without flagging the ambiguity

---

### Requirement: Skill labels are applied via td update --labels in the correct format

The researcher SHALL apply skill labels using `td update <id> --labels "skill:<skill_name>"` after
creating or confirming the skill exists, as the final step for each task.

#### Scenario: Label is applied after skill is confirmed to exist

- **GIVEN** the researcher has confirmed a skill exists (either found or newly created)
- **WHEN** it applies the label
- **THEN** it runs `td update <task_id> --labels "skill:<skill_name>"`
- **AND** the label format uses a `skill:` prefix with no spaces and lowercase `<skill_name>`

#### Scenario: Label is not applied before skill file exists on disk

- **GIVEN** the researcher is still in the process of creating a skill file
- **WHEN** the skill file has not yet been written
- **THEN** it does NOT call `td update --labels` for that task yet
- **AND** it only applies the label after the skill file is confirmed to exist at
  `.agents/skills/<skill-name>/SKILL.md`

#### Scenario: All assigned tasks receive a label by end of execution

- **GIVEN** the researcher is dispatched with N task ids
- **WHEN** the researcher finishes
- **THEN** every task id has exactly one `skill:*` label
- **AND** no task is left unlabeled unless an explicit blocker was logged
