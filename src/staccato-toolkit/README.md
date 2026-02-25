# The Last Software Ops Tool

The goal of this project is to, effectively, create a better `perses` tool. It should allow users to
have a rich out-of-the-box experience for building dashboards and visualizing their data, while also
providing a highly extensible and modular framework that allows users to easily add new data
sources, visualization components

Developers should be able to extend the system by creating new golang plugins that implement the
core interfaces defined by the core plugins (e.g. `core-ui`, `dashboard-builder`, etc.) and then
registering those plugins with the system. This will allow developers to easily add new
functionality to the system without having to modify the core codebase, and will also allow for a
vibrant ecosystem of plugins to develop around the system.

This web app should depend on a modular and extensible web-app framework that meets the following
requirements:

- [ ] Plugin-based framework: inspired by things, like `backstage` and `perses`
- [ ] Comes with core plugins (and interfaces):

## `core` package(s)

### `core/config` package

- [ ] use for handling configuration across the app, and providing a unified configuration system
      for plugins to consume

Cross-cutting concerns used across the cli, the tui, and the web app:

### `core/providers` package

- [ ] `RBACProvider` - use for handling role-based access control logic across the app
- [ ] `AdminProvider` - use for handling admin state and logic across the app
- [ ] `SoftwareCatalogProvider` - A unified software catalog that can pull in metadata from various
      sources (GitHub repos, container registries, artifact repositories) and provide a single
      source of truth for software inventory. This feeds the delivery metrics package and provides
      critical context during incident response.

  > **NOTE**: This is likely a hub/integration point for navigating the system of tools. Expect that
  > this is accomplished by using the software catalog to generate the navigation structure of the
  > app, and then linking out to various views from there. The UI providers would provide both
  > `global` components and `contextual` components that are loaded on individual software catalog
  > entity pages (e.g. the DORA UI would have a tab on a catalog entity) and then also provide
  > global views that can be added to the router

- [ ] `DocGeneratorProvider` - A plugin that can generate documentation (e.g. markdown files) based
      on the data in the software catalog. This can be used to automatically generate README files
      for repos, etc. Initial implementation is likely to use `hugo` to render the body of the docs
      to avoid having to reinvent the wheel on templating, etc.
  - [ ] `RunbookExtension` - Operational runbooks tied to alerts and incidents. Being able to link
        an alert directly to a remediation runbook (and eventually automate it) is a natural
        extension of the incident management package.
  - [ ] `ChangelogExtension` - Deployment/change event tracking. Overlaying deploy markers on
        metrics dashboards is one of the most requested features in any observability tool. This
        bridges the delivery metrics and observability packages.
  - [ ] `DocsExtension` - Auto-generated documentation from software catalog data. Renders project
        and API docs using the `DocGeneratorProvider` pipeline and keeps them in sync with the
        catalog.
- [ ] `LoggingProvider` - use for handling logging across the app
- [ ] `FeatureFlagProvider` - use for handling feature flags across the app
- [ ] `AuthProvider` - use for handling authentication and authorization across the app
- [ ] `I18nProvider` - use for handling internationalization and localization across the app
- [ ] `ErrorProvider` - use for handling error state and logic across the app
- [ ] `ConfigProvider` - use for handling configuration across the app
- [ ] `CostProvider` - Cloud cost observability (FinOps). Nearly every ops team cares about cost
      alongside performance. Integrating cost data next to OTEL metrics on the same dashboard would
      be a strong differentiator.
- [ ] `VCSProvider` - Git activity visualization (commit frequency, PR throughput, deployment
      frequency). This directly feeds the DORA metrics package and provides the "change" signal that
      incident management correlates against.
  - [ ] `DoraExtension` - A plugin that can calculate DORA metrics based on VCS and deployment data,
        and provide insights and recommendations for improving software delivery performance.
- [ ] `OnCallProvider` - On-call schedule management and escalation policies. This is the missing
      link between alerting and incident management. Without it, users still need
      PagerDuty/OpsGenie.

- [ ] `WebhookProvider` - A generic inbound/outbound webhook system. Most ops tools need to
      integrate with Slack, Teams, email, and custom systems. A webhook provider with transform
      pipelines would be a universal integration layer.
- [ ] `CachingProvider` - Query result caching with TTL/invalidation. Dashboard-heavy tools hit
      backends hard; a caching layer between the query providers and the UI is essential for
      performance at scale.

