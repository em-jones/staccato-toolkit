---
name: link-checker
description: Find and fix broken links in documentation and code using lychee. Scan files with --format json to identify broken URLs, then systematically repair or update them.
compatibility: Any codebase with documentation or markdown files
metadata:
  maturity: stable
  author: documentation-team
  version: "1.0"
---

# Link Checker Skill

This skill provides systematic workflows for finding and fixing broken links in your codebase using the `lychee` link checker. Lychee is a fast, async link checker written in Rust that can scan entire directory trees and output structured JSON for automated processing.

## When to Use This Skill

- Automated link validation in CI/CD pipelines
- Periodic documentation health checks
- Before publishing documentation releases
- Post-refactoring verification (after moving or renaming files)
- Finding dead external references to maintain SEO and user experience
- Integration with documentation review workflows

## Installation

Ensure `lychee` is available in your environment:

```bash
# Via cargo (Rust)
cargo install lychee

# Via devbox (recommended)
echo "packages = [\"lychee\"]" >> devbox.json
devbox shell

# Via Homebrew (macOS)
brew install lychee
```

Verify installation:

```bash
lychee --version
```

## Workflow Overview

1. **Scan** — Run lychee with `--format json` to collect all link data
2. **Analyze** — Parse JSON output with `jq` to categorize broken links
3. **Filter** — Distinguish between dead external links and broken internal paths
4. **Fix** — Update broken links, redirect references, or add exceptions
5. **Verify** — Re-scan to confirm all fixes are correct

---

## Step 1: Scan for Broken Links

### Basic Scan

Scan a directory tree for broken links:

```bash
lychee <directory>/**/*.{md,mdx,html,rst} --format json > link-report.json
```

### Common file extensions to scan

| Extension                    | Type                  | Use case                                 |
| ---------------------------- | --------------------- | ---------------------------------------- |
| `.md`, `.mdx`                | Markdown              | Documentation, READMEs, change artifacts |
| `.html`                      | HTML                  | Static sites, generated documentation    |
| `.rst`                       | reStructuredText      | Sphinx documentation                     |
| `.go`                        | Go source             | Doc comments, URLs in strings (limited)  |
| `.ts`, `.tsx`, `.js`, `.jsx` | TypeScript/JavaScript | Doc comments, URLs in objects            |

### Scan with timeout and retries

For robust link checking (especially useful for external links):

```bash
lychee \
  <directory>/**/*.md \
  --timeout 30 \
  --retry-wait-time 1 \
  --max-retries 3 \
  --format json > link-report.json
```

### Exclude directories and patterns

Skip slow-to-scan or irrelevant directories:

```bash
lychee \
  <directory>/**/*.md \
  --exclude "node_modules|.git|.devbox" \
  --exclude-path "./vendor/*" \
  --format json > link-report.json
```

### Skip external links (internal-only scan)

When you only want to find broken internal paths:

```bash
lychee \
  <directory>/**/*.md \
  --offline \
  --format json > link-report.json
```

The `--offline` flag skips HTTP requests; lychee only validates file paths.

---

## Step 2: Analyze the JSON Output

Lychee outputs a JSON object with this structure:

```json
{
  "status": "success",
  "stats": {
    "total": 150,
    "successful": 140,
    "errors": 10,
    "warnings": 0,
    "timeouts": 0
  },
  "failures": [
    {
      "uri": "https://example.com/broken-page",
      "source": "docs/guide.md:42",
      "status": "Error fetching https://example.com/broken-page",
      "code": 404
    },
    {
      "uri": "./relative/path/file.md",
      "source": "docs/overview.md:15",
      "status": "FileNotFound",
      "code": null
    }
  ]
}
```

### Key fields:

- **`failures[]`** — Array of broken links
- **`uri`** — The link itself (URL or file path)
- **`source`** — Where the link appears (file:line)
- **`status`** — Error message (e.g., "404 Not Found", "FileNotFound")
- **`code`** — HTTP status code (null for file errors)

---

## Step 3: Parse and Filter with jq

### Extract all broken links

```bash
jq -r '.failures[] | "\(.source): \(.uri)"' link-report.json
```

Output:

```
docs/guide.md:42: https://example.com/broken-page
docs/overview.md:15: ./relative/path/file.md
```

### Count broken links by type

```bash
jq '.failures | group_by(.status) | map({status: .[0].status, count: length})' link-report.json
```

### Extract only external link failures (HTTP errors)

```bash
jq -r '.failures[] | select(.code != null) | "\(.uri) (\(.code))"' link-report.json
```

### Extract only internal link failures (file not found)

```bash
jq -r '.failures[] | select(.code == null) | "\(.source): \(.uri)"' link-report.json
```

### Create a fix-ready CSV

```bash
jq -r '.failures[] | [.source, .uri, .status] | @csv' link-report.json > broken-links.csv
```

---

## Step 4: Fix Broken Links

### Strategy 1: Fix broken internal paths

When a file has been moved or renamed, update all references:

```bash
# Before fixing, locate the correct file
find . -name "correct-filename.md" -type f

# Update the link in the source file
# Old: ./relative/path/file.md
# New: ./new/path/correct-filename.md
```

Use the `Edit` tool to update each reference:

```bash
# Example: fixing a link in docs/guide.md at line 42
# Change: [See the overview](./relative/path/file.md)
# To:     [See the overview](./docs/overview.md)
```

### Strategy 2: Fix broken external URLs

When external links return 404 or timeout:

1. **Verify the link is genuinely broken** — Use a browser to confirm
2. **Find the correct URL** — Search the site's current structure
3. **Update the reference** — Replace with the working URL
4. **Add a note** — Document why the URL changed (if relevant)

