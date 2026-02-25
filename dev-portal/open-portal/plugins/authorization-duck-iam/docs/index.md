# Authorization Duck IAM

Gentle Duck IAM-based authorization plugin for the developer portal.

## Overview

The Authorization Duck IAM plugin implements attribute-based access control (ABAC) with role-based
access control (RBAC) using the Gentle Duck IAM framework. It provides a comprehensive authorization
system for the Open Portal.

## Features

- Flexible RBAC + ABAC hybrid authorization
- Fine-grained permission policies
- Resource-level access control
- Attribute-based conditions
- Dynamic policy evaluation
- Built-in policy combining algorithms

## Quick Start

### Installation

```bash
npm install @op-plugin/authorization-duck-iam
```

### Basic Policy Definition

```typescript
import { definePolicy } from "@op-plugin/authorization-duck-iam";

const policy = definePolicy({
  name: "portal-access",
  rules: [
    {
      effect: "allow",
      principal: { role: "admin" },
      action: "*",
      resource: "*",
    },
    {
      effect: "allow",
      principal: { role: "user" },
      action: ["read", "list"],
      resource: "portal:*",
    },
  ],
});
```

## Integration

This plugin depends on:

- **@op-plugin/auth-core**: Provides the authentication context
- **@gentleduck/iam**: The underlying authorization engine

## Documentation

- [Policy Configuration Guide](./policies.md)
- [Architecture Decisions](./adrs/)
- [Gentle Duck IAM Docs](https://gentleduck.com)
