---
name: playwright-browser
description: Headless browser automation using Playwright CLI. Use when you need headless browsing, parallel browser sessions, UI testing, screenshots, web scraping, or browser automation that can run in the background. Keywords - playwright, headless, browser, test, screenshot, scrape, parallel.
compatbility: opencode
---

# Playwright Browser

## Purpose

Automate browsers using `playwright-cli` — a token-efficient CLI for Playwright. Runs headless by default, supports parallel sessions via named sessions (`-s=`), and doesn't load tool schemas into context.

## Key Details

- **Headless by default** — pass `--headed` to `open` to see the browser
- **Parallel sessions** — use `-s=<name>` to run multiple independent browser instances
- **Persistent profiles** — cookies and storage state preserved between calls
- **Token-efficient** — CLI-based, no accessibility trees or tool schemas in context
- **Vision mode** (opt-in) — set `PLAYWRIGHT_MCP_CAPS=vision` to receive screenshots as image responses in context instead of just saving to disk

## Sessions

**Always use a named session.** Derive a short, descriptive kebab-case name from the user's prompt. This gives each task a persistent browser profile (cookies, localStorage, history) that accumulates across calls.

```bash
# Derive session name from prompt context:
# "test the checkout flow on mystore.com" → -s=mystore-checkout
# "scrape pricing from competitor.com"    → -s=competitor-pricing
# "UI test the login page"               → -s=login-ui-test

playwright-cli -s=mystore-checkout open https://mystore.com --persistent
playwright-cli -s=mystore-checkout snapshot
playwright-cli -s=mystore-checkout click e12
```

Managing sessions:

```bash
playwright-cli list                                     # list all sessions
playwright-cli close-all                                # close all sessions
playwright-cli -s=<name> close                          # close specific session
playwright-cli -s=<name> delete-data                    # wipe session profile
```

## Quick Reference

```
Core:       open [url], goto <url>, click <ref>, fill <ref> <text>, type <text>, snapshot, screenshot [ref], close
Navigate:   go-back, go-forward, reload
Keyboard:   press <key>, keydown <key>, keyup <key>
Mouse:      mousemove <x> <y>, mousedown, mouseup, mousewheel <dx> <dy>
Tabs:       tab-list, tab-new [url], tab-close [index], tab-select <index>
Save:       screenshot [ref], pdf, screenshot --filename=f
Storage:    state-save, state-load, cookie-*, localstorage-*, sessionstorage-*
Network:    route <pattern>, route-list, unroute, network
DevTools:   console, run-code <code>, tracing-start/stop, video-start/stop
Sessions:   -s=<name> <cmd>, list, close-all, kill-all
Config:     open --headed, open --browser=chrome, resize <w> <h>
```

## Workflow

1. Derive a session name from the user's prompt and open with `--persistent` to preserve cookies/state. Always set the viewport via env var at launch:

```bash
PLAYWRIGHT_MCP_VIEWPORT_SIZE=1440x900 playwright-cli -s=<session-name> open <url> --persistent
# or headed:
PLAYWRIGHT_MCP_VIEWPORT_SIZE=1440x900 playwright-cli -s=<session-name> open <url> --persistent --headed
# or with vision (screenshots returned as image responses in context):
PLAYWRIGHT_MCP_VIEWPORT_SIZE=1440x900 PLAYWRIGHT_MCP_CAPS=vision playwright-cli -s=<session-name> open <url> --persistent
```

> **Stealth sessions**: If `.playwright-cli-init.ts` exists in the project root, activate it by setting
> `PLAYWRIGHT_MCP_INIT_PAGE` before the first `open`. Kill any existing sessions first so the daemon
> picks up the new env var:
>
> ```bash
> playwright-cli kill-all
> PLAYWRIGHT_MCP_INIT_PAGE="$(pwd)/.playwright-cli-init.ts" PLAYWRIGHT_MCP_VIEWPORT_SIZE=1440x900 playwright-cli -s=<session-name> open <url> --persistent
> ```

1. Get element references via snapshot:

```bash
playwright-cli snapshot
```

1. Interact using refs from snapshot:

```bash
playwright-cli click <ref>
playwright-cli fill <ref> "text"
playwright-cli type "text"
playwright-cli press Enter
```

1. Capture results:

```bash
playwright-cli screenshot
playwright-cli screenshot --filename=output.png
```

1. **Always close the session when done.** This is not optional — close the named session after finishing your task:

```bash
playwright-cli -s=<session-name> close
```

## Configuration

If a `playwright-cli.json` exists in the working directory, use it automatically. If the user provides a path to a config file, use `--config path/to/config.json`. Otherwise, skip configuration — the env var and CLI defaults are sufficient.

```json
{
  "browser": {
    "browserName": "chromium",
    "launchOptions": { "headless": true },
    "contextOptions": { "viewport": { "width": 1440, "height": 900 } }
  },
  "outputDir": "./screenshots"
}
```

## Full Help

Run `playwright-cli --help` or `playwright-cli --help <command>` for detailed command usage.

See [docs/playwright-cli.md](docs/playwright-cli.md) for full documentation.

## Anti-Detection

Use these techniques when automating sites with bot-detection systems (fingerprinting, IP reputation checks, behavioral analysis). Apply in priority order: stealth plugin → human-like behavior → fingerprint randomization.

> **Scope**: This section covers automation-level techniques. Always ensure your use case complies with the target site's terms of service.

---

### 1. Stealth Plugin (suppress automation fingerprints)