Example flow:

```bash
# Broken: https://old-api.example.com/v1/docs
# Fixed:  https://docs.example.com/api/v1
```

### Strategy 3: Add URL exceptions (for flaky external services)

Some external services are flaky or behind auth. Use `.lycheeignore`:

Create `.lycheeignore` in the repo root:

```
# Skip flaky external service
https://flaky-service.example.com/.*

# Skip authenticated endpoints
https://api.github.com/repos/private/.*

# Skip email URLs
mailto:.*
```

Then re-scan:

```bash
lychee <directory>/**/*.md --format json > link-report.json
```

### Strategy 4: Redirect broken links to archived versions

For dead external links with no modern equivalent:

```bash
# Old: https://old-docs.example.com/article
# New: https://web.archive.org/web/2023/old-docs.example.com/article

# Update in source file:
# [Old reference](https://web.archive.org/web/2023/old-docs.example.com/article) (archived)
```

---

## Step 5: Verify Fixes

After making corrections, re-scan to confirm:

```bash
lychee <directory>/**/*.md --format json > link-report-after.json
```

Compare the results:

```bash
# Before
jq '.stats.errors' link-report.json

# After
jq '.stats.errors' link-report-after.json

# Should be lower or zero
```

Check specific failures:

```bash
jq '.failures | length' link-report-after.json
```

---

## Integration Examples

### Shell script for automated link validation

```bash
#!/bin/bash
set -e

REPORT_FILE="link-report.json"
FAILED_LINKS_FILE="broken-links.csv"

echo "Scanning for broken links..."
lychee docs/**/*.md --format json > "$REPORT_FILE"

echo "Analyzing results..."
ERRORS=$(jq '.stats.errors' "$REPORT_FILE")

if [ "$ERRORS" -gt 0 ]; then
  echo "Found $ERRORS broken links:"
  jq -r '.failures[] | [.source, .uri, .status] | @csv' "$REPORT_FILE" > "$FAILED_LINKS_FILE"
  cat "$FAILED_LINKS_FILE"
  exit 1
else
  echo "✓ All links valid"
  exit 0
fi
```

### Makefile target for link checking

```makefile
.PHONY: check-links
check-links:
	@echo "Checking documentation links..."
	@lychee docs/**/*.md --format json | jq -r 'if .stats.errors > 0 then "FAILED: \(.stats.errors) broken links" else "OK" end'

.PHONY: list-broken-links
list-broken-links:
	@lychee docs/**/*.md --format json | jq -r '.failures[] | "\(.source): \(.uri) (\(.status))"'

.PHONY: fix-links
fix-links: check-links
	@echo "Review the list above and update links manually"
```

### GitHub Actions workflow example

```yaml
name: Link Checker

on: [pull_request, push]

jobs:
  check-links:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: lycheeverse/lychee-action@v1
        with:
          args: docs/**/*.md --format json
          fail: true
          format: json
```

---

## Structured Data Patterns

When processing lychee output, use `jq` for reliable JSON parsing:

### Get failure count by status code

```bash
jq '.failures | group_by(.code) | map({code: .[0].code, count: length})' link-report.json
```

### Extract unique broken URLs

```bash
jq -r '.failures[].uri' link-report.json | sort -u
```

### Find all failures in a specific file

```bash
jq -r '.failures[] | select(.source | startswith("docs/guide.md")) | .uri' link-report.json
```

### Generate a summary report

```bash
jq '{
  total: .stats.total,
  broken: .stats.errors,
  by_type: (.failures | group_by(.status) | map({type: .[0].status, count: length}))
}' link-report.json
```

---

## Guardrails

- **Always run a baseline scan first** — Understand your starting state before fixing
- **Fix internal links before external links** — Internal links are easier to validate
- **Test external links manually** — Not all 404s are permanent; some services may be temporarily down
- **Document fixed URLs** — If you change a URL, add a comment explaining why (good for future maintainers)
- **Use `.lycheeignore` sparingly** — Exclusions should be for genuinely flaky services, not to hide problems
- **Re-scan after changes** — Always verify that fixes are complete before merging
- **Version your reports** — Keep baseline and post-fix reports for audit trails

---

## Common Issues and Solutions

### Issue: Lychee times out on external links

**Solution:** Increase timeout and reduce concurrent requests:

```bash
lychee \
  docs/**/*.md \
  --timeout 60 \
  --max-concurrent-requests 1 \
  --format json > link-report.json
```

### Issue: False positives from dynamic URLs

**Solution:** Add exceptions in `.lycheeignore`:

```
# Dynamic paths that don't resolve without query params
https://example.com/api/.*
```

### Issue: Relative links break after file reorganization

**Solution:** Update relative paths to be absolute within the repo:

```bash
# Before: ../../../other/file.md
# After:  ../../docs/other/file.md
# Or use full path: /docs/other/file.md (if supported by your platform)
```

### Issue: Can't find lychee after `devbox install`

**Solution:** Ensure you're running in the devbox shell:

```bash
devbox shell
which lychee  # Should show path
lychee --version
```

---

## Advanced: Custom Lychee Configuration

Create a `lychee.toml` file for reusable settings:

```toml
# Timeouts and retries
timeout = 30
max_retries = 3
retry_wait_time = 1

# Exclude patterns
exclude_paths = [
  "node_modules",
  ".git",
  "vendor"
]

# Headers for authenticated requests
headers = [
  "Authorization: token ghp_xxx"
]

# Ignore patterns (similar to .lycheeignore)
ignore_paths = [
  "https://api.github.com/repos/private/.*"
]
```

Then run with:

```bash
lychee --config lychee.toml docs/**/*.md --format json
```
