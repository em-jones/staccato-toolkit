---
name: tanstack-form
description: Headless, performant, and type-safe form state management for TS/JS, React, Vue, Angular, Solid, Lit, and Svelte.
---


## Overview

TanStack Form is a headless form library with deep TypeScript integration. It provides field-level and form-level validation (sync/async), array fields, linked/dependent fields, fine-grained reactivity, and schema validation via Standard Schema (Zod, Valibot, ArkType, Effect/Schema).

**Package:** `@tanstack/solid-form`
**Devtools:** `@tanstack/solid-form-devtools`, `@tanstack/solid-devtools`
**Status:** Stable (v1)

## Installation

```bash
npm install @tanstack/solid-form solid-js
# Optional devtools:
npm install @tanstack/solid-form-devtools @tanstack/solid-devtools
# Schema libraries (any Standard Schema-compatible library works):
npm install zod
npm install valibot
npm install arktype
```

## Core: createForm

```tsx
import { createForm } from '@tanstack/solid-form'

function App() {
  const form = createForm(() => ({
    defaultValues: {
      firstName: '',
      lastName: '',
    },
    onSubmit: async ({ value }) => {
      // value is fully typed
      console.log(value)
    },
  }))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
    >
      <form.Field
        name="firstName"
        children={(field) => (
          <>
            <label for={field().name}>First Name:</label>
            <input
              id={field().name}
              name={field().name}
              value={field().state.value}
              onBlur={field().handleBlur}
              onInput={(e) => field().handleChange(e.target.value)}
            />
          </>
        )}
      />
      <form.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isSubmitting: state.isSubmitting,
        })}
        children={(state) => (
          <button type="submit" disabled={!state().canSubmit}>
            {state().isSubmitting ? '...' : 'Submit'}
          </button>
        )}
      />
    </form>
  )
}
```

**Solid-specific:** `createForm` takes a *thunk* `() => ({...})` (not a plain object). Field children and Subscribe children receive *accessors* — call `field()` and `state()` to read values.

## Fields (form.Field)

```tsx
import type { AnyFieldApi } from '@tanstack/solid-form'

// Helper component for field errors
function FieldInfo(props: { field: AnyFieldApi }) {
  return (
    <>
      {props.field.state.meta.isTouched && !props.field.state.meta.isValid ? (
        <em>{props.field.state.meta.errors.join(',')}</em>
      ) : null}
      {props.field.state.meta.isValidating ? 'Validating...' : null}
    </>
  )
}

// Usage
<form.Field
  name="firstName"
  validators={{
    onChange: ({ value }) =>
      value.length < 3 ? 'Must be at least 3 characters' : undefined,
  }}
  children={(field) => (
    <>
      <label for={field().name}>First Name</label>
      <input
        id={field().name}
        name={field().name}
        value={field().state.value}
        onBlur={field().handleBlur}
        onInput={(e) => field().handleChange(e.target.value)}
      />
      <FieldInfo field={field()} />
    </>
  )}
/>

<!-- Nested fields use dot notation -->
<form.Field
  name="address.city"
  children={(field) => (
    <input
      value={field().state.value}
      onInput={(e) => field().handleChange(e.target.value)}
      onBlur={field().handleBlur}
    />
  )}
/>
```

**Solid-specific:** Use `onInput` instead of `onChange` for text inputs. Use `for` (not `htmlFor`) on labels. Field children receive an accessor — call `field()` to unwrap.

## Validation

### Validation Timing

| Cause | When |
|-------|------|
| `onChange` | After every value change |
| `onBlur` | When field loses focus |
| `onSubmit` | During submission |
| `onMount` | When field mounts |

### Synchronous Validation

```tsx
<form.Field
  name="age"
  validators={{
    onChange: ({ value }) => {
      if (value < 18) return 'Must be 18 or older'
      return undefined // undefined = valid
    },
    onBlur: ({ value }) => {
      if (!value) return 'Required'
      return undefined
    },
  }}
/>
```

### Asynchronous Validation

