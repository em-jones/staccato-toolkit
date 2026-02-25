---
td-board: adopt-grafana-dashboarding
td-issue: td-ef8ad1
status: accepted
date: 2026-02-25
decision-makers:
  - platform-observability-team
tech-radar:
  - name: Grafana
    quadrant: Infrastructure
    ring: Adopt
    description: Unified dashboarding platform for logs, metrics, and traces correlation
    moved: 1
  - name: Grafana Provisioning API
    quadrant: Frameworks/Libraries
    ring: Adopt
    description: Dashboard and datasource management via API and configuration files
    moved: 1
---

# Design: Adopt Grafana Dashboarding

## Context and Problem Statement

Grafana is already deployed for observability but lacks standardized patterns for dashboard creation, maintenance, and organization. Without formalized practices, dashboards become inconsistent, difficult to discover, and fail to provide unified visibility across logs, metrics, and traces. This design establishes dashboard-as-code patterns, unified correlation layouts, alerting integration, and catalog entity registration to ensure operational consistency and maintainability.

## Decision Criteria

This design achieves:

- **Standardized dashboard-as-code**: Dashboards stored in version control with change history
- **Unified multi-signal visibility**: Single dashboard correlating logs, metrics, and traces
- **Alert-to-dashboard navigation**: Operators can click from alerts to relevant dashboards for investigation
- **Catalog integration**: Dashboards discoverable and owned in Backstage software catalog
- **Environment promotion**: Dashboards provisioned consistently across dev/staging/prod

Explicitly excludes:

- Grafana user management and RBAC (existing OIDC integration used)
- Custom Grafana plugins or extensions
- Detailed runbook content (links only)
- Monitoring of Grafana itself (covered by observability-stack-deployment)

## Technical Decisions

### 1. Dashboard Storage and Versioning

**Decision**: Dashboards stored as JSON in `observability/dashboards/` with semantic versioning in git.

**Rationale**: GitOps pattern provides audit trail, review via PR, and rollback capability. JSON model is Grafana's native format, preventing export/import data loss. Semantic versioning in metadata (e.g., `"version": 2`) tracks evolution within JSON.

**Alternatives considered**:
- Grafana's built-in backup/snapshot feature: lacks version control and review process
- Terraform/Pulumi providers: adds abstraction layer and tool coupling; JSON is closer to source of truth

**Implementation**:
- Directory: `observability/dashboards/<service-name>/`
- Naming: `<dashboard-purpose>.json` (e.g., `error-logs.json`, `latency-metrics.json`)
- Version tracking: `"version"` field in dashboard JSON metadata
- Git tags: semantic tags (e.g., `dashboard-v1.2.3`) for releases

### 2. Datasource Provisioning

**Decision**: Datasources (Prometheus, Loki, Tempo) defined in `observability/provisioning/datasources/` as YAML with secrets injected at runtime.

**Rationale**: Datasource credentials must not be stored in version control. Using environment variables and secret store integration decouples secrets from code while keeping configuration queryable. YAML is more readable than JSON for configuration.

**Alternatives considered**:
- Hard-coded datasources in Grafana UI: no audit trail, difficult to sync across environments
- All-Terraform datasources: adds tool coupling; Grafana provisioning API is designed for this

**Implementation**:
- Directory: `observability/provisioning/datasources/`
- Format: YAML files per datasource (e.g., `prometheus.yaml`, `loki.yaml`, `tempo.yaml`)
- Secrets: injected via environment variables (e.g., `${LOKI_PASSWORD}`) at Grafana startup
- Sync: Grafana reads provisioning directory on startup and applies changes

### 3. Multi-Signal Correlation Layout

**Decision**: Standard dashboard layout with metrics top (RED), logs middle, traces bottom for operator drill-down flow.

**Rationale**: Mirrors investigation workflow: notice metric anomaly → find related logs → trace execution path. Consistent layout reduces cognitive load; operators know where to look.

**Alternatives considered**:
- Flexible layouts per team: inconsistent; harder to train operators
- Single-signal dashboards: requires jumping between dashboards for investigation

**Implementation**:
- Row 1: Key metrics (RED: rate, errors, duration) — graphs
- Row 2: Related log streams — table panels with filtering
- Row 3: Distributed traces or flame graphs — trace timeline panel
- Cross-links: metric spike clickable to drill logs in same time window

### 4. Panel Templating for Reuse

**Decision**: Dashboard variables for `$service`, `$environment`, `$time_range`, `$log_level` to enable parameterization.

**Rationale**: Reduces dashboard duplication. Operators can change service name to view data for different services without managing separate dashboard copies. Eases environment promotion (dev/staging/prod use same template).

**Alternatives considered**:
- Dashboard per service: N dashboards for N services; hard to maintain consistency
- API/CLI to clone dashboards: manual process; harder to track in code

**Implementation**:
- Grafana variables defined in dashboard JSON: `"templating": { "list": [ { "name": "$service", ... } ] }`
- Query interpolation: `metric{service="$service"}`
- Default values: sensible defaults (e.g., prod environment, last 6 hours)

### 5. Alert Rule Storage and Linking

**Decision**: Alert rules defined in `observability/alerts/<service>/` as YAML (Grafana AlertManager format) with dashboard links in annotations.

**Rationale**: Version-controlled alert rules enable review and rollback. Links from alert notifications to dashboards enable fast context switching for investigation. YAML readability for alert logic.

