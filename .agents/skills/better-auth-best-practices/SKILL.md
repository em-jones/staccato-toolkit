---
name: better-auth-best-practices
description: >
  Best practices and patterns for using Better Auth authentication library.
  Use when implementing authentication features, configuring Better Auth initialization,
  managing users and organizations, setting up OAuth providers, handling sessions,
  or integrating Better Auth with TypeScript applications. ALWAYS use when writing code
  that imports from "better-auth" or "@op-plugin/authentication-better-auth", when
  designing authentication flows, configuring database schemas, setting up plugins,
  or handling session management. Also use for OAuth integration, email verification
  patterns, password reset flows, organization management, and role-based access.
---

## Overview

**Better Auth** is a modern, type-safe authentication library for TypeScript applications.
It provides built-in support for multiple authentication strategies, session management,
user organization hierarchies, and extensible plugin systems.

**Package:** `better-auth`
**Docs:** https://better-auth.com/
**Repo:** https://github.com/better-auth/better-auth
**License:** MIT

### Key Features

- Multi-method authentication (email/password, OAuth, social login)
- Type-safe authentication and session handling
- Built-in database schema management
- Organization/workspace support
- Email verification and password reset flows
- Social provider integrations (Google, GitHub, Discord, etc.)
- JWT and session-based authentication
- Account linking and federated login
- Extensible plugin architecture
- Framework agnostic (works with Express, Next.js, Hono, etc.)

---

## Architecture Overview

```
Client Request
    |
    v
Better Auth Middleware
    |
    v
Authentication Strategy (email/password, OAuth, etc.)
    |
    v
Database Operations (User, Session, Account)
    |
    v
Session/Token Generation
    |
    v
Response to Client
```

Better Auth abstracts database operations and handles common authentication patterns,
allowing you to focus on application logic rather than security concerns.

---

## Installation and Setup

### 1. Install Dependencies

```bash
npm install better-auth
npm install drizzle-orm pg  # for PostgreSQL
```

Or use the Open Portal integration:

```bash
npm install @op-plugin/authentication-better-auth @op-plugin/auth-core
```

### 2. Environment Configuration

Create `.env.local`:

```env
# Database
AUTH_DATABASE_URL=postgresql://user:password@localhost:5432/auth_db

# Session secret (generate with: openssl rand -base64 32)
AUTH_SECRET=your-very-secret-key-here

# Application URLs
AUTH_BASE_URL=http://localhost:3000
AUTH_CALLBACK_URL=http://localhost:3000/api/auth/callback

# OAuth Providers (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### 3. Database Setup

Better Auth automatically creates required tables. Ensure your database is:

```sql
-- PostgreSQL database created
CREATE DATABASE auth_db;
```

Better Auth will create these core tables on first initialization:

- `user` - User accounts
- `session` - Active sessions
- `account` - Connected OAuth/social accounts
- `verification` - Email verification tokens
- `password_reset` - Password reset tokens
- `organization` - Organization records (with plugins)
- `organization_member` - Organization membership

---

## Core Initialization Patterns

### Basic Setup

```typescript
import { betterAuth } from "better-auth";

const auth = betterAuth({
  database: {
    type: "postgres",
    url: process.env.AUTH_DATABASE_URL,
  },
  secret: process.env.AUTH_SECRET,
  baseURL: process.env.AUTH_BASE_URL,
});
```

### With Organization Plugin

```typescript
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";

const auth = betterAuth({
  database: {
    type: "postgres",
    url: process.env.AUTH_DATABASE_URL,
  },
  secret: process.env.AUTH_SECRET,
  baseURL: process.env.AUTH_BASE_URL,
  plugins: [
    organization({
      // Optional: customize organization plugin behavior
      sendInvitationEmail: true,
      allowUserToCreateOrganization: true,
    }),
  ],
});
```

### With OAuth Providers

```typescript
const auth = betterAuth({
  database: { type: "postgres", url: process.env.AUTH_DATABASE_URL },
  secret: process.env.AUTH_SECRET,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
  },
});
```

### Open Portal Integration

```typescript
import { initializeBetterAuth } from "@op-plugin/authentication-better-auth";

const { auth } = initializeBetterAuth({
  databaseUrl: process.env.AUTH_DATABASE_URL,
  secret: process.env.AUTH_SECRET,
  baseUrl: process.env.AUTH_BASE_URL,
});
```

---

## User Management

### Creating Users

```typescript
// Via signup endpoint (typical flow)
const response = await auth.api.signUpEmail({
  email: "user@example.com",
  password: "secure-password",
  name: "John Doe",
});

