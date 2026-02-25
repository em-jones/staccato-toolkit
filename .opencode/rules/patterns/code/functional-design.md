---
created-by-change: enhance-design-spec-skills-with-rules
last-validated: 2026-02-24
---

# Functional Design Pattern Rules

_Guidance for classifying code by what it does to the world, isolating side effects, keeping data immutable, and layering abstractions by rate of change._

## Core Principle

Every piece of code is one of three things: an **Action** (has side effects — reading/writing external state), a **Calculation** (pure function — same inputs always produce same outputs, no observable effects), or **Data** (inert values). Identify which category each piece of code belongs to. Push Actions to the edges. Keep the core as Calculations and Data.

> "The more of your code that is calculations, the easier it is to test, reuse, and understand." — _Grokking Simplicity_, Ch. 3

## Key Guidelines

### Classify Before You Write

Before writing a function, decide: is this an Action, a Calculation, or Data?

| Category        | Characteristic                            | Examples                                                                  |
| --------------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| **Action**      | Depends on when/how many times it runs    | `sendEmail()`, `readFile()`, `Date.now()`, `Math.random()`                |
| **Calculation** | Pure — output determined solely by inputs | `calculateTotal(items)`, `formatName(first, last)`, `filterActive(users)` |
| **Data**        | Inert values                              | `{ id: 1, name: "Alice" }`, `[1, 2, 3]`                                   |

Actions can call Calculations and use Data. Calculations MUST NOT call Actions. Data is passive.

```typescript
// ✓ Good — Action at the edge, Calculation at the core
async function processOrder(orderId: string): Promise<void> {       // Action
  const order = await db.orders.findById(orderId);                  // Action (read)
  const receipt = buildReceipt(order);                              // Calculation
  const email = formatReceiptEmail(receipt);                        // Calculation
  await emailService.send(email);                                   // Action (write)
}

function buildReceipt(order: Order): Receipt {                      // Calculation
  return {
    total: order.items.reduce((sum, item) => sum + item.price, 0),
    itemCount: order.items.length,
    discount: applyDiscount(order.total, order.memberTier),
  };
}

// ✗ Avoid — Calculation that secretly performs an Action
function buildReceipt(order: Order): Receipt {
  console.log(`Building receipt for ${order.id}`);                  // Action hidden in Calculation
  metrics.increment('receipts_built');                              // Action hidden in Calculation
  return { total: order.items.reduce(...) };
}
```

### Keep Data Immutable

Never mutate objects or arrays in place. Return new values. This makes Calculations safe to call anywhere, cache, or retry.

```typescript
// ✓ Good — returns new array
function addItem(cart: Cart, item: Item): Cart {
  return { ...cart, items: [...cart.items, item] };
}

// ✗ Avoid — mutates the input
function addItem(cart: Cart, item: Item): void {
  cart.items.push(item);
}
```

For deeply nested structures, use structural sharing:

```typescript
// ✓ Good — spread only the changed path
function updateItemQuantity(cart: Cart, itemId: string, qty: number): Cart {
  return {
    ...cart,
    items: cart.items.map((item) => (item.id === itemId ? { ...item, quantity: qty } : item)),
  };
}
```

### Stratified Design: Layer by Rate of Change

Organise code into layers where each layer only calls downward. Lower layers change less frequently, are more general, and have fewer dependencies. Higher layers are more specific and change more often.

```
┌─────────────────────────────────┐
│  Business rules / workflows      │  Changes most often — specific to this product
├─────────────────────────────────┤
│  Domain operations               │  Changes with domain model evolution
├─────────────────────────────────┤
│  Utility / data transformation   │  Changes rarely — general purpose
├─────────────────────────────────┤
│  Language / runtime primitives   │  Never changes
└─────────────────────────────────┘
```

A function at layer N may only call functions at layer N or below. A utility function must not import a business-rule function.

```typescript
// ✓ Good — utility layer has no upward dependency
// utils/array.ts
export function groupBy<T>(items: T[], key: keyof T): Record<string, T[]> { ... }

// domain/order.ts — calls utility layer (downward)
import { groupBy } from '../utils/array';
export function groupOrdersByStatus(orders: Order[]) { return groupBy(orders, 'status'); }

// ✗ Avoid — utility reaching up into business logic
// utils/array.ts
import { applyLoyaltyDiscount } from '../domain/pricing';  // upward dependency
```

### Extract Calculations from Actions

When an Action is hard to test, find the Calculation hiding inside it and extract it.

```typescript
// ✗ Hard to test — logic buried inside an Action
async function chargeCustomer(customerId: string): Promise<void> {
  const customer = await db.customers.findById(customerId);
  const amount = customer.balance * (customer.isPremium ? 0.9 : 1.0);
  if (amount > 0) {
    await paymentGateway.charge(customerId, amount);
  }
}

// ✓ Extracted Calculation — trivially testable
function calculateCharge(balance: number, isPremium: boolean): number {
  return balance * (isPremium ? 0.9 : 1.0);
}

async function chargeCustomer(customerId: string): Promise<void> {
  const customer = await db.customers.findById(customerId);
  const amount = calculateCharge(customer.balance, customer.isPremium);
  if (amount > 0) {
    await paymentGateway.charge(customerId, amount);
  }
}
```

### Timeline Coordination: Make Side Effects Explicit

When multiple Actions must happen in sequence or in parallel, make the timeline explicit. Use explicit queues, pipelines, or orchestration rather than implicit shared mutable state.

```typescript
// ✓ Good — explicit pipeline, each step testable in isolation
const pipeline = [
  validateOrder, // Calculation
  applyDiscounts, // Calculation
  reserveInventory, // Action
  chargePayment, // Action
  sendConfirmation, // Action
];

async function processOrder(order: Order): Promise<void> {
  let state = order;
  for (const step of pipeline) {
    state = await step(state);
  }
}

// ✗ Avoid — shared mutable state coordinating implicit side effects
let processingOrder: Order | null = null;
function startProcessing(order: Order) {
  processingOrder = order;
}
function applyDiscounts() {
  processingOrder!.total *= 0.9;
} // implicit dependency on shared state
```

## Common Issues

**"This function is hard to test because it hits the database"**
→ Find the Calculation inside it. Extract the logic that transforms data into a pure function. Test that function directly. Test the Action with an integration test or a fake.

**"Changing one utility function broke ten unrelated features"**
→ The utility has an upward dependency — it is calling something from a higher layer. Move the caller-specific logic up; keep the utility general.

**"Our state is inconsistent after a failure partway through a workflow"**
→ Make each step return a new state value rather than mutating shared state. Use a transaction or saga pattern for multi-step Actions that must be atomic.

**"I need to read the current time / generate a UUID inside a Calculation"**
→ Inject it as a parameter. `calculateExpiry(issuedAt: Date, ttlSeconds: number)` is a Calculation. `calculateExpiry(ttlSeconds)` that calls `new Date()` internally is an Action.

## See Also

- [Functions Pattern](./functions.md) — function size and side-effect discipline
- [Testing Pattern](./testing.md) — Calculations are trivially unit-testable; push Actions to integration tests
- [Boundaries Pattern](../architecture/boundaries.md) — dependency inversion keeps Actions at the edges
- _Grokking Simplicity_, Eric Normand — Ch. 1–6 (Actions/Calculations/Data), Ch. 8–9 (Stratified Design), Ch. 13–15 (Timeline coordination)
