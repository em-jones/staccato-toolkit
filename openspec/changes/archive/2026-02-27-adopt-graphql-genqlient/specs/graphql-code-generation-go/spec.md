---
td-board: adopt-graphql-genqlient-graphql-code-generation-go
td-issue: td-7c59dc
---

# Specification: GraphQL Code Generation (Go)

## Overview

This spec defines the standard for type-safe GraphQL client code generation in Go services using genqlient. It establishes how developers author GraphQL queries, generate corresponding Go types, and integrate generated clients into service code.

## ADDED Requirements

### Requirement: genqlient Configuration Standard

Services using GraphQL SHALL configure genqlient with a standardized `gqlgen.yaml` file at the service root, defining schema discovery, query path locations, and generated code output paths.

#### Scenario: Service with standard genqlient config
- **WHEN** a Go service integrates GraphQL
- **THEN** it contains `gqlgen.yaml` with schema_path, queries, and generated_package fields

#### Scenario: Code generation via build tool
- **WHEN** `make generate` or similar build target is invoked
- **THEN** genqlient generates type-safe Go code for all queries in the queries/ directory

### Requirement: GraphQL Query Authoring Pattern

Service developers SHALL author GraphQL queries in dedicated query files (`.graphql` extension) organized by entity or feature domain, with queries named using snake_case conventions.

#### Scenario: Query file organization
- **WHEN** a service defines queries for user operations
- **THEN** queries reside in `queries/user_queries.graphql` with names like `GetUserByID`, `ListUsers`, `CreateUser`

#### Scenario: Query file validation
- **WHEN** genqlient processes query files
- **THEN** it validates queries against the remote schema and fails build on schema violations

### Requirement: Generated Client Type Safety

The genqlient code generator SHALL produce type-safe Go client code where all query arguments and response types are strongly typed, eliminating runtime type assertions in client code.

#### Scenario: Generated query function signature
- **WHEN** a query is defined and genqlient processes it
- **THEN** a corresponding Go function exists with signature: `func (ctx context.Context, client *graphql.Client, args) (ResponseType, error)`

#### Scenario: Type mismatch detection at compile time
- **WHEN** a developer incorrectly accesses a response field with wrong type
- **THEN** the Go compiler fails the build, preventing runtime errors

### Requirement: Client Integration Pattern

Service code SHALL integrate genqlient-generated clients through a client initialization function that accepts GraphQL endpoint configuration, authentication headers, and timeout settings.

#### Scenario: Client initialization
- **WHEN** a service starts up
- **THEN** it initializes the GraphQL client with configured endpoint and auth headers

#### Scenario: Request context propagation
- **WHEN** a service makes GraphQL requests
- **THEN** request context includes tracing metadata and timeout values

### Requirement: Error Handling Strategy

GraphQL client code SHALL distinguish between three error categories: network errors, GraphQL field errors (partial success with error in response), and validation errors (malformed query).

#### Scenario: Network error handling
- **WHEN** the GraphQL server is unreachable
- **THEN** the client returns a network error distinct from GraphQL field errors

#### Scenario: Field error handling
- **WHEN** GraphQL response contains errors in the errors array alongside data
- **THEN** the client parses both data and errors, allowing partial-success handling

#### Scenario: Validation error handling
- **WHEN** query validation fails during code generation
- **THEN** the build fails with actionable error messages

### Requirement: Client Testing Pattern

Unit tests for code using genqlient clients SHALL mock the generated client interface rather than making real HTTP requests, enabling fast, deterministic test execution.

#### Scenario: Client mocking in tests
- **WHEN** unit testing service logic that calls GraphQL
- **THEN** tests use mock clients implementing the generated client interface

#### Scenario: Response fixture definition
- **WHEN** mocking GraphQL responses
- **THEN** test fixtures match the generated response types exactly

## REMOVED Requirements

None

