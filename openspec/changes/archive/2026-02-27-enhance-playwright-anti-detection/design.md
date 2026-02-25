---
status: "accepted"
date: 2026-02-27
decision-makers: ["platform-architect"]
consulted: []
informed: ["platform engineers"]
tech-radar:
  - name: playwright-extra
    quadrant: Frameworks/Libraries
    ring: Assess
    description: Stealth plugin wrapper for Playwright — useful for anti-detection scraping but not yet Adopt due to limited maintenance signals
    moved: 1
  - name: playwright-extra-plugin-stealth
    quadrant: Frameworks/Libraries
    ring: Assess
    description: Community stealth plugin that suppresses webdriver fingerprints; pair with playwright-extra
    moved: 1
td-board: enhance-playwright-anti-detection
td-issue: td-a97763
---

# Design: Enhance Playwright Skill with Anti-Detection Techniques

## Context and problem statement

The `playwright-browser` skill documents headless automation via `playwright-cli` but provides no guidance for scenarios where the target site employs bot-detection (fingerprinting, IP reputation, behavioral analysis). Engineers using the skill on protected sites encounter silent failures or blocks with no remediation path. Adding anti-detection guidance closes this gap without introducing new mandatory platform dependencies.

## Decision criteria

This design achieves:

- **Skill completeness** (60%): The skill becomes a single reference for both standard and anti-detection Playwright automation
- **Minimal coupling** (40%): Anti-detection guidance is additive; it does not break existing CLI-based workflows or require mandatory new dependencies

Explicitly excludes:

- Installing `playwright-extra` as a platform-level dependency (optional guidance only)
- Supporting non-Playwright anti-detection frameworks (e.g., Puppeteer Stealth)
- Automated proxy provisioning or management tooling

## Considered options

### Option 1: Separate anti-detection skill file

Create `.opencode/skills/playwright-anti-detection/SKILL.md` as a standalone skill.

Rejected: Two skills for the same browser tool creates context-switching overhead and duplicates session/workflow sections. Engineers loading the base skill will miss the anti-detection guidance.

### Option 2: Enhance existing SKILL.md with a dedicated section

Append an `## Anti-Detection` section to the existing `playwright-browser` SKILL.md covering all four pillars: stealth plugins, proxy rotation, human-like behavior, fingerprint randomization.

**Selected.** Single source of truth, additive only, no mandatory dependency changes.

### Option 3: External documentation link only

Point to upstream playwright-extra README.

Rejected: Provides no context on how to apply these techniques within the existing `playwright-cli` workflow or platform conventions.

## Decision outcome

Enhance `.opencode/skills/headless-web-navigation/SKILL.md` with a new `## Anti-Detection` section covering four areas in order of implementation priority:

1. **Stealth Plugin** — `playwright-extra` + `playwright-extra-plugin-stealth` to suppress webdriver flags; fallback `run-code` snippet for CLI-only environments
2. **Human-like Behavior** — randomized delays, `mousemove` before `click`, `type` instead of `fill`, realistic pacing patterns
3. **Fingerprint Randomization** — User-Agent/OS match requirement, viewport variance, locale/timezone alignment, canvas/WebGL noise via stealth plugin

## Risks / trade-offs

- Risk: `playwright-extra` ecosystem maintenance is community-driven and may lag Playwright releases → Mitigation: document as `Assess` ring in tech radar; note version pinning requirement
- Trade-off: Adding the section increases SKILL.md length → acceptable; the section is clearly delimited and skippable for standard automation tasks
- Note: Proxy rotation guidance was removed from scope — proxy infrastructure (provider selection, credential rotation) belongs to network/infra guidance, not a browser automation skill

## Migration plan

1. Append `## Anti-Detection` section to SKILL.md (no breaking changes)
2. No service restarts, deployments, or data migrations required
3. Rollback: revert the section; no downstream state affected

## Confirmation

- All three technique areas (stealth, human-behavior, fingerprint) are present and searchable in SKILL.md
- Stealth plugin fallback (`run-code`) is documented for CLI-only environments
- User-Agent/OS mismatch warning is present

## Open questions

- None — all design decisions resolved above

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| playwright-extra | platform-architect | n/a — Assess ring; usage guidance in SKILL.md | reviewed |
| playwright-extra-plugin-stealth | platform-architect | n/a — Assess ring; covered by stealth section in SKILL.md | reviewed |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Playwright anti-detection | worker, explore | `.opencode/skills/headless-web-navigation/SKILL.md` | update | Existing skill needs anti-detection section added |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | No new curated entities introduced by this change |

## TecDocs & ADRs

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| — | — | — | n/a | n/a | n/a |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| n/a | — | — |
