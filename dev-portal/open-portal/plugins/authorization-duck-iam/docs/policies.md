# Policy Configuration

## Policy Structure

Policies are defined using the Gentle Duck IAM framework's DSL:

```typescript
interface Policy {
  name: string;
  rules: Rule[];
}

interface Rule {
  effect: "allow" | "deny";
  principal?: Principal;
  action: string | string[];
  resource: string | string[];
  condition?: Condition;
}
```

## Principal Types

### Role-Based

```typescript
{
  principal: {
    role: "admin";
  }
}
```

### User-Based

```typescript
{
  principal: {
    userId: "user-123";
  }
}
```

### Attribute-Based

```typescript
{
  principal: {
    attributes: {
      department: 'engineering',
      level: 'senior'
    }
  }
}
```

## Action Patterns

- `*` - All actions
- `read` - Read operations
- `write` - Write operations
- `delete` - Delete operations
- `portal:read` - Specific service actions

## Resource Patterns

- `*` - All resources
- `portal:*` - All portal resources
- `portal:dashboard` - Specific resource
- `portal:dashboard:123` - Specific resource instance

## Conditions

```typescript
{
  condition: {
    operator: 'and',
    conditions: [
      { field: 'time.hour', operator: 'between', value: [9, 17] },
      { field: 'source.ip', operator: 'in', value: ['10.0.0.0/8'] }
    ]
  }
}
```

## Policy Examples

### Admin Full Access

```typescript
{
  effect: 'allow',
  principal: { role: 'admin' },
  action: '*',
  resource: '*'
}
```

### User Read-Only Portal Access

```typescript
{
  effect: 'allow',
  principal: { role: 'user' },
  action: ['read', 'list'],
  resource: 'portal:*'
}
```

### Time-Based Access Control

```typescript
{
  effect: 'allow',
  principal: { role: 'developer' },
  action: ['read', 'write'],
  resource: 'portal:code-editor',
  condition: {
    field: 'time.hour',
    operator: 'between',
    value: [9, 18]
  }
}
```

## Combining Multiple Policies

```typescript
const policies = [adminPolicy, userPolicy, timeBasedPolicy];

const evaluator = createPolicyEvaluator(policies);
const result = await evaluator.evaluate(context);
```

## Best Practices

- Start with deny-all as default, then explicitly allow
- Use fine-grained resources and actions
- Combine RBAC for coarse-grained access, ABAC for fine-grained control
- Regularly audit policies for least privilege
- Use meaningful policy names and descriptions