```tsx
<form.Field
  name="username"
  validators={{
    onChangeAsyncDebounceMs: 500,
    onChangeAsync: async ({ value }) => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      return value.includes('error') && 'No "error" allowed in username'
    },
  }}
  children={(field) => (
    <>
      <input
        value={field().state.value}
        onInput={(e) => field().handleChange(e.target.value)}
      />
      {field().state.meta.isValidating ? 'Checking...' : null}
    </>
  )}
/>
```

### Schema Validation (Standard Schema)

TanStack Form v1 supports any Standard Schema-compatible library directly — no adapter packages needed.

```tsx
import { z } from 'zod'

const form = createForm(() => ({
  defaultValues: { firstName: '', lastName: '' },
  validators: {
    onChange: z.object({
      firstName: z.string().min(3, 'Must be at least 3 characters').startsWith('A', "Must start with 'A'"),
      lastName: z.string().min(3, 'Must be at least 3 characters'),
    }),
  },
  onSubmit: async ({ value }) => { /* ... */ },
}))
```

Works with Valibot, ArkType, and Effect/Schema too:

```tsx
import * as v from 'valibot'
import { type } from 'arktype'
import { Schema as S } from 'effect'

// Valibot
validators: { onChange: v.object({ firstName: v.pipe(v.string(), v.minLength(3)) }) }

// ArkType
validators: { onChange: type({ firstName: 'string >= 3' }) }

// Effect/Schema
validators: { onChange: S.standardSchemaV1(S.Struct({ firstName: S.String.pipe(S.minLength(3)) })) }
```

When using schema validation, errors include a `.message` property:

```tsx
<em>{props.field.state.meta.errors.map((err) => err.message).join(',')}</em>
```

### Form-Level Validation

```tsx
const form = createForm(() => ({
  defaultValues: { password: '', confirmPassword: '' },
  validators: {
    onChange: ({ value }) => {
      if (value.password !== value.confirmPassword) {
        return 'Passwords do not match'
      }
      return undefined
    },
  },
}))
```

Form-level validation can also return field-specific errors:

```tsx
validators: {
  onChange: ({ value }) => {
    const errors = { fields: {} as Record<string, string> }
    if (!value.fullName) errors.fields.fullName = 'Full name is required'
    if (!value.phone) errors.fields.phone = 'Phone is required'
    return errors
  },
},
```

### Linked/Dependent Fields

```tsx
<form.Field
  name="confirmPassword"
  validators={{
    onChangeListenTo: ['password'],
    onChange: ({ value, fieldApi }) => {
      const password = fieldApi.form.getFieldValue('password')
      if (value !== password) return 'Passwords do not match'
      return undefined
    },
  }}
/>
```

## Array Fields

```tsx
import { Index, Show } from 'solid-js'

<form.Field name="people">
  {(field) => (
    <div>
      <Show when={field().state.value.length > 0}>
        <Index each={field().state.value}>
          {(_, i) => (
            <form.Field name={`people[${i}].name`}>
              {(subField) => (
                <div>
                  <label>
                    <div>Name for person {i}</div>
                    <input
                      value={subField().state.value}
                      onInput={(e) => subField().handleChange(e.currentTarget.value)}
                    />
                  </label>
                </div>
              )}
            </form.Field>
          )}
        </Index>
      </Show>
      <button onClick={() => field().pushValue({ name: '', age: 0 })} type="button">
        Add person
      </button>
    </div>
  )}
</form.Field>
```

**Solid-specific:** Use `<Index>` (not `<For>`) when iterating array fields — this preserves index stability for form field binding.

### Array Methods

```typescript
field().pushValue(item)              // Add to end
field().insertValue(index, item)     // Insert at index
field().replaceValue(index, item)    // Replace at index
field().removeValue(index)           // Remove at index
field().swapValues(indexA, indexB)    // Swap positions
field().moveValue(from, to)          // Move position
```

## Listeners (Side Effects)

```tsx
<form.Field
  name="country"
  listeners={{
    onChange: ({ value }) => {
      form.setFieldValue('state', '')
      form.setFieldValue('postalCode', '')
    },
  }}
/>
```

