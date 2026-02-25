# Authentication Better Auth

Better Auth authentication strategy for the developer portal.

## Overview

The Authentication Better Auth plugin implements the Better Auth authentication framework within the
Open Port, providing a complete authentication solution with built-in support for multiple auth
methods.

## Features

- Multi-method authentication (email/password, OAuth, social login)
- Secure session management
- Email verification
- Password reset flows
- Account linking
- Full type safety with TypeScript

## Quick Start

### Installation

```bash
npm install @op-plugin/authentication-better-auth
```

### Configuration

```typescript
import { createBetterAuthProvider } from "@op-plugin/authentication-better-auth";

const authProvider = createBetterAuthProvider({
  database: {
    // Your database configuration
  },
  secret: process.env.AUTH_SECRET,
});
```

## Integration

This plugin depends on:

- **@op-plugin/auth-core**: Provides the base authentication framework
- **better-auth**: The underlying authentication library

## Documentation

- [Configuration Guide](./configuration.md)
- [Architecture Decisions](./adrs/)
- [Better Auth Docs](https://better-auth.com)
