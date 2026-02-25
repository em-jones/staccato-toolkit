---
name: tanstack-query
description: Powerful asynchronous state management, server-state utilities, and data fetching for SolidJS, TS/JS.
---

## Overview

TanStack Query (formerly React Query) manages server state - data that lives on the server and needs to be fetched, cached, synchronized, and updated. It provides automatic caching, background refetching, stale-while-revalidate patterns, pagination, infinite scrolling, and optimistic updates out of the box.

**Package:** `@tanstack/solid-query`
**Devtools:** `@tanstack/solid-query-devtools`
**Current Version:** v5

## Installation

```bash
npm install @tanstack/solid-query
npm install -D @tanstack/solid-query-devtools  # Optional
```

## Setup

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { SolidQueryDevtools } from '@tanstack/solid-query-devtools'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes (garbage collection)
      retry: 3,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
      <SolidQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

## Core Concepts

### Query Keys

Query keys uniquely identify cached data. They must be serializable arrays:

```tsx
// Simple key
useQuery(() => ({ queryKey: ['todos'], queryFn: fetchTodos }))

// With variables (dependency array pattern)
useQuery(() => ({ queryKey: ['todos', { status, page }], queryFn: fetchTodos }))

// Hierarchical keys for invalidation
useQuery(() => ({ queryKey: ['todos', todoId], queryFn: () => fetchTodo(todoId) }))
useQuery(() => ({ queryKey: ['todos', todoId, 'comments'], queryFn: () => fetchComments(todoId) }))

// Invalidation matches prefixes:
// queryClient.invalidateQueries({ queryKey: ['todos'] })
// ^ Invalidates ALL queries starting with 'todos'
```

### Query Functions

```tsx
// Query function receives a QueryFunctionContext
useQuery(() => ({
  queryKey: ['todos', todoId],
  queryFn: async ({ queryKey, signal, meta }) => {
    const [_key, id] = queryKey
    const response = await fetch(`/api/todos/${id}`, { signal })
    if (!response.ok) throw new Error('Failed to fetch')
    return response.json()
  },
}))

// Using the signal for automatic cancellation
useQuery(() => ({
  queryKey: ['todos'],
  queryFn: async ({ signal }) => {
    const response = await fetch('/api/todos', { signal })
    return response.json()
  },
}))
```

### queryOptions Helper

Create reusable, type-safe query configurations:

```tsx
import { queryOptions } from '@tanstack/solid-query'

export const todosQueryOptions = queryOptions({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  staleTime: 5000,
})

export const todoQueryOptions = (todoId: number) =>
  queryOptions({
    queryKey: ['todos', todoId],
    queryFn: () => fetchTodo(todoId),
    enabled: !!todoId,
  })

// Usage
const query = useQuery(todosQueryOptions)
const query = useQuery(() => todoQueryOptions(id))
await queryClient.prefetchQuery(todosQueryOptions)
```

## Queries (useQuery)

### Basic Usage

```tsx
import { useQuery } from '@tanstack/solid-query'
import { Switch, Match } from 'solid-js'

function Todos() {
  const query = useQuery(() => ({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  }))

  return (
    <Switch>
      <Match when={query.isLoading}>
        <Spinner />
      </Match>
      <Match when={query.isError}>
        <Error message={query.error?.message} />
      </Match>
      <Match when={query.isSuccess}>
        <TodoList todos={query.data} />
      </Match>
    </Switch>
  )
}
```

### Query Options

```tsx
useQuery(() => ({
  queryKey: ['todos'],
  queryFn: fetchTodos,

  // Freshness
  staleTime: 5000,            // ms data stays fresh (default: 0)
  gcTime: 300000,             // ms unused data stays in cache (default: 5 min)

  // Refetching
  refetchInterval: 10000,     // Poll every 10s
  refetchIntervalInBackground: false, // Don't poll when tab hidden
  refetchOnMount: true,       // Refetch on component mount if stale
  refetchOnWindowFocus: true, // Refetch on window focus if stale
  refetchOnReconnect: true,   // Refetch on network reconnect

  // Retry
  retry: 3,                   // Number of retries (or function)
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

  // Conditional
  enabled: !!userId,          // Only run when truthy

  // Initial/placeholder data
  initialData: () => cachedData,
  initialDataUpdatedAt: Date.now() - 10000,
  placeholderData: (previousData) => previousData, // keepPreviousData pattern

  // Transform
  select: (data) => data.filter(todo => !todo.done),

  // Structural sharing (default: true)
  structuralSharing: true,

  // Network mode
  networkMode: 'online', // 'online' | 'always' | 'offlineFirst'

  // Meta (accessible in query function context)
  meta: { purpose: 'user-facing' },
}))
```