## Reactivity (form.Subscribe & useStore)

```tsx
// Render-prop subscription (fine-grained)
<form.Subscribe
  selector={(state) => ({ canSubmit: state.canSubmit, isDirty: state.isDirty })}
  children={(state) => (
    <div>
      {state().isDirty && <span>Unsaved changes</span>}
      <button disabled={!state().canSubmit}>Save</button>
    </div>
  )}
/>

// Hook-based subscription with useStore
import { useStore } from '@tanstack/solid-form'

function TextField(props: { label: string }) {
  const field = useFieldContext<string>()
  const errors = useStore(field().store, (state) => state.meta.errors)

  return (
    <div>
      <label>
        <div>{props.label}</div>
        <input
          value={field().state.value}
          onChange={(e) => field().handleChange(e.target.value)}
        />
      </label>
      <For each={errors()}>
        {(error) => <div style={{ color: 'red' }}>{error}</div>}
      </For>
    </div>
  )
}
```

**Solid-specific:** `useStore` returns an accessor. Call `errors()` to read the value. Subscribe children also return accessors — call `state()`.

## Form State

```typescript
interface FormState {
  values: TFormData
  errors: ValidationError[]
  errorMap: Record<string, ValidationError>
  isFormValid: boolean
  isFieldsValid: boolean
  isValid: boolean               // isFormValid && isFieldsValid
  isTouched: boolean
  isPristine: boolean
  isDirty: boolean
  isSubmitting: boolean
  isSubmitted: boolean
  isSubmitSuccessful: boolean
  submissionAttempts: number
  canSubmit: boolean             // isValid && !isSubmitting
}
```

## Field State

```typescript
interface FieldState<TData> {
  value: TData
  meta: {
    isTouched: boolean
    isDirty: boolean
    isPristine: boolean
    isValidating: boolean
    errors: ValidationError[]
    errorMap: Record<ValidationCause, ValidationError>
  }
}
```

## FormApi Methods

```typescript
form.handleSubmit()
form.reset()
form.getFieldValue(field)
form.setFieldValue(field, value)
form.getFieldMeta(field)
form.setFieldMeta(field, updater)
form.validateAllFields(cause)
form.validateField(field, cause)
form.deleteField(field)
```

## Shared Form Options (formOptions)

```tsx
import { formOptions } from '@tanstack/solid-form'

const sharedOpts = formOptions({
  defaultValues: { firstName: '', lastName: '' },
})

// Reuse across components
const form = createForm(() => ({
  ...sharedOpts,
  onSubmit: async ({ value }) => { /* ... */ },
}))
```

## Form Hook API (createFormHook) — Large Forms

For large forms, use `createFormHook` to create reusable, type-safe form components with shared field components and context.

### 1. Create form context

```tsx
// hooks/form-context.tsx
import { createFormHookContexts } from '@tanstack/solid-form'

export const { fieldContext, useFieldContext, formContext, useFormContext } =
  createFormHookContexts()
```

### 2. Create form hook with shared components

```tsx
// hooks/form.tsx
import { createFormHook } from '@tanstack/solid-form'
import { lazy } from 'solid-js'
import { fieldContext, formContext, useFormContext } from './form-context.tsx'

const TextField = lazy(() => import('../components/text-fields.tsx'))

function SubscribeButton(props: { label: string }) {
  const form = useFormContext()
  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <button disabled={isSubmitting()}>{props.label}</button>
      )}
    </form.Subscribe>
  )
}

export const { useAppForm, withForm, withFieldGroup } = createFormHook({
  fieldComponents: { TextField },
  formComponents: { SubscribeButton },
  fieldContext,
  formContext,
})
```

### 3. Use in pages with AppField/AppForm

```tsx
import { useAppForm } from '../../hooks/form.tsx'
import { peopleFormOpts } from './shared-form.tsx'

export const PeoplePage = () => {
  const form = useAppForm(() => ({
    ...peopleFormOpts,
    onSubmit: ({ value }) => alert(JSON.stringify(value, null, 2)),
  }))

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
      <form.AppField
        name="fullName"
        children={(field) => <field.TextField label="Full Name" />}
      />
      <form.AppField
        name="email"
        children={(field) => <field.TextField label="Email" />}
      />
      <form.AppForm>
        <form.SubscribeButton label="Submit" />
      </form.AppForm>
    </form>
  )
}
```

