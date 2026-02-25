---
td-board: adr-tech-radar-sync-adr-frontmatter-schema
td-issue: td-8fab8c
---

# Spec: ADR Frontmatter Schema

## ADDED Requirements

### Requirement: design.md frontmatter includes a tech-radar block

The `design.md` template SHALL include a `tech-radar` frontmatter block as the canonical declaration of technology adoption decisions for that change.

Each entry in the block SHALL include:
- `name` (string, required) — technology name matching the desired entry in `docs/tech-radar.json`
- `quadrant` (string, required) — one of: `Infrastructure`, `Languages`, `Frameworks/Libraries`, `Patterns/Processes`
- `ring` (string, required) — one of: `Adopt`, `Trial`, `Assess`, `Hold`
- `description` (string, required) — brief rationale for the ring assignment
- `moved` (integer, optional, default 0) — `1` if moved in, `-1` if moved out, `0` if unchanged

The block SHALL support multiple entries (YAML list).

The `## Tech Radar` table section SHALL be removed from the template body; the frontmatter block is the sole location for radar entries.

#### Scenario: Architect authors a design with technology adoption

- **WHEN** an architect creates a `design.md` for a change that adopts one or more direct dependencies
- **THEN** the frontmatter contains a `tech-radar` list with one entry per technology
- **AND** each entry has all required fields (`name`, `quadrant`, `ring`, `description`)
- **AND** no `## Tech Radar` table section appears in the document body

#### Scenario: Change has no new technology adoption

- **WHEN** an architect creates a `design.md` for a change with no direct technology adoption
- **THEN** the `tech-radar` frontmatter key is omitted or set to an empty list
- **AND** no `## Tech Radar` table appears in the body

#### Scenario: Multiple technologies adopted in a single change

- **WHEN** a change adopts multiple direct dependencies (e.g., a framework and a library)
- **THEN** the `tech-radar` list contains one entry per technology
- **AND** each entry independently specifies quadrant, ring, and description

### Requirement: Existing ADRs are migrated to frontmatter schema

All existing `design.md` files that contain a `## Tech Radar` table body section SHALL have that table migrated into the `tech-radar` frontmatter block.

After migration:
- The `## Tech Radar` table body section SHALL be removed
- The frontmatter SHALL contain the equivalent entries in the new schema
- All other frontmatter fields and body sections SHALL be unchanged

#### Scenario: Existing ADR with Tech Radar table is migrated

- **WHEN** the migration task runs against an existing `design.md` containing a `## Tech Radar` table
- **THEN** the table rows are converted to `tech-radar` frontmatter entries
- **AND** the table section is removed from the body
- **AND** the file is otherwise unchanged

#### Scenario: Existing ADR without Tech Radar table is unaffected

- **WHEN** the migration task runs against an existing `design.md` with no `## Tech Radar` table
- **THEN** the file is not modified

### Requirement: Template guidance is updated

The `design.md` template SHALL include inline comments that explain:
- The purpose of the `tech-radar` frontmatter block
- Valid values for `quadrant` and `ring`
- That this block is the source of truth consumed by the sync script
- That the `## Tech Radar` body table has been superseded

#### Scenario: Agent reads the template for a new change

- **WHEN** an agent reads `openspec/schemas/v1/templates/design.md` to author a new design
- **THEN** the template frontmatter contains the `tech-radar` block with comments explaining each field
- **AND** there is no `## Tech Radar` table in the template body