// Direct database access (admin)
const user = await auth.db.user.create({
  email: "admin@example.com",
  name: "Admin User",
  emailVerified: true, // Skip email verification for admins
});
```

### Retrieving User Information

```typescript
// By user ID
const user = await auth.db.user.findUnique({
  where: { id: "user-id" },
});

// By email
const user = await auth.db.user.findUnique({
  where: { email: "user@example.com" },
});

// With related data
const user = await auth.db.user.findUnique({
  where: { id: "user-id" },
  include: {
    sessions: true,
    accounts: true, // OAuth connections
  },
});
```

### Updating User Details

```typescript
const updatedUser = await auth.db.user.update({
  where: { id: "user-id" },
  data: {
    name: "New Name",
    email: "newemail@example.com", // Triggers verification email
    image: "https://example.com/avatar.jpg",
  },
});
```

### Deleting Users

```typescript
// Delete user and cascade delete sessions, accounts, etc.
await auth.db.user.delete({
  where: { id: "user-id" },
});
```

### User Schema Extension

Add custom fields to users:

```typescript
const auth = betterAuth({
  // ... other config
  user: {
    additionalFields: {
      role: {
        type: "string",
        default: "user",
        required: false,
      },
      department: {
        type: "string",
        required: false,
      },
      timezone: {
        type: "string",
        default: "UTC",
      },
    },
  },
});
```

---

## Session Management

### Session Lifecycle

```
1. User authenticates (email/password or OAuth)
2. Better Auth creates session + token
3. Client stores token (cookie, localStorage, etc.)
4. Client includes token in subsequent requests
5. Server validates token and resolves user
6. Session expires or user logs out
7. Token is invalidated/deleted
```

### Getting Current Session

```typescript
// From Express request
const session = await auth.api.getSession({ request: req });
if (!session) {
  return res.status(401).json({ error: "Not authenticated" });
}
console.log(session.user.id, session.user.email);
```

### Session Configuration

```typescript
const auth = betterAuth({
  // ... other config
  session: {
    cookiePrefix: "auth_", // Default cookie prefix
    expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
    updateAge: 24 * 60 * 60, // Refresh token every 24 hours
    absoluteTimeout: 30 * 24 * 60 * 60, // Force re-login after 30 days
  },
});
```

### Session Validation

```typescript
// On middleware/before handler
const session = await auth.api.getSession({ request: req });
if (!session) {
  return res.status(401).json({ error: "Unauthorized" });
}

// Session is now available for use
const userId = session.user.id;
const userEmail = session.user.email;
```

### Invalidating Sessions

```typescript
// Logout user (delete all sessions)
await auth.api.signOut({ request: req });

// Or delete specific session
await auth.db.session.delete({
  where: { id: "session-id" },
});

// Revoke all sessions for a user
await auth.db.session.deleteMany({
  where: { userId: "user-id" },
});
```

---

## Organization Management

### Creating Organizations

```typescript
const organization = await auth.db.organization.create({
  data: {
    name: "Acme Corp",
    slug: "acme-corp", // URL-friendly identifier
  },
});
```

### Adding Members

```typescript
// Add user to organization with role
await auth.db.organizationMember.create({
  data: {
    userId: "user-id",
    organizationId: "org-id",
    role: "member", // 'owner', 'admin', 'member'
  },
});
```

### Organization Invitations

```typescript
// Create invitation (assumes invitation table exists)
await auth.db.invitation.create({
  data: {
    email: "newuser@example.com",
    organizationId: "org-id",
    role: "member",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  },
});

// Verify invitation and add user
const invitation = await auth.db.invitation.findUnique({
  where: { token: "invitation-token" },
});
if (invitation && invitation.expiresAt > new Date()) {
  // Create user or link existing user
  await auth.db.organizationMember.create({
    data: {
      userId: "user-id",
      organizationId: invitation.organizationId,
      role: invitation.role,
    },
  });
}
```

### Querying Organization Data

```typescript
// Get organization with members
const org = await auth.db.organization.findUnique({
  where: { id: "org-id" },
  include: {
    members: {
      include: { user: true },
    },
  },
});

// Get user's organizations
const userOrgs = await auth.db.organizationMember.findMany({
  where: { userId: "user-id" },
  include: { organization: true },
});

// Get organization members
const members = await auth.db.organizationMember.findMany({
  where: { organizationId: "org-id" },
  include: { user: true },
});
```

---

## Email Verification

### Email Verification Flow

```
1. User signs up
2. Better Auth sends verification email
3. Email contains verification link with token
4. User clicks link
5. Token is validated and email marked as verified
6. User can now use full features
```

### Triggering Email Verification

```typescript
// Automatically sent on signup
const response = await auth.api.signUpEmail({
  email: "user@example.com",
  password: "password",
  name: "User",
  // Verification email automatically sent
});

