---
name: cli-developer
description: Expert guidance for designing and implementing CLI tools. Use command structure modeled after kubectl for consistency and familiarity.
compatibility: Language-agnostic. Applicable to any CLI tool implementation.
metadata:
  maturity: early
---

# CLI Developer Skill

This skill provides guidance for designing and implementing command-line interfaces (CLIs) that follow established patterns from widely-used tools like `kubectl`.

## Progressive CLI Philosophy

Modern CLIs should be **progressive**: commands and features become available based on the current system state. This adapts the interface to user permissions, installed plugins, and feature availability—providing a streamlined, contextual experience.

**Key Benefits:**
- Users only see commands they can execute (based on RBAC/permissions)
- New features don't clutter the interface until they're installed or enabled
- Help output is concise and relevant to the user's capabilities
- Reduces cognitive load for users with restricted access

### Example: Progressive Feature Availability

```bash
# Basic user sees core commands
td help
# output:
# COMMANDS:
#   get       Retrieve a resource
#   list      List resources
#   describe  Show details

# Admin user sees additional commands
td help
# output:
# COMMANDS:
#   get       Retrieve a resource
#   list      List resources
#   describe  Show details
#   create    Create a new resource
#   update    Modify a resource
#   delete    Remove a resource
#   admin     Administrative operations

# With observability plugin installed:
td help
# output:
# COMMANDS:
#   ...
#   observe   Observability and monitoring (plugin)
#   metrics   View resource metrics (plugin)
```

## Core Principles

### Command Structure Model: kubectl

All CLI commands should follow the kubectl verb-resource pattern to provide a familiar, predictable interface:

```
<command> <verb> <resource> [options] [arguments]
```

**Examples:**
```bash
td get change my-feature
td list issues --status open
td create proposal --name "add-auth"
td delete task abc123
td update config --key value
td describe resource-type resource-name
```

### Verbs

Standard verbs (following kubectl conventions):

- **`get`** — Retrieve a single resource
- **`list`** — Retrieve multiple resources
- **`create`** — Create a new resource
- **`update`** — Modify an existing resource
- **`delete`** — Remove a resource
- **`describe`** — Show detailed information about a resource
- **`apply`** — Create or update a resource declaratively
- **`patch`** — Apply partial updates to a resource

### Resources

Resources are entities your CLI manages (e.g., `change`, `issue`, `task`, `proposal`):

```bash
td get change
td list issues
td describe task
```

### Options and Flags

Standard flag patterns:

- **`--output` / `-o`** — Output format (`json`, `yaml`, `table`)
- **`--filter` / `-f`** — Filter results
- **`--sort`** — Sort by field
- **`--limit`** — Limit number of results
- **`--namespace` / `-n`** — Scoped namespace
- **`--verbose` / `-v`** — Increase verbosity
- **`--dry-run`** — Preview without executing

## Progressive Feature Design

### Feature Availability Rules

**Commands visibility based on context:**

1. **RBAC/Permissions** — Hide commands user lacks permission to execute
   ```bash
   # User without admin role won't see delete/create/update in help
   td help
   ```

2. **Installed Plugins** — Show only commands from loaded plugins
   ```bash
   # Observability plugin adds commands only if installed
   td observe metrics
   td observe traces
   ```

3. **Feature Flags** — Enable/disable commands based on environment
   ```bash
   # Experimental features hidden unless enabled
   export TD_ENABLE_EXPERIMENTAL=true
   td help  # Now includes experimental commands
   ```

**Implementation pattern:**

```go
// Pseudo-code for progressive command registration
func registerCommands(cli *CLI) {
    cli.Register(coreVerbs...)  // Always available: get, list, describe
    
    if user.HasPermission("create") {
        cli.Register(createCmd)
    }
    
    if user.HasPermission("update") {
        cli.Register(updateCmd)
    }
    
    if user.HasPermission("admin") {
        cli.Register(adminCmd)
    }
    
    for _, plugin := range loadedPlugins {
        cli.Register(plugin.Commands()...)
    }
}
```

### Help Verbosity Implementation

```go
// Help respects user's verbosity preference
func (c *Command) Help(verbosity int) string {
    help := c.BasicUsage()
    
    if verbosity >= 1 {
        help += "\n" + c.DetailedDescription()
        help += "\n" + c.AllOptions()
        help += "\n" + c.Examples()
    }
    
    if verbosity >= 2 {
        help += "\n" + c.AdvancedUsage()
        help += "\n" + c.Troubleshooting()
        help += "\n" + c.RelatedCommands()
    }
    
    return help
}
```