## Mutations (useMutation)

### Basic Usage

```tsx
import { useMutation, useQueryClient } from '@tanstack/solid-query'

function AddTodo() {
  const queryClient = useQueryClient()

  const mutation = useMutation(() => ({
    mutationFn: (newTodo: { title: string }) => {
      return fetch('/api/todos', {
        method: 'POST',
        body: JSON.stringify(newTodo),
      }).then(res => res.json())
    },
    // Lifecycle callbacks
    onMutate: async (variables) => {
      // Called before mutationFn
      // Good for optimistic updates
      return { previousTodos } // context for onError
    },
    onSuccess: (data, variables, context) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
    onError: (error, variables, context) => {
      // Rollback optimistic updates
      queryClient.setQueryData(['todos'], context.previousTodos)
    },
    onSettled: (data, error, variables, context) => {
      // Always runs (success or error)
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  }))

  return (
    <button
      onClick={() => mutation.mutate({ title: 'New Todo' })}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? 'Adding...' : 'Add Todo'}
    </button>
  )
}
```

### Mutation State

```tsx
const mutation = useMutation(() => ({
  mutationFn: addTodo,
}))

// Access in reactive context
mutation.isPending      // Mutation in progress
mutation.isError
mutation.isSuccess
mutation.isIdle         // Not yet fired
mutation.data           // Success response
mutation.error          // Error object
mutation.reset          // Reset state to idle
mutation.variables      // Variables passed to mutate
mutation.status         // 'idle' | 'pending' | 'error' | 'success'

// Fire mutation
mutation.mutate(newTodo)
const result = await mutation.mutateAsync(newTodo)
```

## Optimistic Updates

```tsx
const mutation = useMutation(() => ({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    // 1. Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['todos', newTodo.id] })

    // 2. Snapshot previous value
    const previousTodo = queryClient.getQueryData(['todos', newTodo.id])

    // 3. Optimistically update
    queryClient.setQueryData(['todos', newTodo.id], newTodo)

    // 4. Return context for rollback
    return { previousTodo }
  },
  onError: (err, newTodo, context) => {
    // Rollback on error
    queryClient.setQueryData(['todos', newTodo.id], context.previousTodo)
  },
  onSettled: () => {
    // Always refetch to sync with server
    queryClient.invalidateQueries({ queryKey: ['todos'] })
  },
}))
```

### Optimistic Updates on Lists

```tsx
onMutate: async (newTodo) => {
  await queryClient.cancelQueries({ queryKey: ['todos'] })
  const previousTodos = queryClient.getQueryData(['todos'])

  queryClient.setQueryData(['todos'], (old) => [...old, newTodo])

  return { previousTodos }
},
onError: (err, newTodo, context) => {
  queryClient.setQueryData(['todos'], context.previousTodos)
},
```

## Query Invalidation

```tsx
const queryClient = useQueryClient()

// Invalidate all queries
queryClient.invalidateQueries()

// Invalidate by prefix
queryClient.invalidateQueries({ queryKey: ['todos'] })

// Invalidate exact match
queryClient.invalidateQueries({ queryKey: ['todos', 1], exact: true })

// Invalidate with predicate
queryClient.invalidateQueries({
  predicate: (query) =>
    query.queryKey[0] === 'todos' && query.queryKey[1]?.status === 'done',
})

// Invalidate and refetch immediately
queryClient.refetchQueries({ queryKey: ['todos'] })

// Remove from cache entirely
queryClient.removeQueries({ queryKey: ['todos', 1] })

// Reset to initial state
queryClient.resetQueries({ queryKey: ['todos'] })
```

## Infinite Queries