// Manual verification email
await auth.sendVerificationEmail({
  email: "user@example.com",
  url: "http://localhost:3000/verify-email", // Callback URL
});
```

### Verifying Emails

```typescript
// Handle verification callback
const token = req.query.token as string;
const email = req.query.email as string;

const verified = await auth.verifyEmail({
  email,
  token,
});

if (!verified) {
  return res.status(400).json({ error: "Invalid or expired token" });
}

return res.json({ success: true });
```

### Email Verification Configuration

```typescript
const auth = betterAuth({
  // ... other config
  emailVerification: {
    sendVerificationEmail: true,
    sendOnSignUp: true,
    autoConfirmEmail: false, // Require manual confirmation
  },
  // Custom email template
  async sendEmail(email, options) {
    // Use your email service (SendGrid, AWS SES, Resend, etc.)
    await sendEmail({
      to: email,
      subject: options.subject,
      html: options.html,
    });
  },
});
```

---

## Password Reset

### Password Reset Flow

```
1. User requests password reset
2. Better Auth generates reset token and sends email
3. User clicks email link with token
4. User submits new password
5. Token validated and password updated
6. User can login with new password
```

### Initiating Password Reset

```typescript
// Request password reset
const reset = await auth.api.forgetPassword({
  email: "user@example.com",
  redirectURL: "http://localhost:3000/reset-password",
});

// Email with reset link sent automatically
```

### Handling Reset Callback

```typescript
// User clicks reset link and arrives at /reset-password?token=...
const token = req.query.token as string;
const newPassword = req.body.password as string;

const resetResult = await auth.api.resetPassword({
  token,
  password: newPassword,
});

if (!resetResult) {
  return res.status(400).json({ error: "Invalid or expired token" });
}

return res.json({ success: true, message: "Password reset successful" });
```

---

## OAuth and Social Login

### Supported Providers

- Google
- GitHub
- Discord
- Microsoft (Entra/Azure AD)
- Apple
- LinkedIn
- Spotify
- Twitch
- Twitter/X
- Custom OIDC providers

### OAuth Configuration

```typescript
const auth = betterAuth({
  database: { type: "postgres", url: process.env.AUTH_DATABASE_URL },
  secret: process.env.AUTH_SECRET,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      // Optional: request additional scopes
      scopes: ["user:email", "read:user"],
    },
  },
});
```

### OAuth Login Flow

```typescript
// Client-side: redirect to OAuth provider
window.location.href = "/api/auth/signin/google";

// Or use Better Auth client SDK
import { createAuthClient } from "better-auth/client";

const { signIn } = createAuthClient();
await signIn.social({
  provider: "google",
  callbackURL: "/dashboard",
});
```

### Handling OAuth Callback

Better Auth handles OAuth callbacks automatically:

```
GET /api/auth/callback/google?code=...&state=...
  -> Better Auth validates code
  -> Creates or updates user
  -> Sets session
  -> Redirects to callbackURL
```

### Account Linking

Link multiple OAuth accounts to one user:

```typescript
// User clicks "Connect Google"
await signIn.social({
  provider: "google",
  callbackURL: "/settings/connected-accounts",
  linkAccount: true, // Link to existing account
});
```

---

## Middleware Integration

### Express

```typescript
import express from "express";
import { betterAuth } from "better-auth";

const auth = betterAuth({
  /* ... */
});
const app = express();

// Mount auth endpoints
app.use("/api/auth/*", auth.handler);

// Session middleware
app.use(async (req, res, next) => {
  req.session = await auth.api.getSession({ request: req });
  next();
});

// Protected route
app.get("/api/user", (req, res) => {
  if (!req.session) return res.status(401).json({ error: "Unauthorized" });
  res.json({ user: req.session.user });
});
```

### Next.js (App Router)

```typescript
// app/api/auth/[...auth]/route.ts
import { betterAuth } from "better-auth";
import { toNextJsHandler } from "better-auth/next-js";

const auth = betterAuth({
  /* ... */
});

export const { GET, POST } = toNextJsHandler(auth);
```

```typescript
// app/api/user/route.ts
import { betterAuth } from "better-auth";

const auth = betterAuth({
  /* ... */
});

export async function GET(request: Request) {
  const session = await auth.api.getSession({ request });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ user: session.user });
}
```

### Hono

```typescript
import { Hono } from "hono";
import { betterAuth } from "better-auth";

