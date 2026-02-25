---
created-by-change: adopt-koanf-config
last-validated: 2026-02-28
---

# koanf v2 Usage Rules

_koanf v2 (`github.com/knadh/koanf/v2`) is the multi-source configuration loader for Go services in this platform. It merges YAML files, dotenv files, and environment variables in explicit priority order into typed structs._

## Core Principle

koanf is used for all multi-source config loading. Priority order is always: YAML file (lowest) → dotenv file → environment variables (highest). Each source is a separate `k.Load()` call — never use implicit merging. koanf has no global state, making it safe for use in libraries.

## Setup

Required packages for `go.mod`:

```
github.com/knadh/koanf/v2
github.com/knadh/koanf/providers/file
github.com/knadh/koanf/providers/env/v2
github.com/knadh/koanf/providers/rawbytes
github.com/knadh/koanf/parsers/yaml
github.com/joho/godotenv   # for .env file parsing
```

Minimal usage:

```go
import (
    "github.com/knadh/koanf/parsers/yaml"
    "github.com/knadh/koanf/providers/env/v2"
    "github.com/knadh/koanf/providers/file"
    "github.com/knadh/koanf/v2"
)

k := koanf.New(".")
k.Load(file.Provider("config.yaml"), yaml.Parser())
k.Load(env.Provider(".", env.Opt{}), nil)
var cfg MyConfig
k.Unmarshal("", &cfg)
```

## Key Guidelines

### Struct Tags

Every exported field in a config struct MUST have a `koanf` struct tag:

```go
// ✓ correct
type Config struct {
    Repository string `koanf:"repository"`
}

// ✗ incorrect — koanf falls back to lowercased field name, which is a footgun
type Config struct {
    Repository string
}
```

When the struct is also used for JSON Schema generation (via invopop/jsonschema), add a `json` tag matching the `koanf` tag:

```go
type Config struct {
    Repository string `json:"repository" koanf:"repository"`
}
```

### Load Order (Priority)

Always load in this order — later loads override earlier ones:

```go
k := koanf.New(".")
k.Load(file.Provider(yamlPath), yaml.Parser())   // 1. YAML (lowest)
k.Load(rawbytes.Provider(dotenvBytes), nil)       // 2. dotenv
k.Load(env.Provider(".", envOpt), nil)            // 3. env vars (highest)
```

### Missing Files

Optional config files (YAML, dotenv) MUST be silently ignored if absent. Use `os.Stat` to check before loading:

```go
if _, err := os.Stat(path); !os.IsNotExist(err) {
    k.Load(file.Provider(path), yaml.Parser())
}
```

### Dotenv Loading

koanf does not have a native dotenv provider. Use `joho/godotenv` to parse the `.env` file into a map, then marshal to JSON and load via `rawbytes.Provider`:

```go
envMap, _ := godotenv.Read(".env")
raw, _ := json.Marshal(envMap)
k.Load(rawbytes.Provider(raw), nil)
```

### Environment Variable Key Mapping

Use `env.Opt.TransformFunc` to convert `SCREAMING_SNAKE_CASE` env vars to `dot.separated.keys`:

```go
opt := env.Opt{
    Prefix: "APP_",
    TransformFunc: func(k, v string) (string, any) {
        key := strings.TrimPrefix(k, "APP_")
        return strings.ToLower(strings.ReplaceAll(key, "_", ".")), v
    },
}
k.Load(env.Provider(".", opt), nil)
```

### Error Handling

- A missing file is not an error — check with `os.Stat` before loading
- A malformed file (bad YAML syntax, invalid dotenv) MUST return an error — do not silently skip parse failures
- Wrap errors with context: `fmt.Errorf("config: load YAML %q: %w", path, err)`

## Anti-Patterns

- ✗ Do NOT use `koanf.New("_")` as delimiter — use `"."` for dot-separated nested keys
- ✗ Do NOT share a `koanf.Koanf` instance across goroutines without synchronization
- ✗ Do NOT call `k.Load` after `k.Unmarshal` — always unmarshal once after all loads are complete
- ✗ Do NOT use viper — koanf is the platform standard

## References

- [koanf v2 README](https://github.com/knadh/koanf)
- [env/v2 provider docs](https://pkg.go.dev/github.com/knadh/koanf/providers/env/v2)
- [file provider docs](https://pkg.go.dev/github.com/knadh/koanf/providers/file)
