---
td-board: create-react-usage-rules-react-component-patterns
td-issue: td-d99c2a
---

# Specification: React Component Patterns

## Overview

This specification defines usage rules for React component organization, file structure, and component hierarchy patterns in Backstage frontend development. It establishes conventions for naming, file organization, prop typing, and component composition to ensure consistency across all Backstage plugins.

## ADDED Requirements

### Requirement: Component file structure

The system SHALL enforce a consistent file structure for React components where each component resides in its own directory with colocated files (index.tsx, styles, types, and tests).

#### Scenario: Component with colocated files

- **WHEN** a developer creates a new component
- **THEN** the component MUST be organized in a directory containing: `index.tsx` (component), `<ComponentName>.tsx` (component definition), `types.ts` (TypeScript interfaces/types), `<ComponentName>.test.tsx` (unit tests), and optional `styles.ts` or `<ComponentName>.css`

### Requirement: Component naming conventions

The system SHALL enforce PascalCase naming for component files and exported React components, with clear distinction between presentational and container components.

#### Scenario: Component file naming

- **WHEN** a developer creates a React component file
- **THEN** the file MUST be named with PascalCase matching the component export (e.g., `UserCard.tsx` for the `UserCard` component)

#### Scenario: Container vs presentational components

- **WHEN** a developer creates a component that manages state or logic
- **THEN** the component MUST be suffixed with `Container` (e.g., `UserCardContainer.tsx`) to distinguish it from presentational components

### Requirement: Props typing and interfaces

The system SHALL require explicit TypeScript interfaces for all component props with clear documentation of required vs optional props.

#### Scenario: Props interface definition

- **WHEN** a developer creates a component with props
- **THEN** the props MUST be defined as a TypeScript interface ending with `Props` (e.g., `UserCardProps`) with JSDoc comments for each prop

#### Scenario: Optional vs required props

- **WHEN** a developer defines props
- **THEN** the interface MUST clearly mark optional props with `?:` and MAY provide default values through destructuring or defaultProps

### Requirement: Component composition patterns

The system SHALL establish patterns for component composition including wrapper components, render props, and compound components for maintainability.

#### Scenario: Wrapper component pattern

- **WHEN** a developer needs to extend an existing component with additional functionality
- **THEN** the developer MUST create a wrapper component rather than modifying the original, preserving the original's interface

#### Scenario: Compound component pattern

- **WHEN** a developer creates a complex component with multiple related sub-components
- **THEN** the developer MAY use compound component pattern where sub-components are exported as properties (e.g., `Form.Field`, `Form.Submit`)

### Requirement: Consistent export patterns

The system SHALL enforce consistent export patterns for components with named exports as the primary pattern and default exports avoided for named components.

#### Scenario: Named component export

- **WHEN** a developer exports a component
- **THEN** the component MUST use named export (e.g., `export const UserCard: React.FC<UserCardProps> = ...`) from the component file

#### Scenario: Index file re-export

- **WHEN** a component directory has an index.tsx
- **THEN** the index file MUST re-export the component with a named export to enable `import { UserCard } from './components/UserCard'`
