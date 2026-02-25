---
name: tanstack-store
description: Framework-agnostic, immutable reactive data store with framework adapters for React, Vue, Solid, Angular, and Svelte.
---

## Overview

TanStack Store is a lightweight reactive store (signals-like) that powers the internals of TanStack libraries. Use `createStore` for state, derived values, and effects. Framework adapters provide reactive hooks for each framework.

**Core:** `@tanstack/store`
**Solid:** `@tanstack/solid-store`
**React:** `@tanstack/react-store`

## Installation

```bash
# Core store
npm install @tanstack/store

# Framework adapters
npm install @tanstack/react-store  # React
npm install @tanstack/solid-store  # Solid
npm install @tanstack/vue-store    # Vue
npm install @tanstack/angular-store # Angular
npm install @tanstack/svelte-store  # Svelte
```

## Store

### Creating a Store

```typescript
import { createStore } from "@tanstack/store";

const countStore = createStore(0);

const userStore = createStore<{ name: string; email: string }>({
  name: "Alice",
  email: "alice@example.com",
});

// Access state
countStore.state; // 0
userStore.state.name; // 'Alice'

// Set state
countStore.setState((c) => c + 1);
userStore.setState((prev) => ({ ...prev, name: "Bob" }));
```

### Updating State

```typescript
// Function updater (immutable update)
countStore.setState((prev) => prev + 1);

userStore.setState((prev) => ({ ...prev, name: "Bob" }));
```

### Subscribing to Changes

```typescript
const unsub = countStore.subscribe(() => {
  console.log("Count:", countStore.state);
});

// Cleanup
unsub();
```

### Store Properties

```typescript
store.state; // Current state
store.prevState; // Previous state
store.listeners; // Set of listener callbacks
```

## Derived (Computed Values)

```typescript
import { createStore } from "@tanstack/store";

const count = createStore(5);
const multiplier = createStore(2);

// Derived using createStore with a function
const doubled = createStore(() => count.state * multiplier.state);

console.log(doubled.state); // 10

count.setState(() => 10);
console.log(doubled.state); // 20

// Derived with previous value
const accumulated = createStore((prev) => {
  return count.state + (prev?.currentVal ?? 0);
});
```

### Chaining Derived

```typescript
const filtered = createStore(() => dataStore.state.filter(matchesFilter(filterStore.state)));

const sorted = createStore(() => [...filtered.state].sort(comparator(sortStore.state)));

const paginated = createStore(() =>
  sorted.state.slice(pageStore.state.offset, pageStore.state.offset + pageStore.state.limit),
);
```

## Effect (Side Effects)

```typescript
import { createStore, effect } from "@tanstack/store";

const count = createStore(0);

// Create effect - automatically tracks dependencies
const logger = effect(() => {
  console.log("Count changed:", count.state);
  // Optionally return cleanup function
  return () => console.log("Cleaning up");
});

count.setState(() => 1); // logs: "Count changed: 1"

// Cleanup
logger();
```

### Effect with Cleanup

```typescript
const timerEffect = effect(() => {
  const id = setInterval(() => {
    /* ... */
  }, intervalStore.state);
  return () => clearInterval(id); // cleanup on unmount
});
```

## Batch

Group multiple updates into one notification:

```typescript
import { batch } from "@tanstack/store";

// Subscribers fire only once with final state
batch(() => {
  countStore.setState(() => 1);
  nameStore.setState(() => "Alice");
  settingsStore.setState((prev) => ({ ...prev, theme: "dark" }));
});
```

## Framework Integration

### React

```tsx
import { useStore } from "@tanstack/react-store";

// Subscribe to full state
function Counter() {
  const count = useStore(countStore);
  return <button onClick={() => countStore.setState((c) => c + 1)}>{count}</button>;
}

// Subscribe with selector (performance optimization)
function UserName() {
  const name = useStore(userStore, (state) => state.name);
  return <span>{name}</span>;
}

// Use shallow for object/array selectors
import { shallow } from "@tanstack/react-store";
const items = useStore(todosStore, (state) => state.items, shallow);
```

### Solid

```tsx
import { createStore, useStore } from "@tanstack/solid-store";

// Create store (not 'new Store')
export const store = createStore({ cats: 0, dogs: 0 });

// useStore returns an Accessor - MUST call with () to get value
function Display({ animals }: { animals: "dogs" | "cats" }) {
  const count = useStore(store, (state) => state[animals]);
  return (
    <div>
      {animals}: {count()}
    </div>
  ); // Note: count() not count
}

function Button({ animals }: { animals: "dogs" | "cats" }) {
  return (
    <button
      onClick={() => {
        store.setState((state) => ({
          ...state,
          [animals]: state[animals] + 1,
        }));
      }}
    >
      Increment
    </button>
  );
}

// Use shallow for object/array selectors
import { shallow } from "@tanstack/solid-store";
const items = useStore(todosStore, (state) => state.items, shallow);
```

**Key Solid differences:**

- `useStore` returns an Accessor (signal), must call with `()` to unwrap
- No need to manually mount/cleanup Derived/Effect - Solid handles reactivity
- Store created with `createStore()` not `new Store()`

## Module-Level Store Pattern

```typescript
// stores/counter.ts
import { createStore } from "@tanstack/store";

export const counterStore = createStore(0);

export const doubledCount = createStore(() => counterStore.state * 2);

// Actions as plain functions
export function increment() {
  counterStore.setState((c) => c + 1);
}

export function reset() {
  counterStore.setState(() => 0);
}
```

## Framework Adapters

| Framework | Package                   | Hook/Composable                                     |
| --------- | ------------------------- | --------------------------------------------------- |
| React     | `@tanstack/react-store`   | `useStore(store, selector?, equalityFn?)`           |
| Vue       | `@tanstack/vue-store`     | `useStore(store, selector?)` (returns computed ref) |
| Solid     | `@tanstack/solid-store`   | `useStore(store, selector?)` (returns Accessor)     |
| Angular   | `@tanstack/angular-store` | `injectStore(store, selector?)` (returns signal)    |
| Svelte    | `@tanstack/svelte-store`  | `useStore(store, selector?)` (returns $state)       |

## Best Practices

1. **Define stores at module level** - they're singletons
2. **Use selectors** in `useStore` to prevent unnecessary re-renders
3. **Use `shallow`** when selectors return objects/arrays
4. **Never mutate state directly** - always use `setState`
5. **Use `batch`** for multiple related updates
6. **Use Derived chains** for data transformations (filter -> sort -> paginate)
7. **Return cleanup functions** from Effect `fn` for timers/listeners
8. **Select primitives** when possible (no equality fn needed)
9. **In Solid**, always call `useStore()` result with `()` to unwrap
10. **In React**, manually mount Derived/Effect in useEffect

## Common Pitfalls

- Mutating `store.state` directly instead of using `setState`
- Creating new object references in selectors without `shallow`
- In Solid: forgetting to call `useStore()` result with `()` (returns Accessor)
- In React: not cleaning up subscriptions/unmount functions (memory leaks)

## Low-Level Signal API

For fine-grained reactivity without Store abstraction:

```typescript
import { signal, computed, effect, batch } from "@tanstack/store";

// Create a signal
const count = signal(0);
count(); // get value: 0
count(5); // set value: 5

// Create computed (derived)
const doubled = computed(() => count() * 2);
doubled(); // 10

// Create effect (side effect)
const cleanup = effect(() => {
  console.log("Count is:", count());
  return () => console.log("Cleanup");
});

// Batch updates
batch(() => {
  count(1);
  count(2);
});
```

This is the same underlying implementation used by Store/Derived/Effect.
