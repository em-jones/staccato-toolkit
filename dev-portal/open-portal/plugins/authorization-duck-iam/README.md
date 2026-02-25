# @op-plugin/authorization-duck-iam

Authorization plugin that implements the `RoleAPI` and `AuthorizationService` interfaces from `@op-plugin/auth-core` using the `@gentleduck/iam` library.

Provides RBAC role management, ABAC policy management, and permission evaluation with multi-tenant scoping.

## Features

- **Role Management**: Create, update, delete, and assign roles with inheritance support
- **Policy Management**: Define ABAC policies with support for multiple combining algorithms
- **Permission Evaluation**: Check single or batch permissions with context-aware evaluation
- **Multi-tenant Support**: Scoped role assignments for multi-organization systems
- **In-memory & Persistent Adapters**: Use memory adapter for testing or custom database adapters

## Installation

```bash
npm install @op-plugin/authorization-duck-iam @gentleduck/iam
```

## Usage

```typescript
import {
  createAuthorizationService,
  createDuckIAMPolicyAdapter,
} from "@op-plugin/authorization-duck-iam";

const authService = createAuthorizationService({
  // Use default memory adapter or provide custom
  adapter: "memory", // or your custom adapter
});

// Check permissions
const canDelete = await authService.userCan({
  userId: "user-1",
  action: "delete",
  resource: "post",
  context: { ownerId: "user-2" },
});
```
