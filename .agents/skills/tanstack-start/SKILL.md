---
name: tanstack-start
description: Full-stack SolidJS framework powered by TanStack Router with SSR, streaming, server functions, and deployment to any hosting provider.
---

# TanStack Start Skills

## Overview

TanStack Start is a full-stack SolidJS framework built on TanStack Router, powered by Vite and Nitro (via Vinxi). It provides server-side rendering, streaming, server functions (RPC), middleware, API routes, and deploys to any platform via Nitro presets.

**Package:** `@tanstack/solid-start`
**Router Plugin:** `@tanstack/router-plugin`
**Build Tool:** Vinxi (Vite + Nitro)
**Status:** RC (Release Candidate)
**RSC Support:** Solid Server Components support is in active development and will land as a non-breaking v1.x addition

## Installation & Project Setup

```bash
npx @tanstack/cli create my-app
# Or manually:
npm install @tanstack/solid-start @tanstack/solid-router solid-js
npm install -D @tanstack/router-plugin typescript vite vite-tsconfig-paths
```

### Project Structure

```
my-app/
  app/
    routes/
      __root.tsx          # Root layout
      index.tsx           # / route
      posts.$postId.tsx   # /posts/:postId
      api/
        users.ts          # /api/users API route
    client.tsx            # Client entry
    router.tsx            # Router creation
    ssr.tsx               # SSR entry
    routeTree.gen.ts      # Auto-generated route tree
  app.config.ts           # TanStack Start config
  db/
    schema.ts             # Drizzle schema
    index.ts              # DB client
  drizzle.config.ts       # Drizzle config
  tsconfig.json
  package.json
```

### Configuration (`app.config.ts`)

```typescript
import { defineConfig } from '@tanstack/solid-start/config'
import viteTsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  vite: {
    plugins: [
      viteTsConfigPaths({ projects: ['./tsconfig.json'] }),
    ],
  },
  server: {
    preset: 'node-server', // 'vercel' | 'netlify' | 'cloudflare-pages' | etc.
  },
  tsr: {
    appDirectory: './app',
    routesDirectory: './app/routes',
    generatedRouteTree: './app/routeTree.gen.ts',
  },
})
```

### Drizzle Database Setup

```bash
npm install drizzle-kit drizzle-orm
npm install better-sqlite3 # or postgres, mysql2, etc.
```

```typescript
// db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(strftime('%s', 'now'))`),
})

// db/index.ts
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'

const sqlite = new Database('sqlite.db')
export const db = drizzle(sqlite, { schema })
```

## Server Functions (`createServerFn`)

Server functions provide type-safe RPC calls between client and server.

### Basic Server Functions

```typescript
import { createServerFn } from '@tanstack/solid-start'
import { db } from '../db'
import { users } from '../db/schema'

// GET (data fetching, cacheable)
const getUsers = createServerFn()
  .handler(async () => {
    const allUsers = await db.select().from(users).all()
    return allUsers
  })

// POST (mutations, side effects)
const createUser = createServerFn({ method: 'POST' })
  .validator((data: { name: string; email: string }) => data)
  .handler(async ({ data }) => {
    const [user] = await db.insert(users).values(data).returning()
    return user
  })
```

### With Zod Validation

```typescript
import { z } from 'zod'

const updateUser = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.number(),
      name: z.string().min(1),
      email: z.string().email(),
    })
  )
  .handler(async ({ data }) => {
    // data is fully typed: { id: number; name: string; email: string }
    const [updated] = await db.update(users)
      .set(data)
      .where(sql`${users.id} = ${data.id}`)
      .returning()
    return updated
  })
```

## Middleware

### Creating Middleware

```typescript
import { createMiddleware } from '@tanstack/solid-start'

const loggingMiddleware = createMiddleware().handler(async ({ next }) => {
  console.log('Request started')
  const result = await next()
  console.log('Request completed')
  return result
})
```

### Auth Middleware with Context

```typescript
import { getWebRequest } from 'solid-js/web'

