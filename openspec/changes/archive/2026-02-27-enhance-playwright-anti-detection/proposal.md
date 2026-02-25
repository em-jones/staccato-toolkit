---
td-board: enhance-playwright-anti-detection
td-issue: td-a97763
---

# Proposal: Enhance Playwright Skill with Anti-Detection Techniques

## Why

The existing `playwright-browser` skill provides solid headless automation but lacks guidance on evading bot detection systems that block automated browsers. This is critical for web scraping, competitive research, and testing on sites with anti-bot measures.

## What Changes

- Add stealth plugin guidance (`playwright-extra` + `playwright-extra-plugin-stealth`) to hide automated browser fingerprints
- Add human-like behavior patterns using `page.mouse`, `page.keyboard`, and randomized timing
- Add browser fingerprint randomization guidance (User-Agent matching OS, randomized viewport/locale)

## Capabilities

### New Capabilities

- `anti-detection-techniques`: Techniques and configuration patterns for evading bot detection in Playwright automation, covering stealth plugins, human-like interaction simulation, and browser fingerprint management

### Modified Capabilities

_(none — this is an additive enhancement to the skill documentation)_

## Impact

- Affected systems: `.opencode/skills/headless-web-navigation/SKILL.md`
- API changes: No
- Data model changes: No
- Dependencies: `playwright-extra`, `playwright-extra-plugin-stealth` (optional npm packages; usage guidance only — not installed in platform)