const auth = betterAuth({
  /* ... */
});
const app = new Hono();

// Mount auth endpoints
app.all("/api/auth/*", async (c) => {
  return auth.handler(c.req.raw);
});

// Middleware for session
app.use(async (c, next) => {
  const session = await auth.api.getSession({ request: c.req.raw });
  c.set("session", session);
  await next();
});
```

---

## Type Safety

### Typing Session

```typescript
// session.ts
import { betterAuth } from "better-auth";

const auth = betterAuth({
  /* ... */
});

// Infer session type
export type Session = typeof auth.$Inferred.Session;
export type User = typeof auth.$Inferred.User;

// Use in route handlers
import { Session, User } from "./session";

app.get("/profile", (req: Request & { session: Session }) => {
  const user: User = req.session.user;
  return res.json(user);
});
```

### Type-Safe Client

```typescript
import { createAuthClient } from "better-auth/client";

const client = createAuthClient({
  baseURL: "http://localhost:3000",
});

// Type-safe sign in
const { data: session, error } = await client.signIn.email(
  {
    email: "user@example.com",
    password: "password",
  },
  {
    onRequest: () => console.log("Signing in..."),
    onSuccess: (context) => {
      // context.data is typed as Session
    },
    onError: (context) => {
      // context.error is typed
    },
  },
);
```

---

## Advanced Patterns

### Custom Email Sending

```typescript
import { sendEmail } from "@resend/emails";

