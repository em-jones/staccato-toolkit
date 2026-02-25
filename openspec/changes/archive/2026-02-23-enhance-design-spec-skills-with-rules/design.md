---
td-board: enhance-design-spec-skills-with-rules
td-issue: td-95a256
---

# Design: Enhance Design & Spec Skills with Rules Awareness

## Context and Problem Statement

The OpenSpec workflow creates implementation tasks (td issues) during the specs and design phases, but those tasks carry no reference to the domain knowledge workers need to implement them. Rule files exist in `.opencode/rules/` but are only surfaced when a platform-architect manually injects them into a worker invocation. There is no systematic check that the relevant rules exist at all before implementation begins.

The result: workers either guess at conventions, ask for clarification, or implement inconsistently — all of which create rework.

The fix is to wire rule-coverage awareness directly into the phases that create tasks, using td's existing dependency mechanism as the gate.

## Decision Criteria

This design achieves:

- **Rule coverage is audited automatically** during specs and design phases, not as a separate step
- **Missing rules block their dependent tasks** via td `--depends-on`, so `td next` naturally surfaces research before implementation
- **No new schema artifact** — the workflow sequence stays `proposal → specs → design → apply`
- **No file to go stale** — td dependency state is the source of truth for what's blocked

Explicitly excludes:

- A `research.md` artifact or any file-based gate mechanism
- Hard blocking of the apply phase (soft gate only — architect may proceed with explicit acknowledgment)
- Automated rule generation — research tasks require human authorship using the `create-usage-rules` skill

## Decisions

### D1: No `research.md` artifact — td dependency graph is the gate

**Decision**: Rule-coverage gaps are represented as td tasks (`--type task`) parented to a `td-research` feature issue, with `--depends-on` wired from affected requirement tasks. No file artifact is created or maintained.

**Alternatives considered**:
- *`research.md` file artifact* — provides human-readable audit summary but requires manual updates to stay current; stale state undermines the gate. Rejected.
- *Checklist in `design.md`* — same staleness problem; design.md is authored once and not updated as rules are created. Rejected.

**Rationale**: `td next` already respects `--depends-on`. Research tasks surface before their dependent implementation tasks automatically. When a worker closes a research task (rule created), implementation tasks unlock with no additional orchestration.

### D2: Research tasks are a sibling branch under the change root

**Decision**: The td hierarchy for a change gains a `td-research` feature node as a sibling to capability nodes:

```
td-<change-root>  (feature)
├── td-research   (feature — "research: <change-name>")
│   ├── td-rr1   (task — "Create rule: patterns/architecture/api-design.md")
│   └── td-rr2   (task — "Create rule: patterns/delivery/ci-cd.md")
├── td-cap1       (feature — capability spec)
│   ├── td-req1  (task — requirement, --depends-on td-rr1)
│   └── td-req2  (task — requirement)
└── td-xcut1      (task — cross-cutting from design, --depends-on td-rr2)
```

**Alternatives considered**:
- *Research tasks flat under change root* — clutters the main board with non-implementation tasks. Rejected.
- *Research tasks as children of the requirement tasks they gate* — inverts the ownership relationship; a rule may gate multiple requirements across capabilities. Rejected.
- *Standalone research tasks, no parent* — disappear from the change board entirely. Rejected.

**Rationale**: A dedicated `td-research` feature node keeps research work visible as a coherent parallel track, queryable via `descendant_of(td-research-id)`, without polluting the implementation board.

### D3: Rule-coverage audit runs in two phases — specs and design

**Decision**: The audit runs twice per change:

1. **Specs phase**: after creating requirement tasks for a capability, the skill checks the canonical patterns list for domains relevant to that capability and creates research tasks for missing rules
2. **Design phase**: after writing design.md and creating cross-cutting tasks, the skill reviews the Technology Adoption table and pattern decisions for any additional missing rules not already caught in the specs phase

Research tasks created in the specs phase may already cover design-phase gaps — the design step supplements, it doesn't duplicate.

**Rationale**: Specs identify *what* is being built (capability shape → relevant patterns). Design identifies *how* (technology choices → additional pattern requirements). Both perspectives are needed for complete coverage.

### D4: The canonical patterns document is the audit reference

**Decision**: `.opencode/rules/patterns/README.md` is the single authoritative list of pattern domains for which rules must exist. It is organised by layer and includes, for each domain:

- What the pattern covers
- Trigger condition (when a capability needs this rule)
- Source literature to consult when writing the rule
- Expected rule file path

The four layers, drawn from industry literature:

```
code/          ← Clean Code, Clean Architecture (Robert C. Martin)
  naming
  functions
  error-handling
  testing
  solid

architecture/  ← Clean Architecture, Enterprise Integration Patterns (Hohpe & Woolf)
  boundaries
  api-design
  data-modeling
  async-messaging

delivery/      ← Continuous Delivery (Humble & Farley)
  ci-cd
  environments
  observability
  feature-flags

operations/    ← AWS Well-Architected Framework (6 pillars)
  security
  reliability
  performance
  cost
```

**Rationale**: A single reference document makes the audit deterministic — the skill walks the canonical list, checks `.opencode/rules/` for each entry, and creates research tasks for gaps. Without a canonical list, coverage is ad hoc and dependent on the architect's recall.

### D5: Research task descriptions carry the reasoning

**Decision**: Each research task is created with a `--body` that includes:
- Which capabilities depend on it
- What design decision triggered the gap
- The canonical README anchor for this pattern domain
- Specific source literature to consult

**Example**:
```
td create "Create rule: patterns/architecture/api-design.md" \
  --type task --parent <td-research-id> \
  --body "Needed by: task-rule-linking capability
Triggered by: design decision to expose REST API
Canonical ref: .opencode/rules/patterns/README.md#api-design
Sources: Clean Architecture Ch. 22; Fielding REST dissertation"
```

**Rationale**: The information currently imagined for `research.md` lives in the task description instead. Workers picking up a research task have full context without needing a separate file.

### D6: Rule files are linked to their dependent tasks after creation

**Decision**: When a worker completes a research task (creates the rule file), they run:
```
td link <requirement-task-id> .opencode/rules/patterns/<domain>.md --role reference
```
for each task that depended on the research task. This completes the two-way linkage: task → rule, so future workers picking up the task see the rule in `td show`.

**Rationale**: Closes the loop. The goal of this whole change is that workers receive domain rules automatically. Linking at research-completion time rather than task-creation time is a pragmatic compromise — the rule doesn't exist at task-creation time.

### D7: Soft gate — apply may proceed with explicit acknowledgment

**Decision**: The apply skill checks for open research tasks on the board before beginning implementation. If any are open, it warns:

> "⚠ Open research tasks detected. These rules are missing and their dependent implementation tasks are blocked. You may proceed, but affected tasks will be skipped by `td next` until research is complete."

It does not hard-block. The architect may proceed if the pattern domain is well-understood and the rule can be created in parallel.

**Rationale**: A hard gate would block the entire change if one rule takes time to research. Per-capability blocking via `--depends-on` already handles the fine-grained case. The warning surfaces the situation without requiring a decision.

## Risks / Trade-offs

- **[Risk] Skill makes incorrect inference about which patterns a capability needs** → Mitigation: the skill presents its inferences for architect review before creating research tasks; it is a best-effort pass, not authoritative
- **[Risk] Canonical patterns list becomes stale as the platform evolves** → Mitigation: `last-validated` frontmatter on the README; reviewed at the verify phase of any change that touches it
- **[Trade-off] Research task descriptions carry context that was previously in a file** → `td show` is less scannable than a markdown doc, but the information is always current and never drifts
- **[Trade-off] `--depends-on` wiring is done at task-creation time, before the rule exists** → The dependency is created speculatively; if the architect decides a rule isn't needed after all, the dependency must be manually removed

## Migration Plan

1. Create `.opencode/rules/patterns/README.md` — the canonical patterns document
2. Update `openspec/schemas/v1/schema.yaml` — add rule-coverage audit instructions to `specs` and `design` artifact instruction blocks
3. Update `.opencode/skills/openspec-continue-change/SKILL.md` — add rule-coverage audit step to specs and design artifact patterns
4. Update `.opencode/skills/openspec-ff-change/SKILL.md` — add rule-coverage audit step alongside task creation

No existing changes are affected. The new steps are additive to existing artifact authoring instructions.

## Open Questions

- None. All design questions resolved during exploration.

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| — | — | n/a — no new technologies adopted | n/a |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | No new curated entities introduced by this change |
