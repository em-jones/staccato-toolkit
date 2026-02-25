# Configuration

## Environment Variables

```env
AUTH_SECRET=your-secret-key
DATABASE_URL=postgresql://user:password@localhost/dbname
OAUTH_GOOGLE_CLIENT_ID=your-google-client-id
OAUTH_GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Plugin Configuration

### Basic Setup

```typescript
import { createBetterAuthProvider } from "@op-plugin/authentication-better-auth";
import { betterAuth } from "better-auth";

const auth = betterAuth({
  database: {
    type: "postgresql",
    url: process.env.DATABASE_URL,
  },
  secret: process.env.AUTH_SECRET,
  socialProviders: {
    google: {
      clientId: process.env.OAUTH_GOOGLE_CLIENT_ID,
      clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
    },
  },
});
```

### Custom User Fields

You can extend the user schema with custom fields:

```typescript
const auth = betterAuth({
  // ... other config
  user: {
    additionalFields: {
      role: {
        type: "string",
        default: "user",
      },
    },
  },
});
```

### Database Setup

Better Auth automatically creates the necessary tables on first run. Ensure your database is properly configured and accessible.

### Security Best Practices

- Always use HTTPS in production
- Keep `AUTH_SECRET` secure and rotate regularly
- Use environment variables for sensitive configuration
- Enable email verification for user signups
- Implement rate limiting on authentication endpoints
