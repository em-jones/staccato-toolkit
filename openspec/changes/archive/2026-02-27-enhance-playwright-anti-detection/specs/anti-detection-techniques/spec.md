---
td-board: enhance-playwright-anti-detection-anti-detection-techniques
td-issue: td-1ace27
---

# Specification: Anti-Detection Techniques

## Overview

Defines requirements for evading automated browser detection in Playwright-based automation tasks, covering stealth plugins, human-like interaction simulation, and browser fingerprint management.

## ADDED Requirements

### Requirement: Stealth Plugin Integration

The skill SHALL document how to use `playwright-extra` and `playwright-extra-plugin-stealth` to suppress automation fingerprints (navigator.webdriver, Chrome runtime, headless signals) so that bot detection systems cannot trivially identify the browser as automated.

#### Scenario: Stealth plugin applied at session open

- **WHEN** the user opens a browser session for scraping or testing on a bot-protected site
- **THEN** the skill guidance SHALL instruct use of `playwright-extra` with the stealth plugin loaded before page interaction, hiding webdriver flags and common headless indicators

#### Scenario: Fallback without stealth plugin

- **WHEN** `playwright-extra` is not available (e.g., CLI-only environment)
- **THEN** the skill SHALL provide equivalent manual mitigation steps (remove navigator.webdriver via `run-code`, set realistic User-Agent)

### Requirement: Human-like Behavior Patterns

The skill SHALL document interaction patterns that mimic human navigation to avoid rate-limit and behavioral bot detection, including randomized delays, mouse movement, and natural typing cadence.

#### Scenario: Randomized delay between actions

- **WHEN** performing a sequence of interactions (click, fill, navigate)
- **THEN** the skill SHALL instruct adding randomized `sleep` delays (e.g., 500–2500ms) between actions rather than rapid sequential commands

#### Scenario: Mouse movement simulation

- **WHEN** interacting with page elements
- **THEN** the skill SHALL demonstrate using `mousemove` to move the cursor to a human-like intermediate position before `click`, rather than clicking directly on a reference

#### Scenario: Natural typing cadence

- **WHEN** filling text input fields
- **THEN** the skill SHALL recommend using `type` (character-by-character) with random inter-character delays instead of `fill` (which sets value instantly)

### Requirement: Browser Fingerprint Randomization

The skill SHALL provide guidance on randomizing browser properties — User-Agent string, viewport size, locale, timezone, and platform — so that fingerprinting scripts cannot build a consistent profile of the automated browser.

#### Scenario: User-Agent matches OS

- **WHEN** configuring a browser session
- **THEN** the skill SHALL require that the User-Agent string matches the host operating system and browser version, and SHALL warn against mismatched UA strings (e.g., Windows UA on Linux host)

#### Scenario: Viewport and locale randomization

- **WHEN** opening a browser session
- **THEN** the skill SHALL recommend varying viewport dimensions within realistic ranges (e.g., 1280–1920px width) and setting locale/timezone to match the target region

#### Scenario: Canvas and WebGL fingerprint mitigation

- **WHEN** operating on highly fingerprint-aware sites
- **THEN** the skill SHALL note that `playwright-extra-plugin-stealth` handles canvas/WebGL noise injection automatically, and document the manual `run-code` alternative for environments without the plugin

## REMOVED Requirements

### Requirement: Proxy Rotation Configuration

**Reason**: Removed from scope at user request. Proxy infrastructure management (provider selection, credential rotation, residential vs. datacenter tradeoffs) is out of scope for a browser automation skill — it belongs to network/infrastructure guidance.

**Migration**: No migration needed; proxy configuration was never part of a released artifact. Users requiring proxy support can pass `--proxy-server` directly to `playwright-cli` at launch; no skill guidance is prescribed.
