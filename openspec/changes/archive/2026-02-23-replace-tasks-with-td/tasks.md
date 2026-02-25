## 1. Schema Updates

- [x] 1.1 Update `openspec/schemas/spec-driven-custom/schema.yaml`: add `td init` prerequisite check and `td` issue creation steps to `proposal` artifact instruction
- [x] 1.2 Update `openspec/schemas/spec-driven-custom/schema.yaml`: add `td` issue creation steps (spec feature, requirement tasks, board creation, `td link`, frontmatter) to `specs` artifact instruction
- [x] 1.3 Update `openspec/schemas/spec-driven-custom/schema.yaml`: add cross-cutting `td` task creation steps (`td create`, `td link`, frontmatter) to `design` artifact instruction
- [x] 1.4 Update `openspec/schemas/spec-driven-custom/schema.yaml`: remove `tasks` artifact entry entirely
- [x] 1.5 Update `openspec/schemas/spec-driven-custom/schema.yaml`: change `apply` block — remove `tracks: tasks.md`, change `requires` from `[tasks]` to `[specs, design]`, replace instruction with `td`-based apply loop description
- [x] 1.6 Apply identical changes to `openspec/schemas/v1/schema.yaml`

## 2. Schema Template Cleanup

- [x] 2.1 Delete `openspec/schemas/spec-driven-custom/templates/tasks.md`
- [x] 2.2 Delete `openspec/schemas/v1/templates/tasks.md`

## 3. Apply Skill

- [x] 3.1 Update `openspec-apply-change` SKILL.md: replace "read context files" step to parse `proposal.md` frontmatter for `td-board` and `td-issue`
- [x] 3.2 Update `openspec-apply-change` SKILL.md: replace checkbox task loop with `td board show` + `td next` + `td start` + `td log` + `td review` loop
- [x] 3.3 Update `openspec-apply-change` SKILL.md: replace progress display (N/M tasks) with `td board show` output
- [x] 3.4 Update `openspec-apply-change` SKILL.md: add empty-board warning when `td board show` returns no issues
- [x] 3.5 Update `openspec-apply-change` SKILL.md: replace completion check (all `[x]`) with all issues `closed` on board

## 4. Verify Skill

- [x] 4.1 Update `openspec-verify-change` SKILL.md: replace `tasks.md` checkbox parsing in completeness check with `td board show "<change-name>"` and flag non-closed issues as CRITICAL
- [x] 4.2 Update `openspec-verify-change` SKILL.md: remove references to `tasks.md` from graceful degradation section

## 5. Archive Skill

- [x] 5.1 Update `openspec-archive-change` SKILL.md: replace "read tasks file and count `- [ ]`" guard with `td board show "<change-name>"` non-closed issue check
- [x] 5.2 Update `openspec-archive-change` SKILL.md: update warning message to list open `td` issue titles rather than incomplete checkbox count

## 6. Continue Skill

- [x] 6.1 Update `openspec-continue-change` SKILL.md: remove `tasks.md` from artifact creation guidelines
- [x] 6.2 Update `openspec-continue-change` SKILL.md: add `td` issue creation steps to `specs` artifact pattern description
- [x] 6.3 Update `openspec-continue-change` SKILL.md: add `td` issue creation steps to `design` artifact pattern description
- [x] 6.4 Update `openspec-continue-change` SKILL.md: add `td` issue creation steps to `proposal` artifact pattern description

## 7. Proposal Artifact Backfill

- [x] 7.1 Update `openspec/changes/replace-tasks-with-td/proposal.md`: correct stale references to `td-tasks` artifact — align wording with final design (no separate artifact, task creation woven into specs/design authoring)
