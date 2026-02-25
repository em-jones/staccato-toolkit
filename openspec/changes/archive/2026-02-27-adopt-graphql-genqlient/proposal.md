---
td-board: adopt-graphql-genqlient
td-issue: td-b1fe95
---

# Proposal: Adopt GraphQL Code Generation (genqlient)

## Why

The platform currently lacks a standardized GraphQL client framework, causing inconsistent API consumption patterns across services and frontend applications. Adopting genqlient (a type-safe Go GraphQL code generator) establishes a canonical approach to GraphQL development, enabling compile-time safety, reduced runtime errors, and consistent client integration patterns across the ecosystem.

## What Changes

- Introduce genqlient as the standard GraphQL code generation framework
- Establish usage patterns for GraphQL query/mutation authoring and type generation
- Create linting and formatting standards for GraphQL documents
- Define testing strategies for generated GraphQL clients
- Establish TypeScript/JavaScript equivalents for frontend GraphQL clients

## Capabilities

### New Capabilities

- `graphql-code-generation-go`: Type-safe GraphQL client code generation for Go services using genqlient
- `graphql-schema-design`: GraphQL schema design standards, naming conventions, and documentation
- `graphql-query-patterns`: Query, mutation, and subscription authoring patterns with validation and testing

### Modified Capabilities

None

## Impact

- Affected services: Any Go service consuming GraphQL APIs
- Affected applications: Frontend applications consuming GraphQL APIs
- API changes: Enables new GraphQL endpoints and schema standardization
- New dependencies: genqlient (Go), graphql-core packages, graphql tooling (linting)
- Development workflow impact: Requires code generation step in build pipeline
