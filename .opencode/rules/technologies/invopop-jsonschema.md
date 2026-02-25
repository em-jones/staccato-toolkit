---
created-by-change: adopt-koanf-config
last-validated: 2026-02-28
---

# invopop/jsonschema Usage Rules

_`github.com/invopop/jsonschema` generates JSON Schema Draft 2020-12 from Go struct definitions via reflection. It is the standard for schema generation in this platform._

## Core Principle

JSON Schema is generated from Go structs, not maintained as separate files. The struct is the single source of truth. Custom constraints (patterns, enums, etc.) are added via the `JSONSchemaExtend(*jsonschema.Schema)` interface method on the struct, not via struct tags (except for simple cases).

## Setup

```
github.com/invopop/jsonschema
```

Minimal usage:

```go
import "github.com/invopop/jsonschema"

r := &jsonschema.Reflector{AllowAdditionalProperties: false}
schema := r.Reflect(&MyConfig{})
b, _ := json.MarshalIndent(schema, "", "  ")
```

## Key Guidelines

### Property Names

By default, `invopop/jsonschema` uses the `json` struct tag for property names. Always add a `json` tag to ensure predictable schema property names:

```go
// ✓ correct — schema property is "repository"
type Config struct {
    Repository string `json:"repository"`
}

// ✗ incorrect — schema property is "Repository" (capitalized)
type Config struct {
    Repository string
}
```

### Custom Constraints via JSONSchemaExtend

To add custom constraints (patterns, additional validation), implement `JSONSchemaExtend(*jsonschema.Schema)` on the struct type (not pointer receiver):

```go
const gitURLPattern = `^(https://...|git@...)$`

func (MyStruct) JSONSchemaExtend(schema *jsonschema.Schema) {
    prop, ok := schema.Properties.Get("repository")
    if !ok {
        return
    }
    prop.Pattern = gitURLPattern
}
```

Rules:
- Use a named constant for regex patterns — do not embed long regexes in struct tags
- Always guard with `if !ok` when calling `schema.Properties.Get`
- Use value receiver (not pointer) — invopop/jsonschema checks the value type

### Reflector Configuration

```go
r := &jsonschema.Reflector{
    AllowAdditionalProperties: false, // strict: reject unknown keys
}
```

- Set `AllowAdditionalProperties: false` for all platform config structs
- Do NOT set `Anonymous: true` unless the schema will never be referenced by URI

### Schema Output

The `Reflect` method returns a `*jsonschema.Schema`. Marshal it to JSON for storage or transport:

```go
schema := r.Reflect(&Config{})
b, err := json.MarshalIndent(schema, "", "  ")
```

The output includes `$schema` (Draft 2020-12 URI), `$id`, `$ref`, and `$defs` sections.

### Testing

Always test:
1. That the `$schema` field is present in the output
2. That the expected property name exists (lowercase, matching `json` tag)
3. That custom patterns are present on the correct property

```go
func TestSchema(t *testing.T) {
    b, err := config.Schema()
    require.NoError(t, err)
    var m map[string]any
    json.Unmarshal(b, &m)
    assert.NotEmpty(t, m["$schema"])
}
```

## Anti-Patterns

- ✗ Do NOT maintain hand-written `schema.json` files — the Go struct is the source of truth
- ✗ Do NOT use pointer receivers for `JSONSchemaExtend` — invopop/jsonschema uses value type reflection
- ✗ Do NOT embed long regex patterns in struct tags — use named constants
- ✗ Do NOT set `AllowAdditionalProperties: true` for config structs (fails closed)

## References

- [invopop/jsonschema README](https://github.com/invopop/jsonschema)
- [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12/schema)
