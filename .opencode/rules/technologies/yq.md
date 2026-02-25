---
created-by-change: legacy
last-validated: 2026-02-25
---

# yq Usage Rules

yq is a lightweight, portable YAML/JSON processor for command-line YAML and JSON manipulation. **Version**: 4.x (or later).

## Table of Contents

- [Core Principles](#core-principles)
- [Key Commands](#key-commands)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Error Handling](#error-handling)
- [Troubleshooting](#troubleshooting)
- [See Also](#see-also)

## Core Principles

1. **Always specify the input file explicitly** — never rely on stdin alone for production scripts
2. **Use `-i` flag for in-place edits** — always backup or use version control
3. **Test expressions with `eval` first** — before applying to production files
4. **Quote expressions** — prevent shell interpretation of special characters
5. **Chain operators carefully** — complex chains can be hard to debug; consider intermediate steps

## Key Commands

```bash
yq eval '<expression>' file.yaml          # Read and output
yq eval -i '<expression>' file.yaml       # In-place modification
yq eval-all '<expression>' file1 file2    # Process multiple files together
```

### Common Operations

```bash
# Read values
yq eval '.spec.replicas' deployment.yaml
yq eval '.metadata.labels | keys' config.yaml
yq eval '.items[] | .metadata.name' list.yaml

# Modify values
yq eval -i '.spec.replicas = 3' deployment.yaml
yq eval -i '.metadata.labels.env = "production"' config.yaml
yq eval -i '.spec.template.spec.containers[0].image = "new:tag"' deployment.yaml

# Delete fields
yq eval -i 'del(.metadata.managedFields)' resource.yaml

# Merge objects
yq eval -i '.spec * {"new": "value"}' file.yaml

# Filter and select
yq eval '.items[] | select(.status.phase == "Running")' pods.yaml
yq eval '.spec.containers[] | select(.name == "main")' deployment.yaml
```

### Output Format Flags

```bash
-o json              # Output as JSON
-o xml               # Output as XML
-o csv               # Output as CSV
-o tsv               # Output as Tab-Separated Values
-M, --no-colors      # Disable colored output
-I, --indent <N>     # Set indentation (default: 2)
```

## Best Practices

**Do:**

- Use full paths from root (e.g., `.spec.template.spec.containers[0]`)
- Quote all expressions with single quotes to prevent shell expansion
- Use `-i` with backups in automation: `cp file.yaml file.yaml.bak && yq eval -i '...' file.yaml`
- Test complex expressions on a sample before applying widely
- Use `eval-all` when order matters across multiple documents

**Don't:**

- Assume YAML structure without validation first
- Use unquoted expressions (shell will interpret `|`, `&`, `$`, etc.)
- Modify files without checking first: `yq eval '...' file` before `-i`
- Mix `eval` and `eval-all` without understanding document handling
- Assume numeric vs string types — use explicit type conversion

## Common Patterns

```bash
# Update with conditional
yq eval '(.items[] | select(.metadata.name == "target")).spec.value = 10' file.yaml

# Extract and transform
yq eval '.items[] | {name: .metadata.name, replicas: .spec.replicas}' deployment.yaml

# Merge multiple files
yq eval-all '.[0] * .[1]' base.yaml overrides.yaml

# Array operations
yq eval '.items |= sort_by(.metadata.name)' file.yaml
yq eval '.items | length' list.yaml

# With Kubernetes: extract image from deployment
yq eval '.spec.template.spec.containers[0].image' k8s/deployment.yaml

# With Kubernetes: update replica count
yq eval -i '.spec.replicas = env(REPLICA_COUNT)' k8s/*.yaml

# With Helm: extract values
yq eval '.values.image.tag' helm/values.yaml
```

## Error Handling

```bash
# Safe navigation with try
yq eval '.spec.selector.try' file.yaml

# Check path existence first
yq eval 'has("spec")' file.yaml

# Validate YAML syntax before processing
yq eval '.' file.yaml > /dev/null && echo "Valid"
```

## Troubleshooting

| Issue                    | Solution                                                        |
| ------------------------ | --------------------------------------------------------------- |
| `bad syntax` error       | Check quote escaping; use single quotes for expressions         |
| Expression doesn't match | Verify path with `yq eval -C '.' file.yaml` (colored output)    |
| Type mismatch            | Use `tonumber`, `tostring`, `type` operators to inspect/convert |
| Multiline values lost    | Use `--preserve-comments` / `--preserve-order` flags if needed  |

## See Also

- [Kubernetes Usage Rules](./k8s.md) - kubectl and k8s tooling (yq integration)
- [Bash Usage Rules](./bash.md) - Shell scripting standards
- [yq Documentation](https://mikefarah.gitbook.io/yq) - Official yq docs
- [yq GitHub](https://github.com/mikefarah/yq)
