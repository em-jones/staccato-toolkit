# Staccato CLI

The Staccato CLI is the user-facing command-line interface for the Staccato Toolkit. It provides
commands to interact with the system, trigger workflows, and manage configurations.

## Examples

    ```bash
    $ st --help
    Usage: st [action] [resource] [options]
    Mode: developer
    Basic Commands (Beginner):
      use hello-world      Run the hello world example tool - alias `st hello-world`

    Basic Commands (Intermediate):
      get [resource] [(resource_name)] -- retrieve information about a resource or list of resources
      edit [resource] [resource_name] -- opens the resource in an editor for modification

    Persona Management:
      get personas           List available personas and their descriptions
      set persona [persona]  Switch to a different persona, changing available commands and tools
      show persona [persona] Display the currently active persona and its description

    RBAC Management:
      get roles              List available roles and their descriptions
      get permissions        List permissions associated with the current user or a specified role
      assign role [role]     Assign a role to the current user, granting access to associated commands and tools

    $ st cluster-tui
    Launching k9s... # in the background, check that devbox is installed, install k9s if necessary, then launch it

    $ st get capabilities --all
    +-----------------+----------------+----------------------------------+
    | Tool            | Description    | Status       | Name              |
    +-----------------+----------------+----------------------------------+
    | cluster-tui     | Kubernetes TUI | Available    | k9s               |


    $ st --help
    Usage: st [action] [resource] [options]
    Commands:
        list tools List available tools and their status
        cluster-tui      Launch Kubernetes TUI (k9s) *now available*

    $ st set persona platform-operator
    Persona switched to platform-operator

    $ st --help
    Usage: st [command] [options]
    Persona: platform-operator
    Commands:
        list tools         List available tools and their status
        add-capability     Add a new capability to your platform
    $ st get capabilities
    +-----------------+----------------------------------+--------------+--------------+
    | Capability      | Description                      | Status       | Version      |
    +-----------------+----------------------------------+--------------+--------------+
    | idp             | Dev Portal                       |              | Unavailable  |

    $ st show capability idp

    Capability: idp
    Description: Dev Portal
    Status: Unavailable
    Version: N/A
    Required tools: None
    Required configuration: None
    Documentation: https://staccato-toolkit.dev/capabilities/idp
    Unblocks: olly-dashboard, techdocs, software-catalog, etc.

    $ st add capability idp

    $ st set-persona dev
    Mode switched to platform-operator
    $ st --help
    Usage: st [command] [options]
    Mode: platform-operator
    Commands:
        list tools         List available tools and their status
        catalog            Interact with software catalog

    $ st list tools --all

    +-----------------+---------------------------+-----------------------------------------+
    | Tool            | Description               | Status     | Name                       |
    +-----------------+---------------------------+-----------------------------------------+
    | cluster-tui     | Kubernetes TUI            | Available  | k9s                        |
    | catalog         | Sofwtware Catalog tooling | Available  | backstage software catalog |

    ```

## Module

```
src/staccato-toolkit/cli
github.com/staccato-toolkit/cli
```

## Requirements

- **CLI entrypoint and command structure** — the `main` package initialises and executes the CLI
  application. Running the compiled binary displays usage information or help and exits without a
  panic.
- **Module configuration** — `go.mod` declares module path `github.com/staccato-toolkit/cli` and a
  Go version compatible with the workspace `go.work`.

## Building

From the repo root (Go workspace):

```bash
go build ./src/staccato-toolkit/cli/...
```

Or from the module directory:

```bash
cd src/staccato-toolkit/cli
go build ./...
```

## Testing

```bash
go test ./src/staccato-toolkit/cli/...
```

## Related

- [Staccato Core](../../core/docs/index.md) — business logic and interfaces consumed by the CLI
- [Staccato Server](../../server/docs/index.md) — companion API server
- [Platform Workloads](../../../ops/workloads/docs/index.md) — CI/CD pipeline