**Preferred CLI approach — `PLAYWRIGHT_MCP_INIT_PAGE`:**

Use the project-root `.playwright-cli-init.ts` init page. It is loaded per-tab by the daemon and applies
all evasions before any page scripts run — covering `navigator.webdriver`, plugins, languages,
`hardwareConcurrency`, `deviceMemory`, the `chrome` runtime object, permissions query patching, and
iframe propagation.

```bash
playwright-cli kill-all   # restart daemon so it picks up the env var
PLAYWRIGHT_MCP_INIT_PAGE="$(pwd)/.playwright-cli-init.ts" \
  playwright-cli -s=<session> open <url> --persistent
```

> **Why `kill-all` first**: The daemon inherits env vars at spawn time. Existing sessions won't pick
> up a newly set `PLAYWRIGHT_MCP_INIT_PAGE` without a restart.

**Last-resort fallback (no init file available):**

Suppress the webdriver flag post-navigation via `run-code`. This runs *after* page scripts so it is
less reliable, but covers the most obvious signal:

```bash
playwright-cli -s=<session> open <url> --persistent
playwright-cli -s=<session> run-code "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
playwright-cli -s=<session> run-code "delete window.__playwright; delete window.__pw_manual;"
```

> **Note**: `run-code` suppression covers only the most obvious signals and runs post-load.
> `.playwright-cli-init.ts` + `PLAYWRIGHT_MCP_INIT_PAGE` is the correct approach for this project.

---

### 2. Human-like Behavior (evade behavioral detection)

Bot detectors analyze interaction timing and mouse movement patterns. Mimic human behavior with three techniques:

#### 2a. Randomized delays between actions

```bash
# Between each interaction, add a random sleep (500–2500ms)
playwright-cli -s=<session> click e12
sleep 1.3   # vary this: 0.5–2.5s
playwright-cli -s=<session> fill e15 "search term"
sleep 0.8
playwright-cli -s=<session> press Enter
sleep 2.1
```

Avoid uniform delays (e.g., always 1000ms) — detectors flag rhythmic patterns.

#### 2b. Mouse movement before clicks

Move the cursor to a natural intermediate position before clicking a target element:

```bash
# Get element coordinates via snapshot first, then arc the mouse
playwright-cli -s=<session> snapshot          # identify target ref and coordinates
playwright-cli -s=<session> mousemove 500 400  # intermediate point (not the target)
playwright-cli -s=<session> mousemove 612 318  # approach the target
playwright-cli -s=<session> click e12          # now click
```

#### 2c. Natural typing cadence — use `type` not `fill`

`fill` sets the input value instantly (machine-like). `type` sends key events character by character:

```bash
# ✗ Machine-like — sets value atomically
playwright-cli -s=<session> fill e15 "search query"

# ✓ Human-like — sends key events with natural cadence
playwright-cli -s=<session> type "search query"
```

Add delays between words for longer text entries:

```bash
playwright-cli -s=<session> type "search "
sleep 0.3
playwright-cli -s=<session> type "query"
```

---

### 3. Browser Fingerprint Randomization (avoid profiling)

Fingerprinting scripts build device profiles from browser properties. Randomize these at session launch to prevent consistent identification.

#### 3a. User-Agent MUST match host OS

A mismatched User-Agent (e.g., Windows UA on a Linux host) is an immediate detection signal.

```bash
# Linux host — use a Linux Chrome UA
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

playwright-cli -s=<session> run-code "Object.defineProperty(navigator, 'userAgent', {get: () => '$UA'})"
```

Match the OS, browser, and a realistic (not bleeding-edge) version number.

#### 3b. Viewport variance

Avoid the default 1440x900 for every session — detectors recognize uniform viewports.

```bash
# Randomize within realistic desktop ranges (width: 1280–1920, height: 768–1080)
PLAYWRIGHT_MCP_VIEWPORT_SIZE=1366x768 playwright-cli -s=<session> open <url> --persistent
# or
PLAYWRIGHT_MCP_VIEWPORT_SIZE=1920x1080 playwright-cli -s=<session> open <url> --persistent
```

#### 3c. Locale and timezone alignment

Set locale and timezone to match the target region:

```bash
playwright-cli -s=<session> run-code "
  Intl.DateTimeFormat = new Proxy(Intl.DateTimeFormat, {
    construct(target, args) {
      args[1] = {...(args[1] || {}), timeZone: 'America/New_York'};
      return new target(...args);
    }
  })
"
```

#### 3d. Canvas and WebGL noise (stealth plugin preferred)

`playwright-extra-plugin-stealth` automatically injects subtle noise into canvas `toDataURL()` and WebGL renderer strings, preventing cross-session fingerprint matching. In CLI-only environments:

```bash
playwright-cli -s=<session> run-code "
  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(type) {
    const dataURL = origToDataURL.call(this, type);
    return dataURL.replace(/.$/, String.fromCharCode(dataURL.charCodeAt(dataURL.length-1) ^ 1));
  };
"
```

> **Note**: This is a minimal noise approach. For highly fingerprint-aware sites, the stealth plugin is the more reliable solution.

---

### Anti-Detection Checklist

Before running automation against a bot-protected site:

- [ ] Stealth plugin applied (or webdriver flag manually suppressed)
- [ ] Randomized delays (500–2500ms) between all interactions
- [ ] `type` used instead of `fill` for text input
- [ ] `mousemove` used before `click` on critical elements
- [ ] User-Agent matches host operating system
- [ ] Viewport size varied from session default
- [ ] Locale/timezone set to match target region
