---
td-board: create-react-usage-rules-react-hooks-patterns
td-issue: td-a195e2
---

# Specification: React Hooks Patterns

## Overview

This specification defines usage rules for React hooks, custom hooks design, and composition strategies in Backstage frontend development. It establishes conventions for hook naming, dependency management, and custom hook patterns to promote code reusability and maintainability.

## ADDED Requirements

### Requirement: Standard hooks usage

The system SHALL enforce proper usage of React's built-in hooks (useState, useEffect, useContext, useRef, etc.) with clear documentation of dependencies and side effects.

#### Scenario: useEffect with dependency array

- **WHEN** a developer uses useEffect
- **THEN** the developer MUST explicitly include a dependency array and ensure all external values used within the effect are included

#### Scenario: useState state management

- **WHEN** a developer needs to manage component state
- **THEN** the developer MUST use useState with clear state names (e.g., `const [isLoading, setIsLoading]` instead of `const [data, setData]`)

### Requirement: Custom hooks naming and organization

The system SHALL require custom hooks to be named with a `use` prefix and organized in a dedicated `hooks` directory with clear responsibility and documentation.

#### Scenario: Custom hook file location

- **WHEN** a developer creates a custom hook
- **THEN** the hook MUST be placed in a `hooks` directory and exported from an `index.ts` file for easy discovery and reuse

#### Scenario: Custom hook naming

- **WHEN** a developer creates a custom hook
- **THEN** the hook MUST be named with a `use` prefix (e.g., `useUserData`, `useFetchPlugin`) to signal it is a hook to other developers

### Requirement: Hook composition and reusability

The system SHALL establish patterns for composing multiple hooks and extracting common patterns into reusable custom hooks.

#### Scenario: Composing multiple hooks

- **WHEN** a component uses multiple related hooks
- **THEN** the developer MAY extract the composition into a single custom hook that manages the combined logic

#### Scenario: Custom hook with side effects

- **WHEN** a custom hook needs to manage side effects (data fetching, subscriptions, etc.)
- **THEN** the hook MUST use useEffect with proper cleanup functions and dependency arrays

### Requirement: Hook rules enforcement

The system SHALL establish patterns to enforce React's Rules of Hooks (hooks only in functional components at top level, consistent order).

#### Scenario: Hook call order

- **WHEN** a component uses multiple hooks
- **THEN** hooks MUST be called in the same order on every render to avoid breaking React's hook indexing mechanism

#### Scenario: Conditional hook calls prevention

- **WHEN** a developer writes a component
- **THEN** the developer MUST NOT call hooks conditionally (inside if statements) or in loops; hooks MUST be called unconditionally at the top level

### Requirement: Context and hook integration

The system SHALL define patterns for using React Context with custom hooks to provide shared state and functionality across component trees.

#### Scenario: Custom hook wrapping useContext

- **WHEN** a developer needs to access Context values
- **THEN** the developer SHOULD create a custom hook (e.g., `useUserContext`) that wraps useContext to provide type-safe access and cleaner component code

#### Scenario: Provider component pattern

- **WHEN** a custom hook relies on a Context provider
- **THEN** the hook MUST validate that the context provider exists in the component tree and provide a clear error message if missing