- [ ] `IncidentManagementProvider` - use for handling incident management data sources and logic
      across the app
  - [ ] `SLAExtension` - use for handling SLI/SLO data sources and logic across the app
  - [ ] `ErrorsExtension` - use for handling error tracking data sources and logic across the app

- [ ] `DoraProvider` - use for managing dora metrics data sources and rendering dora metrics ui
      components
- [ ] `ComplianceProvider` - use for handling compliance data sources and logic across the app
  > **NOTE**: Likely, this is initially an OPA-backed provider
- [ ] `OtelLogProvider` - use for loading `otel-logs` data sources
  - depends on `query-editor` plugin for building query backends
- [ ] `OtelMetricsProvider` - use for loading `otel-metrics` data sources
  - depends on `query-editor` plugin for building query backends
- [ ] `OtelTracesProvider` - use for loading `otel-traces` data sources
  - depends on `query-editor` plugin for building query backends
- [ ] `PerformanceProvider` - use for handling performance monitoring data sources and logic across
      the app

## `core-ui` package

The `core-ui` package provides shared UI primitives and component interfaces used across all UI
implementations (web, tui, cli).

## `ui` package

The `ui` package provides common UI utilities and shared components that can be used by any of the
UI implementations.

## `control-plane-orch` package

The `control-plane-orch` package contains Kubernetes orchestration assets and controllers for
managing the platform runtime. This includes KubeVela addon definitions and environment controllers.

## `docs` package

The `docs` package contains project documentation, including flow definitions and initialization
guides.

## `server` package

The `server` package provides all of the `APIs` for actually interacting with the system, and its
integrations. The nature of our project means that this is primarily used to route requests to
appropriate plugins, and these plugins are often a forward proxy to third-party APIs:

### Example - Logging API

1. User makes a request to the logging API to retrieve logs for a specific service.
2. Request is routed to clickhouse to retrieve logs.
   - optionally, a filter is applied to the request

#### How was this accomplished?

1. The platform oss ecosystem created a `ClickhouseLogProvider` plugin that implements the
   `OtelLogProvider`.
   - The `LoggingProvider` depends on a `SearchProvider`
2. The internal platform team added and configured the `ClickhouseLogProvider` plugin and provided
   the necessary configuration:
3. Developer opts-in to this logging API in their application manifest
4. When the user makes a request to the logging API, the request is treated as a forward-proxy
   request
5. The forward-proxy is used to perform the following:
   - Retrieve and apply authentication
   - Apply pagination logic to ensure that we're not retrieving too much data at once while also
     reducing the amount of query-language knowledge required by users to interact with the API
   - Apply request-type rules: Is this `tail` request? Is this a `dashboard` that's refreshing on an
     interval?

## `ui/core` package

The `ui/core` package should provide a set of core interfaces to be implemented for the various UIs
(e.g. web, tui, cli)

### Customization

These are meant to be the tools for allowing end-users to customize the layout of their app

- [ ] `ThemeProvider` - use for providing theming and styling capabilities
- [ ] `LayoutProvider` - use for managing the user-defined layout of the app (e.g. for the dashboard
      builder, etc.)

### UI Components

- [ ] `AuthRegisterComponent` - use for rendering authentication and authorization ui components
      components
- [ ] `AuthLoginComponent` - use for rendering authentication and authorization ui components
      components
- [ ] `NotificationsComponent` - use for handling notifications across the app
  - Scenarios:
    - `Toast` notifications - use for showing transient notifications to users (e.g. success, error,
      etc.)
    - `InApp` notifications - use for showing notifications within the app (e.g. new dashboard
      shared with you, etc.)
    - `Native` notifications - use for showing native notifications to users (e.g. using the
      Notifications API, etc.)
- [ ] `AppShellComponent` - use for rendering the app shell (e.g. header, sidebar, etc.)
  > **NOTE**: This is probably the `help` command output on the CLI.
  - depends on:
    - `MenuComponent` - example: sidebar menu for _some_ views in `web`, but a pop-up menu in `tui`
      environments
    - `NavComponent`
    - `DesktopNavComponent`
    - `MobileNavComponent` - use for rendering mobile navigation components across the app
