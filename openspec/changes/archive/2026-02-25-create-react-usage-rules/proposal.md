---
td-board: create-react-usage-rules
td-issue: td-885b83
---

# Proposal: Create React Usage Rules

## Why

React is the core UI framework for Backstage frontend development, yet lacks documented usage rules for component patterns, hooks usage, and Backstage-specific architectural conventions. This creates inconsistency in plugin development and makes onboarding new contributors difficult. Establishing comprehensive React usage rules will standardize component organization, hook patterns, and Backstage plugin component architecture across the platform.

## What Changes

- Create usage rules for React component organization and patterns
- Document hook patterns and composition strategies
- Define Backstage-specific component architecture conventions
- Establish guidelines for plugin component structure and reusable component libraries

## Capabilities

### New Capabilities

- `react-component-patterns`: Usage rules for React component organization, file structure, and component hierarchy patterns
- `react-hooks-patterns`: Usage rules for React hooks usage, custom hooks design, and composition strategies
- `backstage-plugin-components`: Usage rules for Backstage plugin-specific component architecture and patterns
- `backstage-reusable-components`: Usage rules for shared/reusable component libraries and component composition in Backstage

### Modified Capabilities

None

## Impact

- Affected services/modules: All Backstage frontend plugins and the @backstage/core-components library
- API changes: No API changes, documentation only
- Data model changes: No data model changes
- Dependencies: No new dependencies
