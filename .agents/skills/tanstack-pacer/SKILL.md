---
name: tanstack-pacer
description: Framework-agnostic debouncing, throttling, rate limiting, queuing, and batching utilities for SolidJS.
---

## Overview

TanStack Pacer provides a unified, type-safe toolkit for controlling function execution timing. It offers class-based APIs, factory functions, and SolidJS signals/hooks for debouncing, throttling, rate limiting, queuing, and batching.

**Core:** `@tanstack/pacer`
**Solid:** `@tanstack/solid-pacer`
**Status:** Beta

## Installation

```bash
npm install @tanstack/pacer
npm install @tanstack/solid-pacer  # SolidJS hooks
```

## Debouncing

Delays execution until after a period of inactivity.

### Class API

```typescript
import { Debouncer } from '@tanstack/pacer'

const debouncer = new Debouncer(
  (query: string) => fetchSearchResults(query),
  {
    wait: 300,            // ms of inactivity before execution
    leading: false,       // Execute on leading edge (default: false)
    trailing: true,       // Execute on trailing edge (default: true)
    maxWait: 1000,       // Force execution after 1s of continuous calls
    enabled: true,
    onExecute: (result) => console.log(result),
  }
)

debouncer.maybeExecute('search term')
debouncer.cancel()
debouncer.getExecutionCount()
debouncer.setOptions({ wait: 500 }) // Dynamic reconfiguration
```

### Factory Function

```typescript
import { debounce } from '@tanstack/pacer'

const debouncedSearch = debounce(
  (query: string) => fetchResults(query),
  { wait: 300 }
)

debouncedSearch('term')
debouncedSearch.cancel()
```

### Solid Hooks

```typescript
import {
  useDebouncer,
  useDebouncedCallback,
  useDebouncedState,
  useDebouncedValue,
} from '@tanstack/solid-pacer'

// Full debouncer instance with signal
const debouncer = useDebouncer(fn, { wait: 300 })

// Simple debounced function
const debouncedFn = useDebouncedCallback(fn, { wait: 300 })

// Debounced state management
const [debouncedValue, setValue] = useDebouncedState(initialValue, { wait: 300 })

// Debounced reactive value (returns accessor)
const debouncedValue = useDebouncedValue(reactiveValue, { wait: 300 })
```

### Solid Signal Integration

```typescript
import { createSignal } from 'solid-js'
import { useDebouncedValue } from '@tanstack/solid-pacer'

const [query, setQuery] = createSignal('')

// Returns a signal that updates after debounce delay
const debouncedQuery = useDebouncedValue(query, { wait: 300 })

// Access in JSX
debouncedQuery() // Current debounced value
```

## Throttling

Limits execution to at most once per interval.

### Class API

```typescript
import { Throttler } from '@tanstack/pacer'

const throttler = new Throttler(
  (position: { x: number; y: number }) => updatePosition(position),
  {
    wait: 100,            // Minimum interval between executions
    leading: true,        // Execute immediately on first call (default: true)
    trailing: true,       // Execute after interval with last args (default: true)
    enabled: true,
    onExecute: (result) => console.log(result),
  }
)

throttler.maybeExecute({ x: 100, y: 200 })
throttler.cancel()
```

### Solid Hooks

```typescript
import {
  useThrottler,
  useThrottledCallback,
  useThrottledState,
  useThrottledValue,
} from '@tanstack/solid-pacer'

const throttledFn = useThrottledCallback(handleScroll, { wait: 100 })

// Throttled state - returns signal
const [throttledPos, setPos] = useThrottledState({ x: 0, y: 0 }, { wait: 100 })

// Access throttled value
throttledPos() // Current throttled value
```

## Rate Limiting

Controls execution with a maximum count within a time window.

### Class API

```typescript
import { RateLimiter } from '@tanstack/pacer'

const limiter = new RateLimiter(
  async (endpoint: string) => fetch(endpoint).then(r => r.json()),
  {
    limit: 10,            // Max executions per window
    window: 60000,        // Time window in ms (60s)
    enabled: true,
    onExecute: (result) => console.log(result),
    onReject: (...args) => console.warn('Rate limited:', args),
  }
)

limiter.maybeExecute('/api/data')  // Rejected if limit exceeded
limiter.getExecutionCount()
limiter.getRejectionCount()
```

### Solid Hooks

```typescript
import {
  useRateLimiter,
  useRateLimitedCallback,
  useRateLimitedState,
  useRateLimitedValue,
} from '@tanstack/solid-pacer'

const rateLimitedFn = useRateLimitedCallback(apiCall, { limit: 5, window: 1000 })

// Returns signal with rate limit state
const [rateLimitedState, setState] = useRateLimitedState(apiCall, { limit: 5, window: 1000 })
```

## Queuing

Sequential execution with configurable concurrency.

