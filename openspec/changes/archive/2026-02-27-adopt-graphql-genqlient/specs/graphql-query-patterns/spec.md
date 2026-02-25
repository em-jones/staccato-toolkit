---
td-board: adopt-graphql-genqlient-graphql-query-patterns
td-issue: td-104e84
---

# Specification: GraphQL Query Patterns

## Overview

This spec defines standard patterns for authoring GraphQL queries, mutations, and subscriptions. It establishes conventions for query organization, argument handling, response structure selection, and testing to ensure consistent, maintainable GraphQL client code across services.

## ADDED Requirements

### Requirement: Query Naming and Organization

GraphQL queries and mutations SHALL be named using PascalCase (action-based for queries: Get*, List*, Create*, Update*, Delete*; for mutations: the same pattern) and organized into separate files by domain entity.

#### Scenario: Query file organization
- **WHEN** organizing GraphQL queries for user domain
- **THEN** queries are in `queries/user.graphql` with names like `GetUser`, `ListUsers`

#### Scenario: Mutation file organization
- **WHEN** organizing GraphQL mutations for order domain
- **THEN** mutations are in `queries/order.graphql` with names like `CreateOrder`, `UpdateOrderStatus`

### Requirement: Fragment Usage Pattern

Complex queries that retrieve the same set of fields across multiple types SHALL use GraphQL fragments to eliminate duplication and enable consistent field selection.

#### Scenario: Fragment definition
- **WHEN** multiple queries need the same user fields
- **THEN** a `UserFields` fragment is defined once and reused with `...UserFields` syntax

#### Scenario: Nested fragment usage
- **WHEN** a query needs nested object fields
- **THEN** nested fragments are used (e.g., `UserFields` includes `...AddressFields`)

### Requirement: Pagination Pattern

Queries that return lists SHALL support pagination using cursor-based pagination when possible (next page tokens) or offset-limit patterns, declared explicitly in query parameters.

#### Scenario: Cursor-based pagination
- **WHEN** querying a list of items
- **THEN** query accepts `first: Int`, `after: String` arguments and returns PageInfo with `hasNextPage` and `endCursor`

#### Scenario: Default pagination size
- **WHEN** pagination arguments are omitted
- **THEN** query returns default page size (e.g., 20 items), documented in schema

### Requirement: Variable Definition and Typing

All query parameters except those with static values SHALL be defined as variables with explicit types, using type validation at both GraphQL schema and code-generation levels.

#### Scenario: Query variable declaration
- **WHEN** a query accepts parameters
- **THEN** parameters are declared as query variables: `query GetUser($userId: ID!)` (not inline values)

#### Scenario: Variable type mismatch prevention
- **WHEN** passing incorrectly typed variable value
- **THEN** genqlient code generation fails, preventing runtime type errors

### Requirement: Error Field Selection

Queries and mutations SHALL explicitly select error information fields when API contract includes error responses (e.g., `errors` array), enabling structured error handling.

#### Scenario: Error field selection
- **WHEN** mutation might return validation errors
- **THEN** mutation query selects error fields: `errors { field message code }`

#### Scenario: Partial success handling
- **WHEN** mutation partially succeeds (some items succeed, some fail)
- **THEN** response includes both successful results and error details for failed items

### Requirement: Null Coalescing and Default Values

Queries SHALL account for nullable fields in client code, using null coalescing operators or defaults where appropriate, with null behavior documented in query comments.

#### Scenario: Optional field handling
- **WHEN** selecting a field that might be null
- **THEN** client code handles null case or uses provided default value

#### Scenario: Non-null guarantee documentation
- **WHEN** a field is required for business logic
- **THEN** the query explicitly selects it as non-nullable, documented in comments

### Requirement: Query Testing Pattern

Queries and mutations SHALL have corresponding test fixtures that exercise success, error, and edge-case scenarios, with fixtures matching generated response types.

#### Scenario: Success test fixture
- **WHEN** testing a query function
- **THEN** mock client fixture provides sample response matching query return type

#### Scenario: Error scenario testing
- **WHEN** testing mutation error handling
- **THEN** test fixture includes error response shape with validation errors

#### Scenario: Partial success testing
- **WHEN** testing mutations with partial success scenarios
- **THEN** test fixture includes both successful and failed items in response

### Requirement: Subscription Pattern (if applicable)

Services using GraphQL subscriptions SHALL define subscription queries that specify field subscriptions, connection handling, and unsubscribe behavior, with documented lifecycle management.

#### Scenario: Subscription definition
- **WHEN** service uses real-time updates
- **THEN** subscription query is defined with subscription parameters: `subscription OnUserUpdate($userId: ID!)`

#### Scenario: Subscription cleanup
- **WHEN** subscription is no longer needed
- **THEN** client unsubscribes and closes WebSocket connection

## REMOVED Requirements

None

