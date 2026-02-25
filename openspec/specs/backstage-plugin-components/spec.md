# Specification: Backstage Plugin Component Architecture

## Overview

This specification defines usage rules for Backstage plugin-specific component architecture and patterns. It establishes conventions for plugin component structure, integration with the Backstage plugin API, and patterns for working with entity routers, routes, and Backstage core components.

## Requirements
### Requirement: Plugin component entry point structure

The system SHALL enforce a consistent entry point structure for Backstage plugins where the plugin exports a `Plugin` instance with configured routes and entity card extensions.

#### Scenario: Plugin instantiation

- **WHEN** a developer creates a Backstage plugin
- **THEN** the plugin MUST export a `Plugin` instance created via `createPlugin()` with a unique `id` matching the package name

#### Scenario: Plugin routes definition

- **WHEN** a developer adds routes to a plugin
- **THEN** routes MUST be registered using `createRoutableExtension()` with a unique `path` and a lazy-loaded component

### Requirement: Entity card and extension patterns

The system SHALL require Backstage plugins that display entity-specific content to use `EntityCard` extensions for proper integration with the catalog UI.

#### Scenario: Entity card extension creation

- **WHEN** a plugin displays information about a catalog entity
- **THEN** the plugin MUST use `createEntityCardExtension()` to register a card that integrates with the entity detail page

#### Scenario: Entity filtering and conditional display

- **WHEN** an entity card should only display for specific entity types
- **THEN** the card MUST define `filter` using `isKind()`, `isNamespace()`, or similar predicates to ensure the card only renders for applicable entities

### Requirement: Plugin API and context usage

The system SHALL establish patterns for accessing Backstage plugin APIs and contexts within components for authentication, routing, and configuration.

#### Scenario: useApi hook for API access

- **WHEN** a component needs to access Backstage APIs (e.g., CatalogApi, DiscoveryApi)
- **THEN** the component MUST use the `useApi()` hook with the appropriate API reference

#### Scenario: useRouteRef for internal navigation

- **WHEN** a component needs to navigate to internal plugin routes
- **THEN** the component MUST use `useRouteRef()` hook with the route reference to generate navigation links

### Requirement: Lazy loading and code splitting

The system SHALL require plugin routes and extensions to use lazy loading to optimize bundle size and initial load performance.

#### Scenario: Lazy-loaded route component

- **WHEN** a plugin route is defined
- **THEN** the route component MUST be loaded using `lazy(() => import('...'))`  to enable code splitting

#### Scenario: Lazy-loaded extension card

- **WHEN** a plugin extension is registered
- **THEN** the extension component MUST be lazy-loaded to defer loading until the extension is actually displayed

### Requirement: Plugin configuration and environment variables

The system SHALL establish patterns for accessing plugin-specific configuration and environment variables through the Backstage config API.

#### Scenario: Configuration access in plugin

- **WHEN** a plugin needs to access configuration
- **THEN** the plugin MUST use the `useApi(configApiRef)` to access configuration in a type-safe manner

#### Scenario: Environment-specific plugin behavior

- **WHEN** a plugin behavior differs by environment
- **THEN** the plugin MUST retrieve configuration through the config API rather than checking NODE_ENV directly