```tsx
import { useInfiniteQuery } from '@tanstack/solid-query'
import { For, Show } from 'solid-js'

function InfiniteList() {
  const query = useInfiniteQuery(() => ({
    queryKey: ['projects'],
    queryFn: async ({ pageParam }) => {
      const res = await fetch(`/api/projects?cursor=${pageParam}`)
      return res.json()
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      return lastPage.nextCursor ?? undefined // undefined = no more pages
    },
    getPreviousPageParam: (firstPage, allPages, firstPageParam) => {
      return firstPage.prevCursor ?? undefined
    },
    maxPages: 3, // Keep max 3 pages in cache (for performance)
  }))

  return (
    <div>
      <For each={query.data?.pages}>
        {(page) => (
          <For each={page.items}>
            {(item) => <Item item={item} />}
          </For>
        )}
      </For>
      <button
        onClick={() => query.fetchNextPage()}
        disabled={!query.hasNextPage || query.isFetchingNextPage}
      >
        {query.isFetchingNextPage 
          ? 'Loading...' 
          : query.hasNextPage 
            ? 'Load More' 
            : 'No more'}
      </button>
    </div>
  )
}
```

## Parallel Queries

```tsx
// Multiple independent queries run in parallel automatically
function Dashboard() {
  const usersQuery = useQuery(() => ({ queryKey: ['users'], queryFn: fetchUsers }))
  const projectsQuery = useQuery(() => ({ queryKey: ['projects'], queryFn: fetchProjects }))

  // Both fetch simultaneously
}

// Dynamic parallel queries with useQueries
function UserProjects({ userIds }) {
  const queries = useQueries(() => ({
    queries: userIds.map((id) => ({
      queryKey: ['user', id],
      queryFn: () => fetchUser(id),
    })),
    combine: (results) => ({
      data: results.map(r => r.data),
      pending: results.some(r => r.isPending),
    }),
  }))
}
```

## Dependent Queries

```tsx
// Sequential queries using enabled
function UserPosts({ userId }) {
  const userQuery = useQuery(() => ({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  }))

  const postsQuery = useQuery(() => ({
    queryKey: ['posts', userId],
    queryFn: () => fetchPostsByUser(userId),
    enabled: () => !!userQuery.data, // Only run when user is loaded
  }))
}
```

## Paginated Queries

```tsx
import { createSignal } from 'solid-js'

function PaginatedList() {
  const [page, setPage] = createSignal(1)

  const query = useQuery(() => ({
    queryKey: ['todos', page()],
    queryFn: () => fetchTodos(page()),
    placeholderData: (previousData) => previousData, // Keep showing old data
  }))

  return (
    <div style={{ opacity: query.isPlaceholderData ? 0.5 : 1 }}>
      <For each={query.data?.items}>
        {(item) => <Item item={item} />}
      </For>
      <button
        onClick={() => setPage(p => p + 1)}
        disabled={query.isPlaceholderData || !query.data?.hasMore}
      >
        Next
      </button>
    </div>
  )
}
```

## Suspense Integration

```tsx
import { useSuspenseQuery } from '@tanstack/solid-query'
import { Suspense, For } from 'solid-js'
import { ErrorBoundary } from 'solid-js'

// Component will suspend until data is loaded
function TodoList() {
  const query = useSuspenseQuery(() => ({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  }))
  // data is guaranteed to be defined here
  return (
    <ul>
      <For each={query.data}>
        {(todo) => <li>{todo.title}</li>}
      </For>
    </ul>
  )
}

// Wrap with Suspense boundary
function App() {
  return (
    <ErrorBoundary fallback={(err) => <Error error={err} />}>
      <Suspense fallback={<Loading />}>
        <TodoList />
      </Suspense>
    </ErrorBoundary>
  )
}

// Multiple suspense queries (fetch in parallel)
function Dashboard() {
  const [users, projects] = useSuspenseQueries(() => ({
    queries: [
      { queryKey: ['users'], queryFn: fetchUsers },
      { queryKey: ['projects'], queryFn: fetchProjects },
    ],
  }))
}
```

## Prefetching