const authMiddleware = createMiddleware().handler(async ({ next }) => {
  const request = getWebRequest()
  const session = await getSession(request)

  if (!session?.user) {
    throw redirect({ to: '/login' })
  }

  // Pass typed context to handler
  return next({ context: { user: session.user } })
})
```

### Chaining Middleware

```typescript
const adminMiddleware = createMiddleware()
  .middleware([authMiddleware])
  .handler(async ({ next, context }) => {
    // context.user is typed from authMiddleware
    if (context.user.role !== 'admin') {
      throw redirect({ to: '/unauthorized' })
    }
    return next({ context: { isAdmin: true } })
  })

// Usage
const adminAction = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    // context: { user: User; isAdmin: boolean }
    return { success: true }
  })
```

## API Routes (Server Routes)

```typescript
// app/routes/api/users.ts
import { createAPIFileRoute } from '@tanstack/solid-start/api'
import { db } from '../../db'
import { users } from '../../db/schema'

export const APIRoute = createAPIFileRoute('/api/users')({
  GET: async () => {
    const allUsers = await db.select().from(users).all()
    return Response.json(allUsers)
  },
  POST: async ({ request }) => {
    const body = await request.json()
    const [user] = await db.insert(users).values(body).returning()
    return new Response(JSON.stringify(user), { status: 201 })
  },
})
```

## SSR Strategies

### Streaming SSR (Default)

```typescript
import { defer } from '@tanstack/solid-start'
import { createAsync } from '@tanstack/solid-router'

export const Route = createFileRoute('/dashboard')({
  loader: async () => ({
    criticalData: await fetchCriticalData(),
    deferredData: defer(fetchSlowData()),
  }),
  component: Dashboard,
})

function Dashboard() {
  const loaderData = Route.useLoaderData()
  const criticalData = () => loaderData().criticalData
  
  return (
    <div>
      <CriticalSection data={criticalData()} />
      <Suspense fallback={<Loading />}>
        <Async resolve={loaderData().deferredData}>
          {(data) => <SlowSection data={data} />}
        </Async>
      </Suspense>
    </div>
  )
}
```

## Authentication with Better Auth + Drizzle

```bash
npm install better-auth drizzle-adapter
```

```typescript
// lib/auth.ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '../db'
import * as schema from '../db/schema'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'sqlite', // or 'postgres', 'mysql'
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
})

// Server function for current user
const getSession = createServerFn()
  .handler(async () => {
    const session = await auth.api.getSession({
      headers: getWebRequest().headers,
    })
    return session
  })
```

## Deployment

### Supported Platforms (Nitro Presets)

```typescript
// app.config.ts
export default defineConfig({
  server: {
    preset: 'node-server',        // Self-hosted Node.js
    // preset: 'vercel',          // Vercel
    // preset: 'netlify',         // Netlify
    // preset: 'cloudflare-pages', // Cloudflare Pages
    // preset: 'aws-lambda',      // AWS Lambda
    // preset: 'deno-server',     // Deno Deploy
    // preset: 'bun',             // Bun
  },
})
```

## Best Practices

1. **Use validators for all server function inputs** - runtime safety and TypeScript inference
2. **Compose middleware** for cross-cutting concerns (auth, logging, rate limiting)
3. **Use `createServerFn` GET** for data fetching (cacheable, preloadable)
4. **Use `createServerFn` POST** for mutations and side effects
5. **Use `beforeLoad`** for route-level auth guards
6. **Use `defer()`** for non-critical data to improve TTFB
7. **Set `defaultPreload: 'intent'`** on the router for instant navigation
8. **Co-locate server functions** with the routes that use them
9. **Use Drizzle** for type-safe database operations with SolidJS

## Common Pitfalls

- Server functions cannot close over client-side variables (they're extracted to separate bundles)
- Data returned from server functions must be serializable
- Forgetting `await` in loaders leads to streaming issues
- Importing server-only code in client bundles causes build errors
- Missing `declare module '@tanstack/solid-router'` loses all type safety

(End of file - total 268 lines)