```typescript
import { Queue } from '@tanstack/pacer'

const queue = new Queue({
  concurrency: 1,         // Max concurrent tasks
  started: true,          // Start processing immediately
})

queue.add(() => uploadFile(file1))
queue.add(() => uploadFile(file2))

queue.start()
queue.pause()
queue.clear()
queue.getSize()           // Pending count
queue.getPending()        // Currently executing count
```

### Solid createQueuer

```typescript
import { createQueuer } from '@tanstack/solid-pacer'

const { add, start, pause, clear, size, pending } = createQueuer({
  concurrency: 2,
})

// Returns signals
size()       // Current queue size
pending()    // Currently executing count
```

## Batching

Groups calls for combined processing.

```typescript
import { Batcher } from '@tanstack/pacer'

const batcher = new Batcher(
  (items: LogEntry[]) => sendBatchToServer(items),
  {
    maxSize: 50,          // Auto-flush at 50 items
    wait: 1000,           // Auto-flush after 1s
  }
)

batcher.add(logEntry)    // Accumulates
batcher.flush()          // Manual flush
batcher.getSize()        // Current batch size
batcher.clear()          // Discard batch
```

### Solid createBatcher

```typescript
import { createBatcher } from '@tanstack/solid-pacer'

const { add, flush, clear, size } = createBatcher(
  (items: LogEntry[]) => sendBatchToServer(items),
  { maxSize: 50, wait: 1000 }
)

// Returns signals
size()  // Current batch size
```

## Async Variants

```typescript
import { AsyncDebouncer, asyncDebounce, AsyncThrottler, asyncThrottle } from '@tanstack/pacer'

const asyncDebouncer = new AsyncDebouncer(
  async (query: string) => {
    const response = await fetch(`/api/search?q=${query}`)
    return response.json()
  },
  { wait: 300 }
)

// Solid async hooks
import { useAsyncDebouncer, useAsyncThrottler } from '@tanstack/solid-pacer'

const asyncDebouncer = useAsyncDebouncer(fn, { wait: 300 })
const asyncThrottler = useAsyncThrottler(fn, { wait: 100 })
```

## Choosing the Right Utility

| Scenario | Utility | Why |
|----------|---------|-----|
| Search input | Debouncer | Wait for user to stop typing |
| Scroll events | Throttler | Periodic updates during activity |
| API protection | RateLimiter | Hard limit on call frequency |
| File uploads | Queue | Sequential processing |
| Analytics events | Batcher | Group for efficiency |
| Network requests | AsyncDebouncer | Handle abort/retry |

## Leading vs Trailing Edge

- **Leading** (`leading: true`): Execute immediately, suppress until wait expires. Good for button clicks.
- **Trailing** (`trailing: true`): Execute after activity stops. Good for search inputs.
- **Both**: Execute immediately AND after final wait. Good for scroll throttling.

## SolidJS Specific Patterns

### Using with Signals

```typescript
import { createSignal } from 'solid-js'
import { useDebouncedValue, useThrottledValue } from '@tanstack/solid-pacer'

const [input, setInput] = createSignal('')

// Debounced version - updates after 300ms of no changes
const debouncedInput = useDebouncedValue(input, { wait: 300 })

// Throttled version - updates at most every 100ms
const throttledInput = useThrottledValue(input, { wait: 100 })
```

### Using with Event Handlers

```typescript
import { useThrottledCallback } from '@tanstack/solid-pacer'

function ScrollComponent() {
  const handleScroll = useThrottledCallback((e) => {
    console.log(e.scrollTop)
  }, { wait: 100 })

  return <div onScroll={handleScroll}>...</div>
}
```

### Using with Forms

```typescript
import { useDebouncedState } from '@tanstack/solid-pacer'

function SearchForm() {
  const [query, setQuery] = useDebouncedState('', { wait: 300 })

  // query() returns current debounced value
  // setQuery updates immediately
  
  return (
    <input
      value={query()}
      onInput={(e) => setQuery(e.target.value)}
    />
  )
}
```

## Best Practices

1. **Use `maxWait` with debouncing** to guarantee execution during continuous activity
2. **Use async variants** for network requests (handle abort/cancellation)
3. **Solid hooks return signals** - call them as functions to get values
4. **Use `setOptions`** for dynamic reconfiguration (e.g., reducing wait for power users)
5. **Compose utilities** for complex scenarios (rate-limited queue)
6. **Use `onReject`** on RateLimiter to inform users when they're rate limited
7. **Leverage Solid's fine-grained reactivity** - hooks integrate naturally with signals

## Common Pitfalls

- Using debounce when you need throttle (debounce waits for inactivity, throttle guarantees periodic execution)
- Not using `maxWait` with debounce for long-running continuous events
- Forgetting to call the signal returned by hooks (e.g., `useDebouncedValue()` not `useDebouncedValue`)
- Not using `maxWait` for continuous events that must execute
- Creating new instances on every render (use hooks or module-level)

(End of file - total 281 lines)
