# 0005. Adopt Material-UI Components

**Date:** 2026-02-25

## Status
Accepted

## Context

Backstage plugins require a consistent UI component library for building developer portal interfaces. We need a React component library that integrates seamlessly with Backstage's design system and theming.

Backstage is built on Material-UI (MUI) and provides a set of pre-configured components and themes. Using a different component library would create visual inconsistency and require custom theming integration.

Alternatives considered:
- **Ant Design**: Rich component set but incompatible with Backstage theming
- **Chakra UI**: Modern but requires custom integration with Backstage
- **Custom components**: Full control but high maintenance burden

## Decision

Adopt Material-UI (MUI) v5+ as the component library for all Backstage plugins.

All UI components must use Backstage's exported MUI components (`@backstage/core-components`) where available. Custom components should follow Material Design principles and integrate with Backstage's theming system.

## Consequences

**Easier:**
- Visual consistency with Backstage core UI
- Access to Backstage's pre-configured components (Header, Page, Table, etc.)
- Automatic theme integration (light/dark mode, custom branding)
- Rich component library with accessibility built-in
- Strong TypeScript support and documentation

**Harder:**
- Locked into Material Design aesthetic
- MUI bundle size can be large if not tree-shaken properly
- Customizing beyond Material Design patterns requires effort

**Maintenance implications:**
- Plugins must track Backstage's MUI version compatibility
- Custom components must follow Backstage theming conventions
- Bundle size optimization required (tree-shaking, lazy loading)
- Accessibility compliance must be maintained for custom components

## Related Decisions

- ADR-0002: Adopt TypeScript + React for frontend
- ADR-0003: Adopt Node.js v24 for runtime
- Backstage plugin development patterns
- Tech Radar: Material-UI marked as "Adopt"