### 4. withForm for type-safe sub-forms

```tsx
import { withForm } from '../../hooks/form.tsx'
import { peopleFormOpts } from './shared-form.tsx'

export const AddressFields = withForm({
  ...peopleFormOpts,
  render: (props) => (
    <div>
      <h2>Address</h2>
      <props.form.AppField
        name="address.line1"
        children={(field) => <field.TextField label="Address Line 1" />}
      />
      <props.form.AppField
        name="address.city"
        children={(field) => <field.TextField label="City" />}
      />
    </div>
  ),
})

// Usage: <AddressFields form={form} />
```

### 5. withFieldGroup for reusable field groups

```tsx
import { withFieldGroup } from '../../hooks/form'

export const FieldGroupEmergencyContact = withFieldGroup({
  defaultValues: { phone: '', fullName: '' },
  render: function Render({ group }) {
    return (
      <>
        <group.AppField
          name="fullName"
          children={(field) => <field.TextField label="Full Name" />}
        />
        <group.AppField
          name="phone"
          children={(field) => <field.TextField label="Phone" />}
        />
      </>
    )
  },
})

// Usage: <FieldGroupEmergencyContact form={form} fields="emergencyContact" />
```

## Devtools

```tsx
import { render } from 'solid-js/web'
import { TanStackDevtools } from '@tanstack/solid-devtools'
import { formDevtoolsPlugin } from '@tanstack/solid-form-devtools'
import App from './app'

render(
  () => (
    <>
      <App />
      <TanStackDevtools plugins={[formDevtoolsPlugin()]} />
    </>
  ),
  document.getElementById('root')!,
)
```

## TypeScript Integration

```tsx
// Type-safe field paths with DeepKeys
interface UserForm {
  name: string
  address: { street: string; city: string }
  tags: string[]
  contacts: Array<{ name: string; phone: string }>
}

// TypeScript auto-completes all valid paths:
<form.Field name="address.city" />     // OK
<form.Field name="nonexistent" />       // Type Error!
```

## Best Practices

1. **Always call `e.preventDefault()` and `e.stopPropagation()`** on form submit
2. **Always attach `onBlur={field().handleBlur}`** for blur validation and isTouched tracking
3. **Use `onInput` for text inputs** — Solid's `onChange` fires on blur, not on every keystroke
4. **Call field accessors** — `field()` not `field` — children receive Solid accessors
5. **Use `<Index>` for array fields** — not `<For>` — to preserve index stability
6. **Pass a thunk to `createForm`** — `createForm(() => ({...}))` not `createForm({...})`
7. **Return `undefined`** (not null/false) for valid validators
8. **Use `onChangeAsyncDebounceMs`** for async validators to prevent API spam
9. **Check `isTouched` before showing errors** for better UX
10. **Use `form.Subscribe` with selectors** to minimize re-renders
11. **Use `formOptions`** for shared configuration across components
12. **Use `createFormHook`** for large forms with reusable field/form components
13. **Use `withForm`/`withFieldGroup`** for type-safe sub-forms and reusable field groups

## Common Pitfalls

- Forgetting `e.preventDefault()` on form submit (causes page reload)
- Not calling field accessor: `field.state` instead of `field().state`
- Using `onChange` instead of `onInput` for text inputs (Solid fires `onChange` on blur)
- Using `htmlFor` instead of `for` on labels (Solid uses native HTML attributes)
- Using `<For>` instead of `<Index>` for array fields (breaks index-based field binding)
- Passing a plain object to `createForm` instead of a thunk
- Returning `null` or `false` instead of `undefined` for valid fields
- Subscribing to entire form state instead of using selectors (unnecessary reactivity)
- Not using `onChangeAsyncDebounceMs` with async validators (fires on every keystroke)
