# 0007. Use GraphQL Code Generation

**Date:** 2026-02-25

## Status
Accepted

## Context

Backstage plugins consume GraphQL APIs from the Backstage backend and external services (GitHub, GitLab, etc.). We need type-safe GraphQL client code that stays in sync with schema definitions.

Manual GraphQL query construction is error-prone and lacks compile-time validation. Code generation from GraphQL schemas provides type safety and reduces boilerplate.

For Go services, **gqlgen** provides server-side code generation. For TypeScript/React, **genqlient** and **GraphQL Code Generator** provide client-side type generation.

Alternatives considered:
- **Manual queries with Apollo Client**: Flexible but no compile-time type safety
- **Relay**: Powerful but opinionated and complex for simple use cases

## Decision

Adopt GraphQL code generation for all GraphQL integrations:
- **genqlient** for Go GraphQL clients
- **gqlgen** for Go GraphQL servers (if needed)
- **GraphQL Code Generator** for TypeScript/React clients

All GraphQL operations (queries, mutations, subscriptions) must be defined in `.graphql` files. Code generation must run automatically during build pipelines.

## Consequences

**Easier:**
- Type-safe GraphQL operations with compile-time validation
- Automatic TypeScript/Go types from schema definitions
- IDE autocomplete and inline documentation for GraphQL fields
- Schema changes detected at build time, not runtime

**Harder:**
- Requires GraphQL schema introspection or schema files
- Build pipeline must include code generation step
- Schema evolution requires regenerating client code

**Maintenance implications:**
- GraphQL schemas must be versioned and accessible
- CI/CD must validate schema compatibility and generate code
- Breaking schema changes require coordination with consumers
- Generated code must be committed or cached in CI

## Related Decisions

- ADR-0002: Adopt TypeScript + React for frontend
- ADR-0001: Adopt Go 1.23 for backend services
- Backstage GraphQL integration patterns
- Tech Radar: GraphQL Code Generator marked as "Adopt"