- [ ] `StateProvider` - use for providing state management
  - [ ] `Flux`/`MVI` pattern - use for managing application state in a predictable way
  - [ ] `.Subscribe`/`.Dispatch` API - use for subscribing to state changes and dispatching actions
        to update state
  - Provider type scenarios:
    - [ ] `@tanstack/db` binding for local-first data management scenarios
    - [ ] `@xstate` binding for complex state management scenarios (e.g. auth, etc.) that we want to
          be able to visualize during development
  - Default stores:
    - [ ] `location` store - use for managing location state (e.g. current page, etc.)
    - [ ] `query` store - use for managing query state (e.g. current query, etc.)
    - [ ] `event` store - use for handling events

### `dashboard-ui` package

The `dashboard` package should provide a set of interfaces and components for creating modular and
extensible dashboards. This should include things like:

- [ ] `DashboardBuilderProvider` - use for building dashboards and rendering dashboard components.
- [ ] `DashboardBuilderUIProvider` - use for rendering dashboard builder ui components.

### `tui-dashboard-ui` package

The `tui-dashboard-ui` package should provide tui-specific implementations of the `dashboard-ui`

### `web-dashboard-ui` package

The `web-dashboard-ui` package should provide web-specific implementations of the `dashboard-ui`

## `dashboard-plugins` package

The `dashboard-plugins` package should provide a set of plugins that can be used to add
functionality.

- [ ] `VizComponents`(s) - use for rendering visualization ui components (e.g. charts, tables,
      etc.) - has a set of default viz component providers (e.g. `chart-ui` etc.) that can be used
      out of the box or extended by users to create custom viz components
  - [ ] `BarChartUIComponent` - use for rendering bar chart ui components
  - [ ] `LineChartUIComponent` - use for rendering line chart ui components
  - [ ] `TableUIComponent` - use for rendering table ui components
  - [ ] `PieChartUIComponent` - use for rendering pie chart ui components

- [ ] `SearchUIComponent`
  - use for rendering query editor ui components (e.g. code editor, etc.)

- [ ] `ComplianceUIProvider` - use for rendering compliance ui components components:
  - Scenarios:
    - `SBOM` - use for handling software bill of materials (SBOM) data sources and rendering SBOM ui
      components
    - `Vulnerability` - use for handling vulnerability data sources and rendering vulnerability ui
      components
    - `License` - use for handling license data sources and rendering license ui components
    - `Auditing` - Rich UI for viewing and auditing supply chain metadata, and how it has changed
      over time

## Apps

### `web` package

The `web` package should implement the the `ui/core` interfaces for web-based user interfaces using
`go-app`

#### `web-design-system` package

The `web-design-system` package should provide a `storybook` experience that that can be used to
catalog the various UI components that are available across the app, and provide a playground for
testing and developing UI components in isolation.

### `tui` package

The `tui` package should implement the the `ui/core` interfaces for terminal-based user interfaces
using `bubbletea`

#### `tui-design-system` package

The `tui-design-system` package should provide a TUI that that can be used to catalog the various UI
components that are available across the app, and provide a playground for testing and developing UI
components in isolation.

### `cli` package

Used for providing a command-line interface for managing the app (e.g. starting the server, building
plugins, etc.)

Commands:

- [ ] `start` - use for starting the server
- [ ] `build` - use for building plugins
- [ ] `generate` - use for generating code (e.g. typescript types, component types, provider
      implementation boilerplate, etc.)

#### `cli-design-system` package

The `design-system` package should provide a CLI-based design system that that can be used to
catalog the various cli commands that are available, and provide a playground for testing and
developing UI components in isolation.

## Preferences

Ideally, between these various plugins, we're able to support the entirety of the software delivery
lifecycle, from development, to deployment, to monitoring and observability, to incident management,
etc. This way, users can use this system as a one-stop-shop for all of their software ops needs, and
we can provide a rich out-of-the-box experience that covers a wide range of use-cases, while also
providing a highly extensible and modular framework that allows users to easily add new
functionality as needed.

## Principles

### DOs

- [ ] Make use of well-established standards and technologies where possible:
  - OpenTelemetry for observability data sources
  - Backstage software catalog specs for software catalog data sources
  - `*BackendProvider`s should try to use existing backend data sources where possible (e.g. - otel
    data stored in clickhouse for telemetry) rather than us/our users having to remake the wheel
    - **EXCEPTIONS**: We're going to roll-our-own `error` tracking system using `clickhouse` as the
      primary backend, and then build a `ErrorBackendProvider` that integrates with this system.
      This is because, while there are existing error tracking systems out there (e.g. `sentry`,
      `logrocket`, etc.), they often come with a lot of overhead and complexity that may not be
      necessary for all users. By building our own error tracking system, we can provide a more
      lightweight and customizable solution that can be tailored to the specific needs of our users.