**Alternatives considered**:
- Alerts defined entirely in Grafana UI: no version control, difficult to sync across environments
- Prometheus alert rules: Grafana alerts are more integrated; easier to link dashboards

**Implementation**:
- Alert rule YAML: defines condition, evaluation (1m), for duration (5m), severity labels
- Annotations: include `{{ $externalURL }}/d/<dashboard-id>` to link dashboard
- Notification routing: AlertManager rules route by severity and service labels

### 6. Dashboard Catalog Registration

**Decision**: Each dashboard registered in Backstage as a `Dashboard` kind entity with metadata, owner team, and service references.

**Rationale**: Enables discovery, ownership tracking, and service-to-dashboard relationships. Backstage becomes single source of truth for observable components. Operators find dashboards alongside services.

**Alternatives considered**:
- Grafana's built-in dashboard search: limited metadata; no ownership tracking
- Wiki/manual documentation: falls out of sync; no automation

**Implementation**:
- Catalog entity: `kind: Dashboard`, fields: `name`, `title`, `owner`, `spec.grafanaUrl`, `relations`
- Relationships: dashboard references service(s) it observes; service lists dashboards
- Ownership: team/person explicitly assigned; linked to Slack channel or email

## Risks and Mitigations

- **Risk**: Dashboard JSON files diverge from Grafana if manual edits made in UI without export → **Mitigation**: Establish process: UI edits only for exploration, export to code before merge; use pre-commit hook to alert if uncommitted changes exist
- **Risk**: Datasource credentials leak into version control → **Mitigation**: Use environment variable injection; pre-commit hook blocks secrets patterns; regular audit of `.gitignore`
- **Risk**: Dashboard templates become too parameterized, reducing clarity → **Mitigation**: Limit variables to service/environment; use dashboard descriptions to document variable purpose
- **Risk**: Alert rules fire but operator can't find relevant dashboard → **Mitigation**: Alert annotations always include dashboard link; regular validation of link targets
- **Risk**: Catalog entities fall out of sync with Grafana → **Mitigation**: Sync job runs on schedule; API validates dashboard URLs and reports missing/broken links

## Migration Plan

### Phase 1: Provisioning Setup (Week 1)

1. Create `observability/provisioning/` directory with datasource configs
2. Mount provisioning path in Grafana Helm chart
3. Test datasource sync: verify Prometheus, Loki, Tempo auto-register

### Phase 2: Dashboard Export and Version Control (Week 2)

1. Export existing high-value dashboards (error logs, latency metrics) from Grafana UI
2. Store JSON in `observability/dashboards/` with metadata
3. Commit to git; tag first release (v1.0.0)
4. Set up sync job to import dashboards on schedule

### Phase 3: Standard Layout Templates (Week 3)

1. Create template dashboards using standard layout (metrics → logs → traces)
2. Define variable patterns for service, environment
3. Document in runbook: "Creating a new dashboard"

### Phase 4: Alerting Integration (Week 4)

1. Write alert rules in YAML; store in `observability/alerts/`
2. Configure AlertManager routing; test notification flow
3. Add dashboard links to alert annotations
4. Verify operators can click from Slack alerts to dashboards

### Phase 5: Catalog Registration (Week 5)

1. Create dashboard catalog entity YAML files in `.entities/dashboards/`
2. Register service-to-dashboard relationships
3. Configure Backstage plugin to display dashboards on service pages
4. Train teams on discovery

### Phase 6: Rollout and Handoff (Week 6)

1. Announce dashboard standards to teams
2. Support team runbooks on dashboard troubleshooting
3. Monitor: alert link clicks, dashboard discovery usage

## Confirmation

How to verify this design is met:

- **Test cases**:
  - Datasource provisioning auto-registers Prometheus, Loki, Tempo on Grafana startup
  - Dashboard JSON imported from file matches Grafana UI display
  - Dashboard variables parameterize queries; changing `$service` updates all panels
  - Alert rules fire; notification includes working dashboard link
  - Catalog entity sync finds all dashboards; broken links reported

- **Metrics**:
  - Number of dashboards in version control (target: all critical dashboards by end of week 5)
  - Alert-to-dashboard click-through rate (target: >80% of alert recipients click link)
  - Dashboard discovery usage (target: >50% of dashboard views via Backstage)

- **Acceptance criteria**:
  - At least 3 services have standard-layout dashboards (metrics/logs/traces)
  - All alert rules have dashboard links
  - All dashboards registered in Backstage catalog with owner team
  - Pre-commit hook blocks secrets in dashboard JSON

## Open Questions

- Should we enforce mandatory dashboard description/owner, or start optional and make mandatory later?
- Which dashboard visualization library (ECharts vs. Legacy Graphite)? Recommend ECharts for new dashboards.
- How to handle third-party dashboards (e.g., from Grafana marketplace)? Store in subdirectory `/vendor`?
- Should dashboard templates be Helm-style (using `.Values`) or pure Grafana variables? Recommend pure variables for portability.

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| Grafana | platform-observability-team | — (new) | pending — usage rule to be created |
| Grafana Provisioning | platform-observability-team | — (new) | pending — usage rule to be created |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| Grafana Dashboard-as-Code | Worker agents implementing observability features | `.opencode/skills/grafana-dashboarding/SKILL.md` | create | New workflow: agents must understand JSON model, provisioning, and linking to dashboards |

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