## Design Rules

### 1. Consistent Argument Order

```bash
# Good: verb, resource, name, options
td get change my-feature --output json

# Avoid: inconsistent ordering
td get --output json change my-feature
```

### 2. Subcommand Grouping

Group related commands under subcommands:

```bash
td config get key
td config set key value
td config list

td session list
td session switch id
```

### 3. Output Formats

Always support multiple output formats:

```bash
td list issues                    # Default: human-readable table
td list issues --output json      # JSON for parsing
td list issues --output yaml      # YAML for editing
td list issues -o table           # Explicit table format
```

### 4. Error Handling

- Exit with status code 0 on success
- Exit with non-zero status on error (typically 1)
- Print errors to stderr, not stdout
- Include actionable error messages

```bash
# Error message format
<command>: <error message>
<command>: <suggestion for fix>
```

### 5. Help and Documentation with Verbosity Levels

Every command must provide help with configurable verbosity:

```bash
td help              # General help (default verbosity)
td help -v           # Verbose help with detailed explanations
td help -vv          # Very verbose: includes examples, advanced options, troubleshooting

td help change       # Help for specific resource
td get --help        # Help for specific command
td get -h            # Short form

# Help with different verbosity levels
td get --help               # Basic: usage, synopsis, common options
td get --help -v            # Verbose: detailed descriptions, all options
td get --help -vv           # Very verbose: examples, tips, related commands
```

**Help output structure:**

- **Level 0 (default):** Brief description, basic usage, common flags
- **Level 1 (`-v`):** Full descriptions, all flags, examples
- **Level 2 (`-vv`):** Everything + advanced usage, troubleshooting, related commands

Help should include:
- Brief description
- Usage examples (more detailed at higher verbosity)
- Available options (filtered by user permissions and feature availability)
- Related commands
- Advanced usage notes (at higher verbosity levels)

## Common Patterns

### Filtering and Selection

```bash
# Filter by field
td list issues --filter status=open

# Multiple filters (AND)
td list issues --filter status=open --filter priority=high

# Use structured output with jq for complex filtering
td list issues --output json | jq '.[] | select(.status == "open")'
```

### Pagination

```bash
# Limit results
td list issues --limit 10

# Offset for pagination
td list issues --offset 20 --limit 10
```

### Resource Identification

Resources can be identified by:
- Name: `td get change my-feature`
- ID: `td get change abc123`
- Selector/label: `td get changes --selector app=platform`

### Declarative vs. Imperative

Offer both modes:

```bash
# Imperative: direct commands
td create issue --title "Bug" --description "..."

# Declarative: from file
td apply -f issue.yaml
```

## Implementation Checklist

**Core functionality:**
- [ ] Define verbs for your CLI (get, list, create, update, delete, describe, apply, patch)
- [ ] Define resources your CLI manages
- [ ] Use stderr for errors, stdout for output
- [ ] Implement consistent error messages

**Progressive feature system:**
- [ ] Implement permission checks (RBAC) for sensitive commands
- [ ] Create plugin system for optional features
- [ ] Conditionally register commands based on user permissions
- [ ] Support feature flags for experimental features
- [ ] Validate that unavailable commands fail gracefully

**Help and documentation:**
- [ ] Implement `--help` for all commands
- [ ] Support help verbosity levels (`-v`, `-vv`)
- [ ] Filter help output based on available commands
- [ ] Show only permitted commands in help
- [ ] Add examples in verbose help (`-v` and above)
- [ ] Include advanced usage tips at highest verbosity (`-vv`)

**Standard flags and output:**
- [ ] Support `--output` flag with json, yaml, table formats
- [ ] Version your CLI: `<command> version`
- [ ] Support `--version` flag
- [ ] Document all commands and options

**Configuration:**
- [ ] Support config files (`~/.config/<command>/config.yaml`)
- [ ] Allow help verbosity to be configured globally
- [ ] Support permission/role configuration

## Related Patterns

- **Structured Data**: Use `jq` for JSON parsing, `yq` for YAML
- **Observability**: Include `--debug` / `--verbose` flags for troubleshooting
- **Configuration**: Support both flags and config files (`~/.config/<command>/config.yaml`)
