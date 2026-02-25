# Unit Tests: Skills

**ALWAYS**: Adhere to the [readme.md](./README.md) guidelines for writing and performing unit tests.

Tests for verifying that skills are loaded and executed correctly.

---

## Skill: link-checker

Tests to ensure the link-checker skill consistently performs link validation and repair in the
.opencode directory.

### Requirement: Link scanning with lychee

The link-checker skill SHALL scan the .opencode directory for broken links using the lychee tool
with JSON output format.

#### Scenario: Lychee scans .opencode directory successfully

- **WHEN** the link-checker skill is loaded
- **AND** the skill scans the .opencode directory with lychee
- **THEN** the scan completes without errors
- **AND** lychee outputs results in JSON format

#### Scenario: Broken links are identified

- **WHEN** the .opencode directory contains broken links (e.g., malformed URLs, dead links)
- **AND** the skill executes a lychee scan with `--format json`
- **THEN** the JSON output identifies each broken link with its location and error type

#### Scenario: No false positives for internal links

- **WHEN** the .opencode directory contains internal file references (e.g., `#anchors`, relative
  paths)
- **AND** the skill executes the link scan
- **THEN** internal links are either skipped or correctly validated against actual files

---

### Requirement: Systematic link repair

The link-checker skill SHALL repair broken links by updating, removing, or replacing them with
working alternatives.

#### Scenario: Broken external links are updated

- **WHEN** a broken link is identified in a markdown file
- **AND** the skill determines a valid replacement URL exists
- **AND** the skill updates the link in the source file
- **THEN** the file is modified with the new URL
- **AND** the link is marked as fixed in the repair log

#### Scenario: Irrelevant links are removed

- **WHEN** a link points to content that is no longer relevant
- **AND** the skill cannot determine a valid replacement
- **AND** the link is flagged as irrelevant
- **THEN** the link is safely removed from the file with a comment indicating the removal reason

#### Scenario: Alternative sources replace broken links

- **WHEN** a broken link has an equivalent working source available
- **AND** the skill identifies the alternative source
- **THEN** the original link is replaced with the working alternative
- **AND** a changelog entry documents the replacement

---

### Requirement: Verification of repairs

The link-checker skill SHALL verify that all links are working after repairs are applied.

#### Scenario: Re-scan confirms all links are fixed

- **WHEN** all broken links have been repaired
- **AND** the skill executes a follow-up lychee scan
- **THEN** the scan reports zero broken links in the .opencode directory
- **AND** the skill confirms success

#### Scenario: Repair process is idempotent

- **WHEN** the skill is run against the .opencode directory twice in succession
- **THEN** the second run reports no additional broken links
- **AND** the second run produces no file changes

#### Scenario: Link checker handles network timeouts gracefully

- **WHEN** a link scan encounters a network timeout for an external URL
- **AND** the URL is already marked as broken in a previous run
- **THEN** the tool uses the previous result and does not retry indefinitely
- **AND** the repair process continues without blocking