- [ ] Create domain-specific schemas for domains that don't have well-established standards (e.g.
      SLI/SLO, error budgets, etc.)

## Questions

<!-- TODO: Answer questions that you haven't provided answers to, yet.
    **FEEDBACK** from the human operator that you should repsond to
-->

### Question

Given the scope of this project being that of creating a platform for unifying software operations,
what other plugins would you expect to see in this ecosystem?

### Question

What other questions do you have about this sort of system?

### Answer

1. **Plugin isolation and versioning** - How will plugin compatibility be managed across versions?
   If `core-ui` ships a breaking change, how do third-party plugins gracefully degrade or fail? A
   plugin manifest with semver constraints would be worth defining early.

   **FEEDBACK**: Recommend a deprecation lifecycle.

   We should enable plugin authors to make use of feature flags to gate new functionality, and
   provide clear warnings in the console when a plugin is using deprecated APIs. This will help
   smooth the upgrade path as the core evolves.
   <!-- TODO: Your response -->

2. **WASM module size and loading strategy** - The "island architecture" with multiple WASM modules
   is interesting, but Go-compiled WASM binaries are notoriously large (often 5-15MB+). What's the
   strategy for keeping initial load times acceptable? Lazy loading, shared runtime extraction, or
   TinyGo?

   **FEEDBACK**: We should break this question down into two problems we're trying to solve:
   1. Size performance - how do we keep the size of our WASM modules down to ensure a performant
      load time? I _believe_ that we can make use of a component-based architecture where we create
      different wasm components for different features and we use the wasm component model to manage
      the dependencies between these components. This way, we can ensure that we're only loading the
      components that are necessary for a given view or feature, and we can also share common
      dependencies between components to avoid duplication.
   2. Time performance - some scenarios may not require as much memory, but depend on a third-party
   data source that takes a long time to retrieve data.
   <!-- TODO: Your response -->

   I **THINK** that both of these problems can be solved with a `Suspsense`-like mechanism that
   allows us to show loading states while we're waiting for data to load, and then seamlessly render
   the UI once the data is ready.
   - Are there other problems we should be considering here?
   - Can we use `HTTP/2` server-push for this sort of thing?

3. **Provider dependency resolution** - Many providers depend on others (e.g., `TracesUIProvider`
   depends on `LogUIProvider` and `QueryEditorProvider`). Is there a formal dependency graph /
   injection container, or is this left to convention?

   **FEEDBACK**: We'll try to make use of two solutions for this:
   1. Mediator pattern for integrations
   2. Wasm component-model - we can leverage the wasm component model to declare explicit
      dependencies between providers, and then have a build step that resolves these dependencies
      and generates the appropriate import statements. This way, we can ensure that all dependencies
      are correctly resolved at build time, and we can also detect circular dependencies.

    <!-- TODO: Your response -->

4. **Multi-tenancy** - The `RBACProvider` and `AuthProvider` are listed, but is multi-tenancy
   (multiple orgs/teams sharing one deployment) a first-class concern? This affects the
   `StoreProvider`, data isolation, and nearly every other provider.

   **FEEDBACK**: Yes. This is intended to be a first-class concern. To the extent that I expect all
   providers to be multi-tenant aware, and for the core to provide mechanisms for handling tenant
   isolation.
    <!-- TODO: Your response -->

5. **Testing story** - How are plugins tested in isolation vs. integration?

## Risk Registry

<!-- TODO: Add risks here any time you iterate your understanding and you don't see it already listed
    You will be provided **FEEDBACK** from the human operator that you should repsond to
-->

1. **Scope risk** - This spec covers observability, incident management, DORA metrics, software
   catalogs, SBOM/compliance, SLI/SLOs, error tracking, and a full design system. Each of these is a
   product unto itself. The risk of shipping a broad but shallow system (where no single vertical is
   deep enough to replace existing tools) is high. A phased approach focusing on one vertical (e.g.,
   observability dashboards) first would de-risk this.

   **FEEDBACK**: Yes, we will be building this in phases. We'll do this by:
   1. Defining the features
   2. Defining the integration points
   3. Building the integration points
   4. Parallelizing the development of the features
   <!-- TODO: Your response -->
