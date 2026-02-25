---
td-board: adopt-graphql-genqlient
td-issue: td-b1fe95
status: accepted
date: 2026-02-25
decision-makers:
  - platform-architecture
  - backend-lead
  - frontend-lead
consulted:
  - service-owner
  - security-team
informed:
  - all-developers

tech-radar:
  - name: genqlient
    quadrant: Frameworks/Libraries
    ring: Adopt
    description: Type-safe GraphQL code generator for Go; chosen for compile-time safety and consistency across services
    moved: 1
  - name: GraphQL
    quadrant: Frameworks/Libraries
    ring: Adopt
    description: Query language and runtime for API consumption; standardized for consistent client integration patterns
    moved: 1
  - name: graphql-core
    quadrant: Frameworks/Libraries
    ring: Trial
    description: Core GraphQL schema and validation library; adopted for Go backend GraphQL implementation
    moved: 1
---

# Design: Adopt GraphQL Code Generation (genqlient)

## Context and Problem Statement

The platform currently lacks a standardized approach to GraphQL client development, leading to:
- Inconsistent patterns across services (some use hand-written clients, some use other generators)
- Runtime type errors in GraphQL response handling
- Duplicated error handling and client initialization logic
- Friction when onboarding new services to GraphQL consumption
- No canonical standard for GraphQL schema design or query authoring

This design establishes genqlient (a type-safe Go GraphQL code generator) as the canonical framework for Go services, and defines complementary standards for schema design, query authoring, and client integration patterns.

## Decision Criteria

This design achieves:

- **Type Safety**: Compile-time verification of GraphQL queries against schemas; zero runtime type assertions (weight: 30%)
- **Developer Velocity**: Minimal setup, automatic type generation, consistent patterns reduce learning curve (weight: 25%)
- **Maintainability**: Centralized schema, single source of truth for types, easy schema evolution (weight: 20%)
- **Tooling Integration**: CI/CD integration for code generation, linting, and schema validation (weight: 15%)
- **Cross-platform Support**: Frontend (JavaScript/TypeScript) and backend (Go) clients from same schema (weight: 10%)

Explicitly excludes:

- Adopting GraphQL servers (backend GraphQL resolver implementation is out of scope; we define how clients consume existing APIs)
- Migrating existing REST APIs to GraphQL (REST APIs coexist; this change only standardizes GraphQL client consumption)
- Real-time subscriptions in phase 1 (defined in spec but deferred for implementation)
- Federation or multi-schema patterns (single-schema-per-domain model assumed)

## Considered Options

### Option 1: genqlient (selected)

**Pros:**
- Type-safe: Go struct generation from GraphQL schema
- Compile-time query validation
- Automatic error handling and response parsing
- Lightweight, no runtime overhead
- Excellent developer experience with IDE integration

**Cons:**
- Requires code generation step in build pipeline
- Limited to query/mutation/subscription support (no resolver generation)

### Option 2: graphql-go client (rejected)

**Pros:**
- Lightweight, minimal dependencies
- Works with any Go HTTP client

**Cons:**
- Manual type unmarshaling (runtime type assertions)
- No automatic validation or error handling
- Higher error rates in production

### Option 3: gqlgen with client generation (rejected)

**Pros:**
- Comprehensive schema and code generation

**Cons:**
- Heavyweight for client-only use cases
- Primarily designed for server-side resolver generation
- Overkill for consuming external GraphQL APIs

## Decision Outcome

**Adopt genqlient as the standard GraphQL client framework for Go services.**

**Rationale:**
Genqlient provides the best balance of type safety, developer experience, and performance for client-side GraphQL consumption. It generates Go types from GraphQL queries, eliminating runtime type assertions and enabling compile-time validation. This prevents entire classes of bugs and enables confident refactoring of GraphQL schemas with immediate feedback from the type system.

**Key design decisions:**

1. **Code Generation in Build Pipeline**: Genqlient runs as part of the build process (make generate, pre-build hooks), generating code only for committed `.graphql` query files. Generated code is committed to version control, enabling reproducible builds and review.

2. **Single Schema Per Service**: Each GraphQL API exposes a single schema; clients fetch the schema once during setup or from a known schema registry. Services consuming multiple GraphQL APIs use separate genqlient configs per upstream API.

3. **Query File Colocation**: Query files live alongside Go code (`queries/` directory or domain-specific folders), enabling easy navigation and review of client code and queries together.

4. **Frontend Clients via GraphQL Code Generator**: Frontend (JavaScript/TypeScript) uses Apollo Client code generator (industry standard), consuming the same schema as Go clients. Schema validation and documentation apply consistently.

5. **Error Handling Strategy**: Responses are parsed into Go structs with explicit error handling for three categories:
   - Network errors (context deadline, connection refused)
   - GraphQL field errors (partial success with error array)
   - Validation errors (detected during code generation)

6. **Schema Evolution**: GraphQL supports additive changes safely. Breaking changes are deprecated with timelines for removal, allowing graceful migration periods.

## Risks / Trade-offs

