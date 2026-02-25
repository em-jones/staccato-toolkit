# grpc-service-definitions Specification

## Purpose
TBD - created by archiving change adopt-grpc-protobuf. Update Purpose after archive.
## Requirements
### Requirement: Proto file organization and structure

The system SHALL organize Protocol Buffer definitions following a consistent directory structure and naming convention that promotes discoverability and maintainability.

Proto files SHALL be organized by service domain under `proto/` directories. Each service domain SHALL have its own subdirectory containing related message definitions and service declarations.

#### Scenario: Organizing service APIs

- **WHEN** defining a new gRPC service for user management
- **THEN** the `.proto` files are placed in `proto/user/` directory with files named `user_service.proto`, `user_messages.proto`, or similar domain-specific names

#### Scenario: Nested proto organization

- **WHEN** a service has multiple related capabilities (e.g., authentication and profile management)
- **THEN** related proto files are grouped in the same domain directory with clear naming indicating their purpose

### Requirement: Message structure conventions

The system SHALL enforce consistent message structure patterns that ensure backward compatibility and clear semantics.

All protobuf messages SHALL include field comments documenting purpose and constraints. Messages SHALL use explicit field numbering with reserved numbers documented for deprecated fields. Required fields SHALL be marked with field-level documentation.

#### Scenario: Defining a user message

- **WHEN** creating a User message for the user service
- **THEN** all fields include comments explaining their purpose, and field numbers are explicitly assigned with gaps reserved for future additions

#### Scenario: Handling deprecated fields

- **WHEN** a field becomes deprecated
- **THEN** the field is marked with a comment, field number is added to reserved list, and migration documentation is provided

### Requirement: Service boundary patterns

The system SHALL define clear service boundaries that decouple concerns and prevent circular dependencies between services.

gRPC services SHALL be defined with single responsibility principle in mind. Each service SHALL expose related operations on a specific domain. Service-to-service communication SHALL use well-defined message contracts without direct coupling to internal data structures.

#### Scenario: Defining service method boundaries

- **WHEN** creating a GetUser and CreateUser method
- **THEN** both methods are in the same UserService, use appropriate request/response message types, and do not expose internal database schemas

#### Scenario: Cross-service communication

- **WHEN** the order service needs user information from the user service
- **THEN** it calls the public user service API and uses the public UserProfile message, not direct database queries or internal structures

### Requirement: Guidance for gRPC vs. alternative RPC patterns

The system SHALL document decision criteria for choosing gRPC over alternative RPC approaches.

gRPC SHALL be used for internal service-to-service communication in high-performance scenarios. HTTP/REST APIs SHALL be preferred for public-facing APIs or when client simplicity is a priority. WebSocket or streaming protocols SHALL be used when bidirectional communication or real-time updates are required.

#### Scenario: Choosing RPC pattern for internal service

- **WHEN** architecting communication between two internal services requiring high throughput
- **THEN** gRPC is selected for its performance and streaming capabilities

#### Scenario: Choosing RPC pattern for public API

- **WHEN** designing a public API for third-party integrations
- **THEN** HTTP/REST is selected for broader client compatibility and simpler debugging

### Requirement: Proto file versioning strategy

The system SHALL establish a versioning strategy for proto files that supports API evolution while maintaining backward compatibility.

All service packages SHALL include a version in the protobuf package declaration (e.g., `package user.v1`). Proto files introducing breaking changes SHALL use new package versions. Clients SHALL explicitly depend on specific package versions.

#### Scenario: Adding optional field to existing message

- **WHEN** adding an optional field to an existing User message
- **THEN** the field is added with a new field number, existing code continues working, and migration is optional

#### Scenario: Making breaking change to service API

- **WHEN** removing a method or changing message structure incompatibly
- **THEN** a new service version (v2) is created alongside v1, existing clients continue using v1, and migration is coordinated