```tsx
const queryClient = useQueryClient()

// Prefetch on hover
function TodoLink({ todoId }) {
  const prefetch = () => {
    queryClient.prefetchQuery({
      queryKey: ['todo', todoId],
      queryFn: () => fetchTodo(todoId),
      staleTime: 5000, // Only prefetch if data older than 5s
    })
  }

  return (
    <a href={`/todos/${todoId}`} onMouseEnter={prefetch}>
      Todo {todoId}
    </a>
  )
}

// Prefetch in route loader (TanStack Router integration)
export const Route = createFileRoute('/todos/$todoId')({
  loader: ({ context: { queryClient }, params: { todoId } }) =>
    queryClient.ensureQueryData(todoQueryOptions(todoId)),
})

// Prefetch infinite queries
queryClient.prefetchInfiniteQuery({
  queryKey: ['projects'],
  queryFn: fetchProjects,
  initialPageParam: 0,
  pages: 3, // Prefetch first 3 pages
})
```

## SSR & Hydration

### Server-Side Prefetching

```tsx
// Server component or loader
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/solid-query'

async function getServerSideProps() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  })

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  }
}

function Page({ dehydratedState }) {
  return (
    <HydrationBoundary state={dehydratedState}>
      <Todos />
    </HydrationBoundary>
  )
}
```

### Streaming SSR (SolidStart)

```tsx
import { dehydrate, HydrationBoundary } from '@tanstack/solid-query'
import { makeQueryClient } from './query-client'

export default async function Page() {
  const queryClient = makeQueryClient()

  // Prefetch on server
  await queryClient.prefetchQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TodoList />
    </HydrationBoundary>
  )
}
```

## QueryClient API

```tsx
const queryClient = useQueryClient()

// Get cached data
queryClient.getQueryData(['todos'])

// Set cached data
queryClient.setQueryData(['todos'], updatedTodos)
queryClient.setQueryData(['todos'], (old) => [...old, newTodo])

// Get query state
queryClient.getQueryState(['todos'])

// Check if fetching
queryClient.isFetching({ queryKey: ['todos'] })
queryClient.isMutating()

// Cancel queries
queryClient.cancelQueries({ queryKey: ['todos'] })

// Invalidate (marks stale, refetches active)
queryClient.invalidateQueries({ queryKey: ['todos'] })

// Refetch (force refetch even if fresh)
queryClient.refetchQueries({ queryKey: ['todos'] })

// Remove from cache
queryClient.removeQueries({ queryKey: ['todos'] })

// Reset to initial state
queryClient.resetQueries({ queryKey: ['todos'] })

// Clear entire cache
queryClient.clear()

// Prefetch
queryClient.prefetchQuery({ queryKey: ['todos'], queryFn: fetchTodos })
queryClient.ensureQueryData({ queryKey: ['todos'], queryFn: fetchTodos })

// Get/set defaults
queryClient.setQueryDefaults(['todos'], { staleTime: 10000 })
queryClient.getQueryDefaults(['todos'])
queryClient.setMutationDefaults(['addTodo'], { mutationFn: addTodo })
```

## Testing

```tsx
import { renderHook, waitFor } from '@testing-library/solid'
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Don't retry in tests
        gcTime: Infinity, // Prevent garbage collection during tests
      },
    },
  })
  return (props) => (
    <QueryClientProvider client={queryClient}>
      {props.children}
    </QueryClientProvider>
  )
}

test('fetches todos', async () => {
  const { result } = renderHook(() => useQuery(() => ({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  })), { wrapper: createWrapper })

  await waitFor(() => expect(result().isSuccess).toBe(true))
  expect(result().data).toEqual(expectedTodos)
})

// Mock with setQueryData for component tests
test('renders todos', () => {
  const queryClient = new QueryClient()
  queryClient.setQueryData(['todos'], mockTodos)

  render(
    <QueryClientProvider client={queryClient}>
      <TodoList />
    </QueryClientProvider>
  )

  expect(screen.getByText('Todo 1')).toBeInTheDocument()
})
```

## TypeScript Patterns

### Typing Query Functions

```tsx
interface Todo {
  id: number
  title: string
  completed: boolean
}

// Type is inferred from queryFn return type
const query = useQuery(() => ({
  queryKey: ['todos'],
  queryFn: async (): Promise<Todo[]> => {
    const res = await fetch('/api/todos')
    return res.json()
  },
}))
// query.data: Todo[] | undefined

// With select
const query = useQuery(() => ({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  select: (data): string[] => data.map(t => t.title),
}))
// query.data: string[] | undefined
```

