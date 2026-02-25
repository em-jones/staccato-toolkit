---
name: dev-portal-manager
description: Guides platform architects in managing the software catalog, structuring documentation for Backstage plugins, and maintaining developer portal integrations
metadata:
  workflow: design
---

# Overview

The `dev-portal-manager` skill provides comprehensive guidance for managing a Backstage-based developer portal. It covers:

- **Catalog entity authoring**: How to define and store Component, System, Domain, Group, and Resource entities
- **Automated entity derivation**: Scripts to generate Resource entities from `devbox.json` and `package.json`
- **Documentation structure**: Conventions for TechDocs, ADRs, and Tech Radar integration
- **ADR symlinking**: How to surface OpenSpec change designs as architectural decision records

## When to use this skill

Load this skill when you need to:

- Create or update catalog entities in `.entities/`
- Derive Resource entities from project metadata files
- Set up documentation structure for a new component
- Link a change design into a component's ADR directory
- Update the Tech Radar with technology adoption decisions

---

## Catalog Entity Authoring

All catalog entities are stored as YAML files under `.entities/` at the repository root.

### Naming convention

Files follow the pattern: `.entities/<kind-lowercase>-<name-kebab-case>.yaml`

Examples:
- `.entities/component-openspec-td.yaml`
- `.entities/system-developer-platform.yaml`
- `.entities/domain-engineering-productivity.yaml`
- `.entities/resource-jq.yaml`

### Entity kinds and templates

#### Component

A Component represents a software artifact (service, library, website, etc.).

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: openspec-td
  title: OpenSpec Task-Driven Development
  description: Task management and workflow orchestration for OpenSpec-driven development
  annotations:
    backstage.io/techdocs-ref: dir:.
    backstage.io/adr-location: docs/adrs
  tags:
    - openspec
    - task-management
    - workflow
  links:
    - url: https://github.com/org/openspec-td
      title: Repository
      icon: github
spec:
  type: library
  lifecycle: production
  owner: platform-team
  system: developer-platform
```

**Required fields:**
- `metadata.name`: Unique identifier (kebab-case)
- `metadata.description`: Brief description of the component
- `spec.type`: Component type (service, library, website, etc.)
- `spec.lifecycle`: Lifecycle stage (experimental, production, deprecated)
- `spec.owner`: Owning team or group (references a Group entity)

**Recommended annotations:**
- `backstage.io/techdocs-ref: dir:.` — Enable TechDocs (requires `mkdocs.yml`)
- `backstage.io/adr-location: docs/adrs` — Enable ADRs plugin

#### System

A System groups related components into a logical boundary.

```yaml
apiVersion: backstage.io/v1alpha1
kind: System
metadata:
  name: developer-platform
  title: Developer Platform
  description: Tools and automations for engineering productivity
  tags:
    - platform
    - developer-experience
spec:
  owner: platform-team
  domain: engineering-productivity
```

**Required fields:**
- `metadata.name`: Unique identifier
- `metadata.description`: System purpose
- `spec.owner`: Owning team

**Optional fields:**
- `spec.domain`: Parent domain reference

#### Domain

A Domain represents a high-level business or organizational area.

```yaml
apiVersion: backstage.io/v1alpha1
kind: Domain
metadata:
  name: engineering-productivity
  title: Engineering Productivity
  description: Initiatives and systems that improve developer velocity and experience
spec:
  owner: platform-leadership
```

**Required fields:**
- `metadata.name`: Unique identifier
- `metadata.description`: Domain scope
- `spec.owner`: Owning group

#### Group

A Group represents a team, department, or organizational unit.

```yaml
apiVersion: backstage.io/v1alpha1
kind: Group
metadata:
  name: platform-team
  title: Platform Engineering Team
  description: Team responsible for developer tooling and infrastructure
spec:
  type: team
  profile:
    displayName: Platform Engineering
    email: platform@example.com
  children: []
