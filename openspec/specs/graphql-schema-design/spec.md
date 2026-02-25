---
td-board: adopt-graphql-genqlient-graphql-schema-design
td-issue: td-cfddb9
---

# Specification: GraphQL Schema Design

## Overview

This spec defines the standards for designing, documenting, and evolving GraphQL schemas. It establishes naming conventions, type hierarchy patterns, scalar definitions, and schema versioning strategies to ensure consistency and maintainability across all GraphQL endpoints.

## ADDED Requirements

### Requirement: Type Naming Convention

All GraphQL type names (object, interface, enum, scalar) SHALL follow PascalCase naming convention, with descriptive names that reflect domain entities or concepts.

#### Scenario: Object type naming
- **WHEN** defining a GraphQL object type for a user domain
- **THEN** the type is named `User` or `UserProfile`, not `user` or `USER_PROFILE`

#### Scenario: Enum value naming
- **WHEN** defining enum values for status
- **THEN** values use UPPER_SNAKE_CASE (e.g., `ACTIVE`, `INACTIVE`, `PENDING`)

### Requirement: Field Naming Convention

GraphQL field names SHALL use camelCase, be descriptive, and avoid abbreviations except for common domain-specific acronyms (e.g., ID, UUID).

#### Scenario: Object field naming
- **WHEN** defining fields on a type
- **THEN** fields use camelCase: `firstName`, `emailAddress`, `createdAt` (not `first_name`, `created_at`)

#### Scenario: List field naming
- **WHEN** defining fields that return lists
- **THEN** field names use plural form: `users`, `orders`, `comments`

### Requirement: Schema Documentation

All types, fields, and arguments in the schema SHALL be documented using GraphQL description strings (triple-quoted strings), explaining purpose, constraints, and usage context.

#### Scenario: Type documentation
- **WHEN** defining a GraphQL type
- **THEN** it includes a description string explaining what the type represents

#### Scenario: Field documentation
- **WHEN** defining a field with constraints
- **THEN** the description includes information about required formats, ranges, or special meanings

#### Scenario: Argument documentation
- **WHEN** defining query/mutation arguments
- **THEN** arguments include descriptions of expected values and constraints

### Requirement: Scalar Type Definition

Custom scalar types (beyond String, Int, Boolean, Float, ID) SHALL be explicitly defined in the schema with documentation of their format, constraints, and serialization behavior.

#### Scenario: DateTime scalar definition
- **WHEN** schema uses DateTime values
- **THEN** a DateTime scalar type is defined with documentation that it uses RFC 3339 format

#### Scenario: Custom scalar usage
- **WHEN** defining a field with a custom scalar type
- **THEN** the field type reference matches exactly the declared scalar type name

### Requirement: Interface and Union Usage

Polymorphic types in the schema SHALL use GraphQL interfaces when types share common fields, or unions when types are fundamentally different. The choice SHALL be documented.

#### Scenario: Interface for shared behavior
- **WHEN** defining types that share common fields (e.g., createdAt, updatedAt)
- **THEN** a common interface is used to define those fields once

#### Scenario: Union for alternative responses
- **WHEN** defining a response that could be one of several unrelated types (e.g., SuccessResult or ErrorResult)
- **THEN** a union type is used rather than creating fields for all possibilities

### Requirement: Null Safety and Argument Defaults

Nullable vs. non-nullable fields SHALL be declared explicitly, and all arguments SHALL have sensible defaults or be marked as non-nullable with documented rationale.

#### Scenario: Required vs optional fields
- **WHEN** defining type fields
- **THEN** required fields are declared with `!` suffix, optional fields without

#### Scenario: Query argument defaults
- **WHEN** defining query arguments that are optional
- **THEN** defaults are provided or the argument is marked non-nullable with explanation

### Requirement: Schema Evolution and Versioning

Breaking schema changes SHALL be deprecated with @deprecated directive and timeline for removal. Non-breaking additions (new fields, new types) do not require versioning.

#### Scenario: Field deprecation
- **WHEN** retiring a GraphQL field
- **THEN** it is marked with @deprecated directive including reason and migration path

#### Scenario: Field replacement
- **WHEN** replacing a field with improved version
- **THEN** old field is deprecated with reference to new field, and both exist in schema for transition period

#### Scenario: Schema changelog documentation
- **WHEN** making schema changes
- **THEN** changes are documented in schema changelog with date and impact assessment

## REMOVED Requirements

None