- **Risk: Code Generation Complexity** → **Mitigation**: Standardized config file, generation templates, and linting ensure consistency; tooling errors surface at build time, not runtime
- **Risk: Schema Coupling** → **Mitigation**: Use fragments and interfaces to decouple clients from schema structure; deprecation patterns allow schema evolution without breaking clients
- **Trade-off: Build-time Overhead** → **Benefit**: Type safety outweighs the minimal code generation cost; incremental generation on file change mitigates impact
- **Risk: Developer Learning Curve** → **Mitigation**: Usage rules, examples, and integration tests provide clear patterns; genqlient's familiar Go struct model is intuitive for Go developers

## Migration Plan

### Phase 1: Foundation (this change)
1. Establish genqlient as canonical framework (design, rules, examples)
2. Create linting and formatting standards for GraphQL documents
3. Document schema design patterns and query authoring conventions
4. Create integration test examples

### Phase 2: Initial Adoption (post-archive)
1. Onboard first service (API gateway or primary consumer) using genqlient
2. Create shared query libraries for common operations
3. Establish code review patterns for GraphQL changes

### Phase 3: Ecosystem Integration
1. Integrate code generation into CI/CD (parallel changes: `add-graphql-testing`, `add-graphql-linting`)
2. Create TypeScript equivalent patterns for frontend consumption
3. Document schema-driven development workflows

### Phase 4: Consolidation
1. Migrate additional services to genqlient clients
2. Establish GraphQL federation patterns (later phase)

## Confirmation

How to verify this design is met:

- **Type Safety**: Generated Go code compiles without type assertions; query validation occurs at code generation time, not runtime
- **Error Handling**: Services distinguish between network errors, partial success (field errors), and validation errors; test suites exercise all three paths
- **Tooling Integration**: Code generation runs in CI; linting validates query names, naming conventions, and schema compliance
- **Documentation**: Schema includes descriptions for all types and fields; queries include comments explaining purpose and pagination behavior
- **Developer Workflow**: New services can scaffold genqlient client in <30 minutes following the provided template

## Open Questions

- Frontend JavaScript client generation approach: Apollo Client Codegen vs. alternatives? (Provisional answer: Apollo Client Codegen for consistency with GraphQL ecosystem)
- Schema registry strategy: Inline schema files, external registry (Apollo Studio), or both? (Provisional answer: Start with inline, defer external registry to federation phase)
- TypeScript client library structure: monorepo or separate packages? (Provisional answer: monorepo for shared types, separate packages for domain-specific clients)

## Technology Adoption & Usage Rules

| Domain | Owner | Rule file | Status |
|--------|-------|-----------|--------|
| genqlient (Go code generation) | backend-platform | `.opencode/rules/patterns/frameworks/graphql-genqlient.md` | pending |
| GraphQL schema design | platform-architecture | `.opencode/rules/patterns/frameworks/graphql-schema.md` | pending |
| GraphQL query authoring | backend-platform | `.opencode/rules/patterns/frameworks/graphql-queries.md` | pending |
| GraphQL error handling | backend-platform | `.opencode/rules/patterns/delivery/graphql-errors.md` | pending |
| TypeScript GraphQL clients | frontend-platform | `.opencode/rules/patterns/frameworks/graphql-typescript.md` | pending |

## Agent Skills

| Technology / Process | Affected agents | Skill file | Action | Rationale |
|----------------------|-----------------|------------|--------|-----------|
| genqlient code generation | worker agents implementing GraphQL clients | `.opencode/skills/graphql-codegen/SKILL.md` | create | New skill needed: how to scaffold genqlient configs, write queries, integrate generated code into services |
| GraphQL schema design | platform architects, service owners | `.opencode/skills/graphql-schema-design/SKILL.md` | create | New skill needed: conventions for naming, deprecation, documentation, and schema evolution patterns |
| GraphQL query authoring | worker agents implementing GraphQL clients | `.opencode/skills/graphql-query-authoring/SKILL.md` | create | New skill needed: patterns for query organization, fragments, pagination, error field selection, and testing |

## Catalog Entities

| Kind | Name | Action | Owner | File | Status | Rationale |
|------|------|--------|-------|------|--------|-----------|
| — | — | n/a | — | — | n/a | GraphQL adoption is a cross-cutting framework change; specific catalog entities (components, systems) are created by services adopting GraphQL, not by this change itself |

## TecDocs & ADRs

Since no specific catalog components are created by this change (adoption pattern affects downstream services), TecDocs and ADRs are managed per adopting service. However:

- **ADR at change level**: This design.md serves as the platform-level decision document for GraphQL adoption
- **Component-level ADRs**: Each service adopting genqlient will create a component-level ADR at `src/<service>/docs/adrs/0001-graphql-client-pattern.md` (template provided in usage rules)

| Component | mkdocs.yml path | docs/adrs/ path | New docs pages | TecDocs status | ADR status |
|-----------|-----------------|-----------------|----------------|----------------|------------|
| n/a (adoption pattern) | n/a | — | n/a | n/a | n/a |

## Prerequisite Changes

| Change | Rationale | Status |
|--------|-----------|--------|
| n/a | No external dependencies; genqlient and graphql-core are mature upstream projects | n/a |