```

**Required fields:**
- `metadata.name`: Unique identifier
- `spec.type`: Group type (team, business-unit, organization, etc.)

#### Resource

A Resource represents an external dependency, tool, or infrastructure component.

```yaml
apiVersion: backstage.io/v1alpha1
kind: Resource
metadata:
  name: jq
  title: jq
  description: Command-line JSON processor
  tags:
    - cli
    - json
    - utility
spec:
  type: utility
  owner: platform-team
  system: developer-platform
```

**Required fields:**
- `metadata.name`: Unique identifier
- `spec.type`: Resource type (utility, node-library, database, api, etc.)
- `spec.owner`: Owning team

**Common resource types:**
- `utility`: CLI tools, system utilities (e.g., jq, yq, devbox)
- `node-library`: npm packages
- `database`: Database systems
- `api`: External APIs

### Workflow: Creating a new entity

1. Determine the appropriate entity kind
2. Create the YAML file following the naming convention
3. Fill in required fields and any relevant optional fields
4. Verify the entity references (owner, system, domain) point to existing entities
5. Store the file in `.entities/`

**Before referencing an entity in a design**, verify the entity file exists in `.entities/`.

---

## Deriving Entities from Project Metadata

Two scripts automate Resource entity creation from project metadata files:

### Script: `derive-from-devbox.sh`

**Purpose**: Generate Resource entities for tools declared in `devbox.json`

**Location**: `.opencode/skills/dev-portal-manager/scripts/derive-from-devbox.sh`

**Usage**:
```bash
./derive-from-devbox.sh [DEVBOX_JSON] [ENTITIES_DIR]
```

**Defaults**:
- `DEVBOX_JSON`: `./devbox.json`
- `ENTITIES_DIR`: `./.entities`

**Behavior**:
- Parses the `packages` array from `devbox.json`
- For each package, creates a `kind: Resource` entity with `spec.type: utility`
- Writes entities to `$ENTITIES_DIR/resource-<tool-name-kebab-case>.yaml`
- If `packages` is empty or absent, exits cleanly with an informational message

**Example**:
```bash
# From repo root
.opencode/skills/dev-portal-manager/scripts/derive-from-devbox.sh

# From component directory
.opencode/skills/dev-portal-manager/scripts/derive-from-devbox.sh ./devbox.json ../../.entities
```

### Script: `derive-from-package-json.sh`

**Purpose**: Generate Resource entities for npm packages declared in `package.json`

**Location**: `.opencode/skills/dev-portal-manager/scripts/derive-from-package-json.sh`

**Usage**:
```bash
./derive-from-package-json.sh [PACKAGE_JSON] [ENTITIES_DIR]
```

**Defaults**:
- `PACKAGE_JSON`: `./package.json`
- `ENTITIES_DIR`: `./.entities`

**Behavior**:
- Parses both `dependencies` and `devDependencies` from `package.json`
- For each package, creates a `kind: Resource` entity with `spec.type: node-library`
- Writes entities to `$ENTITIES_DIR/resource-<package-name-kebab-case>.yaml`
- If no dependencies are present, exits cleanly

**Example**:
```bash
# From repo root
.opencode/skills/dev-portal-manager/scripts/derive-from-package-json.sh

# From component directory
.opencode/skills/dev-portal-manager/scripts/derive-from-package-json.sh ./package.json ../../.entities
```

### When to run derivation scripts

- **During design phase**: When a change introduces new tools or dependencies
- **During entity curation**: To ensure all project dependencies are cataloged
- **Periodically**: To keep the catalog synchronized with project metadata

**Note**: These scripts are templates. Adapt them for specific project structures or organizational needs.

---

## Documentation Structure

### TechDocs

Backstage TechDocs renders Markdown documentation using MkDocs.

#### Required structure

For a component to support TechDocs:

1. **`mkdocs.yml` at component root**:
```yaml
site_name: 'Component Name'
site_description: 'Brief description'

nav:
  - Home: index.md
  - Architecture: architecture.md