const auth = betterAuth({
  // ... other config
  async sendEmail(email, options) {
    await sendEmail({
      from: "noreply@example.com",
      to: email,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  },
});
```

### Custom User Creation Hook

```typescript
const auth = betterAuth({
  // ... other config
  hooks: {
    user: {
      created: async (user) => {
        // Send welcome email, create user profile, etc.
        console.log("New user created:", user.id);
        await sendWelcomeEmail(user.email);
      },
    },
  },
});
```

### Rate Limiting Authentication

```typescript
import { rateLimit } from "./middleware";

app.post("/api/auth/signin/email", rateLimit(5, "15m"), async (req, res) => {
  // Limit to 5 sign-in attempts per 15 minutes
  return auth.handler(req, res);
});
```

### Audit Logging

```typescript
const auth = betterAuth({
  // ... other config
  hooks: {
    user: {
      created: async (user) => {
        await audit.log("USER_CREATED", { userId: user.id, email: user.email });
      },
    },
    account: {
      linked: async (account) => {
        await audit.log("ACCOUNT_LINKED", { userId: account.userId, provider: account.provider });
      },
    },
  },
});
```

### MFA (Multi-Factor Authentication)

```typescript
import { twoFactor } from "better-auth/plugins";

const auth = betterAuth({
  database: { type: "postgres", url: process.env.AUTH_DATABASE_URL },
  secret: process.env.AUTH_SECRET,
  plugins: [
    twoFactor({
      issuer: "My App",
    }),
  ],
});
```

---

## Common Patterns

### Sign-Up Flow

```typescript
// Client-side
const { signUp } = useAuth();

await signUp.email(
  {
    email: "user@example.com",
    password: "secure-password",
    name: "John Doe",
  },
  {
    onSuccess: () => {
      // Check email for verification link
      navigate("/check-email");
    },
  },
);
```

### Sign-In Flow

```typescript
const { signIn } = useAuth();

await signIn.email(
  {
    email: "user@example.com",
    password: "password",
  },
  {
    onSuccess: () => {
      navigate("/dashboard");
    },
  },
);
```

### Protected API Route

```typescript
async function protectedRoute(req: Request) {
  const session = await auth.api.getSession({ request: req });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use session.user for authorization
  return Response.json({ data: `User: ${session.user.id}` });
}
```

### Admin Check

```typescript
// Assume you store role in user custom field
async function adminRoute(req: Request) {
  const session = await auth.api.getSession({ request: req });

  if (!session?.user?.role || session.user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return Response.json({ data: "Admin data" });
}
```

### Organization-Scoped Operations

```typescript
async function getUserOrganizations(userId: string) {
  const memberships = await auth.db.organizationMember.findMany({
    where: { userId },
    include: { organization: true },
  });

  return memberships.map((m) => m.organization);
}

async function getOrganizationUsers(orgId: string) {
  const members = await auth.db.organizationMember.findMany({
    where: { organizationId: orgId },
    include: { user: true },
  });

  return members.map((m) => m.user);
}
```

---

## Open Portal Integration

### Using the Auth Core Plugin

```typescript
import {
  initializeBetterAuth,
  createBetterAuthAdapter,
} from "@op-plugin/authentication-better-auth";
import { createRoleManagement } from "@op-plugin/auth-core";

// Initialize Better Auth
const { auth } = initializeBetterAuth({
  databaseUrl: process.env.AUTH_DATABASE_URL,
  secret: process.env.AUTH_SECRET,
});

// Create Auth API adapter
const authAPI = createBetterAuthAdapter({ auth });

// Create role management
const roleAPI = createRoleManagement(authAPI);

// Use in your application
const user = await authAPI.getUser("user-id");
const roles = await roleAPI.getRolesForUser("user-id");
```

### Organization Management

```typescript
import { createOrganizationManagement } from "@op-plugin/authentication-better-auth";

const orgMgmt = createOrganizationManagement({ auth });

// Add member
await orgMgmt.addMemberToOrganization("user-id", "org-id", "member");

// Get members
const members = await orgMgmt.getOrganizationMembers("org-id");

// Invite user
await orgMgmt.inviteUserToOrganization("org-id", "newuser@example.com", "member");
```

---

## Best Practices

### Security

1. **Always use HTTPS** in production
2. **Rotate AUTH_SECRET** periodically
3. **Use strong passwords** — enforce minimum 8 characters, complexity
4. **Enable email verification** for new signups
5. **Implement rate limiting** on auth endpoints
6. **Use secure session cookies** (httpOnly, Secure, SameSite)
7. **Validate and sanitize** all user inputs
8. **Hash passwords** — Better Auth does this automatically
9. **Audit authentication events** for security monitoring
10. **Keep Better Auth updated** for security patches

### Database

1. **Index user email** for fast lookups (`CREATE INDEX idx_user_email ON user(email)`)
2. **Index sessions** by userId and expiration (`CREATE INDEX idx_session_user_id ON session(userId)`)
3. **Regular backups** of auth data
4. **Monitor database** for unusual activity
5. **Use connection pooling** for production databases

### Performance

1. **Cache user sessions** in memory/Redis
2. **Batch user queries** when possible
3. **Use select() to limit fields** in database queries
4. **Implement session invalidation** on password change
5. **Monitor authentication endpoint** latency

### Development

1. **Use environment variables** for all secrets
2. **Create test users** for development/staging
3. **Mock better-auth** in unit tests
4. **Use separate databases** for dev/staging/production
5. **Document custom authentication** flows
6. **Test OAuth providers** in staging environment
7. **Implement proper error handling** with meaningful messages

---

## Troubleshooting

### Common Issues

| Issue                         | Solution                                                                    |
| ----------------------------- | --------------------------------------------------------------------------- |
| `AUTH_DATABASE_URL not found` | Check `.env.local` file exists and contains `AUTH_DATABASE_URL`             |
| `Invalid AUTH_SECRET`         | Ensure `AUTH_SECRET` is set; generate one with `openssl rand -base64 32`    |
| `Database connection failed`  | Verify PostgreSQL is running and `AUTH_DATABASE_URL` is correct             |
| `Email not sending`           | Check email provider configuration; review Better Auth email hooks          |
| `OAuth callback error`        | Verify OAuth credentials and redirect URLs match provider configuration     |
| `Session not persisting`      | Check browser cookie settings; ensure `httpOnly` and `Secure` flags correct |
| `User not found after signup` | Verify database tables created; check email verification requirements       |

### Debugging

```typescript
// Enable logging
const auth = betterAuth({
  // ... other config
  logger: {
    debug: (msg) => console.debug("[Better Auth]", msg),
    error: (msg, err) => console.error("[Better Auth]", msg, err),
  },
});

// Inspect database state
const users = await auth.db.user.findMany();
const sessions = await auth.db.session.findMany();
console.log("Users:", users);
console.log("Sessions:", sessions);
```

---

## Import Paths

| Import                                  | Purpose                                        |
| --------------------------------------- | ---------------------------------------------- |
| `better-auth`                           | Core library: `betterAuth()`                   |
| `better-auth/client`                    | Client SDK: `createAuthClient()`               |
| `better-auth/plugins`                   | Plugins: `organization()`, `twoFactor()`, etc. |
| `better-auth/next-js`                   | Next.js handler: `toNextJsHandler()`           |
| `better-auth/hono`                      | Hono handler: `toHonoHandler()`                |
| `better-auth/express`                   | Express handler: `toExpressHandler()`          |
| `@op-plugin/authentication-better-auth` | Open Portal integration                        |
| `@op-plugin/auth-core`                  | Core authentication interfaces                 |
