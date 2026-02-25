# Solid UI

Reusable SolidJS components for the OpenPort dev-portal plugins.

## Components

### Catalog

| Component    | Description                                          |
| ------------ | ---------------------------------------------------- |
| `KindBadge`  | Colored pill for entity kinds (Component, API, …)    |
| `EntityCard` | Card for a single `CatalogEntity` with click handler |
| `EntityList` | Filterable (by kind + search), paginated entity grid |
| `EntityTabs` | Tab strip for entity detail pages (plugin tab slots) |
| `DocReader`  | Renders pre-processed HTML documentation             |

### Auth

#### Authentication

| Component    | Description                                          |
| ------------ | ---------------------------------------------------- |
| `SignInForm` | Email/password sign-in form with error/pending state |
| `SignUpForm` | Registration form with password-confirm validation   |

#### IAM Administration

| Component      | Description                                               |
| -------------- | --------------------------------------------------------- |
| `UserTable`    | Sortable, filterable user list with role/status display   |
| `UserEditForm` | Modal form for editing user details and role assignment   |
| `RolePanel`    | Role management with permission display and inheritance   |
| `PolicyPanel`  | ABAC policy administration with rule viewer and test tool |

### Signals

| Component      | Description                                           |
| -------------- | ----------------------------------------------------- |
| `MetricsChart` | D3-powered SVG line chart for `MetricSeries[]`        |
| `LogsTable`    | Level-filtered, paginated log viewer for `LogEntry[]` |

## Types

Signal types (`MetricDataPoint`, `MetricSeries`, `LogEntry`, `LogLevel`, `TraceSpan`) are exported
from the package root and align with what `@op-plugin/signals-api` providers will produce.

## TODO

- `TraceTimeline` waterfall chart using `TraceSpan[]`

## Depends on

- ../../../design/tailwind-plugin - defines the tailwind plugin used by all the packages in this
  monorepo
- ../core-ui - defines core component input types
  - `CatalogEntity`
- ../signals-api - defines the shape of the telemetry types (fed into the visualizations)
  - Implemented by the `signal-provider-*` packages