plugins:
  - techdocs-core
```

2. **`docs/` directory with at least `index.md`**:
```markdown
# Component Name

Welcome to the component documentation.

## Overview

[Component description]

## Getting Started

[Quick start guide]
```

3. **Annotation in `catalog-info.yaml`**:
```yaml
metadata:
  annotations:
    backstage.io/techdocs-ref: dir:.
```

#### Workflow: Scaffolding TechDocs for a new component

1. Create `mkdocs.yml` at the component root
2. Create `docs/index.md` with basic content
3. Add `backstage.io/techdocs-ref: dir:.` annotation to `catalog-info.yaml`
4. Verify the component appears in Backstage with a "Docs" tab

**Before registering a component entity**, ensure the TechDocs annotation is present if documentation is intended.

---

### ADRs (Architectural Decision Records)

The Backstage ADRs plugin (`@backstage-community/plugin-adr`) displays architectural decisions stored as Markdown files.

#### Required structure

1. **`docs/adrs/` directory at component root**

2. **ADR files following naming convention**:
   - Format: `NNNN-<title-kebab-case>.md`
   - Example: `0001-use-openspec-workflow.md`
   - `NNNN`: Zero-padded sequence number (0001, 0002, etc.)

3. **Annotation in `catalog-info.yaml`**:
```yaml
metadata:
  annotations:
    backstage.io/adr-location: docs/adrs
```

#### ADR file format

```markdown
# <Sequence>. <Title>

Date: YYYY-MM-DD

## Status

[Proposed | Accepted | Deprecated | Superseded]

## Context