### Typing Errors

```tsx
// Default error type is Error
const query = useQuery<Todo[], Error>(() => ({
  queryKey: ['todos'],
  queryFn: fetchTodos,
}))

// Or register globally
declare module '@tanstack/solid-query' {
  interface Register {
    defaultError: AxiosError
  }
}
```

### Query Options Pattern (Recommended)

```tsx
import { queryOptions, infiniteQueryOptions } from '@tanstack/solid-query'

export const todosOptions = queryOptions({
  queryKey: ['todos'] as const,
  queryFn: fetchTodos,
  staleTime: 5000,
})

export const todoOptions = (id: number) =>
  queryOptions({
    queryKey: ['todos', id] as const,
    queryFn: () => fetchTodo(id),
    enabled: !!id,
  })

// Full type inference everywhere
const query = useQuery(todosOptions)
await queryClient.ensureQueryData(todosOptions)
queryClient.invalidateQueries({ queryKey: todosOptions.queryKey })
```

## Important Differences: Solid vs React

### Arguments are Functions

Solid Query primitives take functions that return options, not plain objects:

```tsx
// ❌ react version
useQuery({
  queryKey: ['todos', todo],
  queryFn: fetchTodos,
})

// ✅ solid version
useQuery(() => ({
  queryKey: ['todos', todo],
  queryFn: fetchTodos,
}))
```

### No Destructuring Outside Reactive Context

Solid Query returns a store, not plain objects:

```tsx
// ❌ React pattern - does NOT work in Solid
const { isPending, data } = useQuery({ ... })

// ✅ Solid pattern - access properties in reactive context
const query = useQuery(() => ({ ... }))
query.isPending  // Access directly
query.data
```

### Signals Can Be Passed Directly

```tsx
const [enabled, setEnabled] = createSignal(false)

// ✅ passing a signal directly is safe
const query = useQuery(() => ({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  enabled: enabled(),  // Signal value is tracked automatically
}))
```

### Error Boundaries

Use SolidJS native ErrorBoundary for error handling:

```tsx
import { ErrorBoundary } from 'solid-js'

function App() {
  return (
    <ErrorBoundary fallback={(err) => <ErrorDisplay error={err} />}>
      <Todos />
    </ErrorBoundary>
  )
}
```

## Best Practices

1. **Always pass a function to `useQuery`/`useMutation`** - this makes options reactive
2. **Don't destructure query results** - access properties directly on the query object
3. **Use `queryOptions` helper** for type-safe, reusable query configurations
4. **Structure query keys hierarchically** for granular invalidation
5. **Set appropriate `staleTime`** - 0 means always refetch on mount (default), increase for less dynamic data
6. **Use `placeholderData`** (not `initialData`) for keeping previous page data during pagination
7. **Use `useSuspenseQuery`** when using Suspense boundaries for cleaner component code
8. **Use `enabled`** as a function for dependent queries, not conditional hook calls
9. **Always invalidate after mutations** - don't rely solely on optimistic updates
10. **Cancel queries in `onMutate`** before optimistic updates to prevent race conditions
11. **Use `ensureQueryData`** in route loaders instead of `prefetchQuery` for immediate access
12. **Set `retry: false` in tests** to avoid timeout issues
13. **Use `select`** for derived data instead of transforming in the component
14. **Keep query functions pure** - they should only fetch, not cause side effects
15. **Use `gcTime: Infinity`** in tests to prevent cache cleanup during assertions

## Common Pitfalls

- Not passing a function to `useQuery` (will not be reactive)
- Destructuring query results outside reactive context (breaks reactivity)
- Using `initialData` when you mean `placeholderData` (initialData counts as "fresh" data)
- Not providing `initialPageParam` for infinite queries (required in v5)
- Not cancelling queries before optimistic updates (race conditions)
- Setting `staleTime` higher than `gcTime` (data gets garbage collected while "fresh")
- Forgetting to wrap tests with `QueryClientProvider`
- Using same `QueryClient` instance across tests (shared state)
- Not awaiting `invalidateQueries` in mutation callbacks when order matters

(End of file - total 685 lines)