[What is the issue that we're seeing that is motivating this decision or change?]

## Decision

[What is the change that we're proposing and/or doing?]

## Consequences

[What becomes easier or more difficult to do because of this change?]
```

#### Workflow: Recording a new ADR

1. Determine the next sequence number in `docs/adrs/`
2. Create `docs/adrs/NNNN-<title>.md` with the ADR content
3. Ensure `backstage.io/adr-location: docs/adrs` annotation exists in `catalog-info.yaml`

---

### Tech Radar

The Backstage Tech Radar plugin visualizes technology adoption across the organization.

#### Source of truth: `tech-radar` frontmatter in design.md

**All Tech Radar entries are declared in the YAML frontmatter of `design.md` files.** The `docs/tech-radar.json` file is **generated** from these declarations — do not edit it manually.

**Frontmatter format**:
```yaml
---
tech-radar:
  - name: "chi"
    quadrant: "Frameworks/Libraries"
    ring: "Adopt"
    description: "Lightweight Go router with clean middleware composition"
    moved: 1
  - name: "gin"
    quadrant: "Frameworks/Libraries"
    ring: "Assess"
    description: "Popular alternative - rejected due to custom Context type"
    moved: 0
---
```

**Required fields per entry**:
- `name`: Technology name (case-sensitive for display, matched case-insensitively for deduplication)
- `quadrant`: One of: `Infrastructure`, `Languages`, `Frameworks/Libraries`, `Patterns/Processes`
- `ring`: One of: `Adopt`, `Trial`, `Assess`, `Hold`
- `description`: Brief explanation of the technology and adoption rationale

**Optional fields**:
- `moved`: Change since last radar (1 = moved in, -1 = moved out, 0 = no change; defaults to 0)

**When no technologies are adopted**: Omit the `tech-radar` key or set it to `[]`.

#### Workflow: Adding a Tech Radar entry

1. **Add the entry to the `tech-radar` frontmatter block in `design.md`**:
   - Open the change's `design.md` file
   - Add or update the `tech-radar` list in the frontmatter
   - Ensure all required fields are present

2. **Run the sync script to propagate the change**:
   ```bash
   bash .opencode/skills/dev-portal-manager/scripts/sync-tech-radar.sh
   ```

   The script will:
   - Scan all `design.md` files under `openspec/changes/` (including `archive/`)
   - Extract all `tech-radar` frontmatter blocks
   - Deduplicate entries by name (case-insensitive), keeping the most recent by `date` frontmatter field
   - Update `docs/tech-radar.json` with the merged entries
   - Report a summary: "N added, M updated, K unchanged"

3. **Commit both files**:
   ```bash
   git add openspec/changes/<change-name>/design.md docs/tech-radar.json
   git commit -m "Add <technology> to Tech Radar (ring: <ring>)"
   ```

**Automatic sync at archive time**: The sync script runs automatically when archiving a change (via `openspec-archive-change`). Manual syncing is only needed if you want to propagate changes before archiving.

**Note**: The Tech Radar is a platform-level concern. Entries represent organization-wide technology decisions, not component-specific choices. If two changes declare the same technology with different rings, the entry from the more recently dated change wins (a warning is emitted).

---

## ADR Symlink Convention for design.md

OpenSpec change designs can be surfaced in Backstage as ADRs by symlinking the `design.md` file into a component's `docs/adrs/` directory.

### When to create a symlink

- **After a change design is finalized** and ready to be treated as an architectural decision
- **When an owning catalog entity is identified** for the change

### Symlink path formula

From the component's `docs/adrs/` directory:

```
docs/adrs/<sequence>-<change-name>.md → ../../openspec/changes/<change-name>/design.md
```

**Assumptions**:
- Component root is at the repository root
- `docs/` is at the repository root
- `openspec/changes/` is at the repository root

**If the component is nested**, adjust the relative path accordingly.

### Workflow: Symlinking a change design

1. **Identify the owning component**:
   - Which component is most affected by the change?
   - If no component exists, create or identify a suitable one first

2. **Determine the next ADR sequence number**:
   ```bash
   ls docs/adrs/ | grep -E '^[0-9]{4}-' | sort | tail -1
   ```

3. **Create the symlink**:
   ```bash
   cd docs/adrs
   ln -s ../../openspec/changes/<change-name>/design.md <sequence>-<change-name>.md
   ```

4. **Verify the symlink**:
   ```bash
   ls -la docs/adrs/<sequence>-<change-name>.md
   cat docs/adrs/<sequence>-<change-name>.md  # Should display design.md content
   ```

5. **Ensure the ADR annotation is present** in the component's `catalog-info.yaml`:
   ```yaml
   metadata:
     annotations:
       backstage.io/adr-location: docs/adrs
   ```

### Example

For the `initialize-developer-portal` change owned by the `openspec-td` component:

```bash
cd docs/adrs
ln -s ../../openspec/changes/initialize-developer-portal/design.md 0001-initialize-developer-portal.md
```

Result: The change design appears as ADR 0001 in the Backstage ADRs plugin for the `openspec-td` component.

### If no owning entity is identified

**Do not create orphan symlinks.** Instead:

1. Determine if the change is platform-level or component-specific
2. If platform-level, create a `platform` or `developer-platform` component to own platform-wide decisions
3. If component-specific but no component exists, create the component entity first
4. Then create the symlink

---

## Quick Reference

### Entity file paths
```
.entities/component-<name>.yaml
.entities/system-<name>.yaml
.entities/domain-<name>.yaml
.entities/group-<name>.yaml
.entities/resource-<name>.yaml
```

### Documentation structure
```
<component-root>/
  catalog-info.yaml
  mkdocs.yml
  docs/
    index.md
    adrs/
      0001-<title>.md
      0002-<title>.md
```

### Platform-level files
```
docs/tech-radar.json
```

### Derivation scripts
```bash
.opencode/skills/dev-portal-manager/scripts/derive-from-devbox.sh [devbox.json] [.entities]
.opencode/skills/dev-portal-manager/scripts/derive-from-package-json.sh [package.json] [.entities]
```

### ADR symlink
```bash
cd docs/adrs
ln -s ../../openspec/changes/<change-name>/design.md <sequence>-<change-name>.md
```
