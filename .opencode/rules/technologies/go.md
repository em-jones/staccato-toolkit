---
created-by-change: technology-audit
last-validated: 2026-02-27
---

# Go Usage Rules

Comprehensive rules for Go development in this platform, covering HTTP routing, CLI development, PWA development, observability initialization, testing, and linting.

## Table of Contents

- [Chi (HTTP Router)](#chi-http-router)
   - [Core Principle](#core-principle)
   - [Setup](#setup)
   - [Key Guidelines](#key-guidelines)
   - [Common Issues](#common-issues)
- [Cobra (CLI Framework)](#cobra-cli-framework)
   - [Core Principle](#core-principle-2)
   - [Setup](#setup-2)
   - [Key Guidelines](#key-guidelines-2)
   - [Common Issues](#common-issues-2)
- [Bubble Tea v2 (TUI Framework)](#bubble-tea-v2-tui-framework)
   - [Core Principle](#core-principle-3)
   - [Setup](#setup-3)
   - [Architecture Pattern](#architecture-pattern)
   - [Key Guidelines](#key-guidelines-3)
   - [Logging in TUI Applications](#logging-in-tui-applications)
   - [Common Issues](#common-issues-3)
- [go-app v10 (PWA Framework)](#go-app-v10-pwa-framework)
   - [Core Principle](#core-principle-4)
   - [Setup](#setup-4)
   - [Key Guidelines](#key-guidelines-4)
   - [Component Development](#component-development)
   - [WASM Compilation](#wasm-compilation)
   - [HTTP Server Setup](#http-server-setup)
   - [Common Issues](#common-issues-4)
- [Service Defaults (Observability)](#service-defaults-observability)
   - [Core Principle](#core-principle-1)
   - [Setup](#setup-1)
   - [Key Guidelines](#key-guidelines-1)
   - [Migration from telemetry.InitTelemetry()](#migration-from-telemetryinit-telemetry)
   - [Pattern Conformance](#pattern-conformance)
   - [Common Issues](#common-issues-1)
- [Testing](#testing)
   - [Usage Standards](#usage-standards)
   - [Example](#example)
- [golangci-lint](#golangci-lint)
   - [Usage Standards](#usage-standards-1)
   - [Configuration](#configuration)
- [See Also](#see-also)

---

## Chi (HTTP Router)

Chi is a lightweight, idiomatic, and composable router for building Go HTTP services. It is the **standard HTTP router** for all Go services in this platform. Chi is 100% compatible with the Go stdlib `net/http` package.

### Core Principle

All Go HTTP services MUST use chi (`github.com/go-chi/chi/v5`) for routing. Chi provides essential routing features (path parameters, route grouping, middleware composition) while maintaining full stdlib compatibility via `http.Handler` interface.

### Setup

```go
// go.mod
require (
    github.com/go-chi/chi/v5 v5.2.5
    github.com/go-chi/chi/v5/middleware v5.2.5  // optional: chi's standard middleware
)
```

Create a basic chi router:

```go
import (
    "net/http"
    "github.com/go-chi/chi/v5"
    "github.com/go-chi/chi/v5/middleware"
)

func main() {
    r := chi.NewRouter()

    // Add standard middleware
    r.Use(middleware.RequestID)
    r.Use(middleware.RealIP)
    r.Use(middleware.Logger)
    r.Use(middleware.Recoverer)

    // Register routes
    r.Get("/", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("welcome"))
    })

    http.ListenAndServe(":3000", r)
}
```

### Key Guidelines

#### Routing: Register routes with HTTP method functions

Chi provides method-specific functions: `Get()`, `Post()`, `Put()`, `Patch()`, `Delete()`, `Head()`, `Options()`.

```go
// ✓ Good: Use method-specific functions
r.Get("/users", listUsers)
r.Post("/users", createUser)
r.Get("/users/{id}", getUser)
r.Put("/users/{id}", updateUser)
r.Delete("/users/{id}", deleteUser)

// ✗ Avoid: Using generic Handle() for standard HTTP methods
r.Handle("/users", http.HandlerFunc(listUsers))
```

#### Routing: Extract path parameters with chi.URLParam

Chi captures path parameters in curly braces `{param}`. Extract with `chi.URLParam(r, "param")`.

```go
// ✓ Good: Extract path parameters
r.Get("/users/{id}", func(w http.ResponseWriter, r *http.Request) {
    userID := chi.URLParam(r, "id")
})

// ✗ Avoid: Manual path parsing
r.Get("/users/*", func(w http.ResponseWriter, r *http.Request) {
    parts := strings.Split(r.URL.Path, "/")
    userID := parts[len(parts)-1]  // Fragile!
})
```

#### Routing: Group routes with r.Route() for API versioning

```go
// ✓ Good: Group routes by API version
r.Route("/api/v1", func(r chi.Router) {
    r.Get("/users", listUsersV1)
    r.Post("/users", createUserV1)

    r.Route("/users/{id}", func(r chi.Router) {
        r.Get("/", getUserV1)
        r.Put("/", updateUserV1)
        r.Delete("/", deleteUserV1)
    })
})
```

#### Middleware: Apply with r.Use() and r.With()

```go
// ✓ Good: Apply middleware globally
r.Use(middleware.RequestID)
r.Use(middleware.Logger)
r.Use(middleware.Recoverer)

// ✓ Good: Apply middleware to specific routes
r.With(requireAuth).Get("/admin", adminHandler)

// ✓ Good: Apply middleware to route groups
r.Route("/admin", func(r chi.Router) {
    r.Use(requireAuth)
    r.Get("/users", listUsers)
})
```

**Middleware execution order**: Place global middleware (RequestID, Logger, Recoverer) first, then OTel tracing, then authentication.

#### Middleware: Standard custom middleware pattern

```go
// ✓ Good: Standard chi middleware pattern
func MyMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Before handler
        next.ServeHTTP(w, r)
        // After handler
    })
}
```

#### OTel Integration: Use otelhttp.NewHandler for tracing

```go
import "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"

// ✓ Good: OTel middleware order
r.Use(middleware.RequestID)
r.Use(middleware.Logger)
r.Use(middleware.Recoverer)
r.Use(func(next http.Handler) http.Handler {
    return otelhttp.NewHandler(next, "my-service")
})
r.Use(authMiddleware)  // Traced
```

#### Testing: Use httptest with chi handlers

```go
func TestGetUser(t *testing.T) {
    r := chi.NewRouter()
    r.Get("/users/{id}", getUser)

    req := httptest.NewRequest("GET", "/users/123", nil)
    rec := httptest.NewRecorder()

    r.ServeHTTP(rec, req)

    if rec.Code != http.StatusOK {
        t.Errorf("expected 200, got %d", rec.Code)
    }
}
```

### Common Issues

**"Path parameters not extracted correctly"**
→ Use curly braces `{param}`, not colons `:param`. Use `chi.URLParam(r, "param")`.

**"Middleware not executing in expected order"**
→ Middleware executes in registration order. Place RequestID, Logger, Recoverer first, then OTel.

**"404 for routes that should match"**
→ Chi treats `/users` and `/users/` as different routes. Use `r.Use(middleware.StripSlashes)` to normalize.

**"Middleware applied to all routes when it should only apply to some"**
→ Use `r.With()` for route-specific or `r.Route()` for group-scoped middleware.

---

## Cobra (CLI Framework)

Cobra is a powerful library for building modern CLI applications in Go. It provides an intuitive command structure, automatic help generation, shell completion, and POSIX-compliant flags. Cobra is the **standard CLI framework** for all command-line applications in this platform.

### Core Principle

All Go CLI applications MUST use Cobra (`github.com/spf13/cobra`) for command structure and argument parsing. Cobra provides essential CLI features (subcommands, flags, help generation, shell completion) while maintaining idiomatic Go patterns. CLI applications SHOULD use `cobra-cli` generator to bootstrap project structure.

### Setup

```go
// go.mod
require (
    github.com/spf13/cobra v1.8.1
)
```

Install cobra-cli for scaffolding (optional but recommended):

```bash
go install github.com/spf13/cobra-cli@latest
cobra-cli init my-cli
cobra-cli add mycommand
```

Create a basic Cobra application:

```go
import (
    "fmt"
    "github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
    Use:   "myapp",
    Short: "A brief description of your application",
    Run: func(cmd *cobra.Command, args []string) {
        fmt.Println("myapp executed")
    },
}

func main() {
    if err := rootCmd.Execute(); err != nil {
        fmt.Println(err)
        os.Exit(1)
    }
}
```

### Key Guidelines

#### Command Structure: Use subcommands for logical grouping

Organize commands hierarchically to match user workflows. Commands represent actions (verbs), arguments represent objects (nouns).

```go
// ✓ Good: Logical command hierarchy
// myapp server start
// myapp server stop
// myapp config set key value
var serverCmd = &cobra.Command{
    Use:   "server",
    Short: "Manage the server",
}

var startCmd = &cobra.Command{
    Use:   "start",
    Short: "Start the server",
    Run: func(cmd *cobra.Command, args []string) {
        // Start server
    },
}

func init() {
    rootCmd.AddCommand(serverCmd)
    serverCmd.AddCommand(startCmd)
}

// ✗ Avoid: Flat structure with confusing naming
// myapp startserver
// myapp stopserver
// myapp setconfigkey value
```

#### Flags: Use persistent flags for global options, local flags for command-specific

Persistent flags are inherited by all subcommands. Local flags apply only to the command where they're defined.

```go
// ✓ Good: Global flags on root command
var verbose bool
rootCmd.PersistentFlags().BoolVarP(&verbose, "verbose", "v", false, "Enable verbose output")

// ✓ Good: Command-specific flags
var port int
startCmd.Flags().IntVarP(&port, "port", "p", 8080, "Port to listen on")

// ✗ Avoid: Repeating flags across multiple commands when they should be persistent
```

#### Flags: Use POSIX-compliant short and long names

Short flags are single-character (`-v`), long flags are descriptive (`--verbose`). Always provide both.

```go
// ✓ Good: POSIX-compliant flags
cmd.Flags().BoolVarP(&verbose, "verbose", "v", false, "Enable verbose output")
cmd.Flags().StringVarP(&output, "output", "o", "", "Output file")
cmd.Flags().IntVarP(&workers, "workers", "w", 4, "Number of workers")

// ✗ Avoid: Long names only or inconsistent naming
cmd.Flags().BoolVar(&verbose, "v", false, "Enable verbose output")
cmd.Flags().StringVar(&output, "outputfile", "", "Output file")  // Inconsistent
```

#### Arguments: Use Args for positional arguments with validation

Cobra provides built-in validators for argument counts. Use `cobra.ExactArgs`, `cobra.MinimumNArgs`, `cobra.MaximumNArgs`.

```go
// ✓ Good: Validate argument count
var copyCmd = &cobra.Command{
    Use:   "copy SRC DST",
    Short: "Copy a file",
    Args:  cobra.ExactArgs(2),
    Run: func(cmd *cobra.Command, args []string) {
        src, dst := args[0], args[1]
        // Copy src to dst
    },
}

// ✗ Avoid: Manual argument validation
var copyCmd = &cobra.Command{
    Use:   "copy",
    Run: func(cmd *cobra.Command, args []string) {
        if len(args) != 2 {
            fmt.Println("error: copy requires exactly 2 arguments")
            return
        }
        // Copy logic
    },
}
```

#### Help and Usage: Customize with Short and Long descriptions

Cobra auto-generates help from command metadata. Provide clear, concise descriptions.

```go
// ✓ Good: Clear descriptions
var deployCmd = &cobra.Command{
    Use:   "deploy [flags]",
    Short: "Deploy the application to production",
    Long: `Deploy the application to the specified environment.

This command builds the application, runs tests, and pushes to the target environment.
Use --dry-run to preview changes without applying them.`,
    Run: func(cmd *cobra.Command, args []string) {
        // Deploy logic
    },
}
```

#### Shell Completion: Enable for bash, zsh, fish, and powershell

Cobra provides automatic completion generation. Enable in your application.

```go
// ✓ Good: Enable shell completion
func init() {
    rootCmd.AddCommand(completionCmd)
    rootCmd.CompletionOptions.DisableDefaultCmd = false
}

// Generate completions: myapp completion bash | source
// zsh: myapp completion zsh | source
// fish: myapp completion fish | source
// powershell: myapp completion powershell | Out-String | Invoke-Expression
```

#### Testing: Use Command.Execute() with output capture

Test CLI commands by executing them and capturing output.

```go
// ✓ Good: Test command execution
func TestHelloCommand(t *testing.T) {
    cmd := &cobra.Command{
        Use:   "hello",
        Run: func(cmd *cobra.Command, args []string) {
            cmd.Println("hello world")
        },
    }
    
    output, err := executeCommand(cmd)
    if err != nil {
        t.Errorf("unexpected error: %v", err)
    }
    if !strings.Contains(output, "hello world") {
        t.Errorf("expected 'hello world' in output, got: %s", output)
    }
}

func executeCommand(cmd *cobra.Command, args ...string) (string, error) {
    cmd.SetArgs(args)
    buf := new(bytes.Buffer)
    cmd.SetOut(buf)
    cmd.SetErr(buf)
    err := cmd.Execute()
    return buf.String(), err
}
```

#### Integration with observability: Use slog for CLI logging

CLI applications should use structured logging via `slog.Default()` for consistency.

```go
// ✓ Good: Structured logging in CLI
var verboseCmd = &cobra.Command{
    Use:   "verbose-action",
    Run: func(cmd *cobra.Command, args []string) {
        slog.Info("executing action", "args", args)
        // Action logic
        slog.Info("action completed successfully")
    },
}

// ✗ Avoid: fmt.Println for logging
var verboseCmd = &cobra.Command{
    Use:   "verbose-action",
    Run: func(cmd *cobra.Command, args []string) {
        fmt.Println("Executing action")  // Not structured
        // Action logic
    },
}
```

### Common Issues

**"Help text is not generated automatically"**
→ Set `Short` and `Long` fields on your `cobra.Command`. Cobra auto-generates help from these.

**"Subcommand not recognized"**
→ Use `parentCmd.AddCommand(childCmd)` to register subcommands. Ensure command names match the `Use` field.

**"Flags not inherited by subcommands"**
→ Use `PersistentFlags()` for global flags, not `Flags()`. Persistent flags are inherited by all subcommands.

**"Shell completion not working"**
→ Run `myapp completion bash > /etc/bash_completion.d/myapp` and source it. Ensure `CompletionOptions.DisableDefaultCmd` is false.

**"Arguments and flags mixed incorrectly"**
→ Flags must come before arguments: `myapp command --flag value arg1 arg2`. Use `cmd.SetArgs()` in tests to control order.

---

## Bubble Tea v2 (TUI Framework)

Bubble Tea is a Go framework for building terminal user interfaces (TUIs) using the Elm Architecture pattern. It provides a functional, stateful approach to building interactive terminal applications with first-class support for keyboard, mouse, and clipboard events.

### Core Principle

Bubble Tea applications follow the Elm Architecture: a unidirectional data flow where the Model represents application state, Init provides initial state and commands, Update handles messages and state mutations, and View renders the UI. This architecture ensures predictability and testability.

> All TUI applications using Bubble Tea v2 (`charm.land/bubbletea/v2`) SHALL implement the Model/Init/Update/View pattern. No ad-hoc event handling or global state.

### Setup

#### Dependency Declaration

Add Bubble Tea v2 to your `go.mod`:

```bash
go get charm.land/bubbletea/v2@v2.0.0
```

Or manually in `go.mod`:

```
require charm.land/bubbletea/v2 v2.0.0
```

#### Minimal Application Structure

```go
package main

import (
    "fmt"
    "os"
    tea "charm.land/bubbletea/v2"
)

type model struct {
    // Application state goes here
}

func (m model) Init() tea.Cmd {
    return nil
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    return m, nil
}

func (m model) View() tea.View {
    return tea.NewView("Hello, World!")
}

func main() {
    p := tea.NewProgram(model{})
    if _, err := p.Run(); err != nil {
        fmt.Fprintf(os.Stderr, "Error: %v\n", err)
        os.Exit(1)
    }
}
```

### Architecture Pattern

#### Model

The Model is a struct that holds all application state. It must implement `tea.Model` by providing Init, Update, and View methods.

✓ **Good**: Model contains all state needed to render the view
```go
type model struct {
    items    []string
    cursor   int
    selected map[int]bool
    loading  bool
}
```

✗ **Avoid**: Storing state outside the model
```go
var globalCursor int  // Never do this
var globalItems []string
```

#### Init Method

Init returns the initial command to run. It is called once when the program starts.

✓ **Good**: Fetch initial data with a command
```go
func (m model) Init() tea.Cmd {
    return tea.Batch(
        fetchData(),
        subscribeToEvents(),
    )
}
```

✗ **Avoid**: Blocking I/O in Init
```go
func (m model) Init() tea.Cmd {
    data := fetchDataBlocking()  // Never block
    m.data = data
    return nil
}
```

#### Update Method

Update handles all messages (keypresses, timer ticks, I/O results) and returns an updated model and optional command.

✓ **Good**: Type-switch on message types and update state
```go
func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case tea.KeyPressMsg:
        switch msg.String() {
        case "q", "ctrl+c":
            return m, tea.Quit
        case "down":
            if m.cursor < len(m.items)-1 {
                m.cursor++
            }
        }
    case dataFetchedMsg:
        m.items = msg.items
        m.loading = false
    }
    return m, nil
}
```

✗ **Avoid**: Performing I/O directly in Update
```go
func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    if key, ok := msg.(tea.KeyPressMsg); ok {
        if key.String() == "enter" {
            data := httpRequest()  // Never do this
            m.data = data
        }
    }
    return m, nil
}
```

#### View Method

View renders the current state as a string. It is called after every Update and should be pure (no side effects).

✓ **Good**: Pure function that renders based on state
```go
func (m model) View() tea.View {
    var s string
    for i, item := range m.items {
        if i == m.cursor {
            s += "> " + item + "\n"
        } else {
            s += "  " + item + "\n"
        }
    }
    return tea.NewView(s)
}
```

✗ **Avoid**: Side effects in View
```go
func (m model) View() tea.View {
    saveToFile(m.items)  // Never do this
    return tea.NewView(fmt.Sprintf("%v", m.items))
}
```

#### Message Types

Define custom message types to communicate between Update and commands.

✓ **Good**: Typed messages for different events
```go
type dataFetchedMsg struct {
    items []string
    err   error
}

type tickMsg struct{}

func fetchData() tea.Cmd {
    return func() tea.Msg {
        items, err := getItems()
        return dataFetchedMsg{items, err}
    }
}
```

✗ **Avoid**: Untyped or string-based messages
```go
func fetchData() tea.Cmd {
    return func() tea.Msg {
        return "data_fetched"  // Too vague
    }
}
```

### Key Guidelines

#### Keyboard Input Handling

Handle keyboard input in the Update method by type-asserting `tea.KeyPressMsg`.

✓ **Good**: Explicit key handling with early returns
```go
case tea.KeyPressMsg:
    switch msg.String() {
    case "q", "ctrl+c":
        return m, tea.Quit
    case "up", "k":
        if m.cursor > 0 {
            m.cursor--
        }
    case "down", "j":
        if m.cursor < len(m.items)-1 {
            m.cursor++
        }
    case "enter":
        return m, selectItem(m.items[m.cursor])
    }
```

✗ **Avoid**: Nested conditionals and unclear key names
```go
if msg.Rune == 'q' { return m, tea.Quit }
```

#### Commands and Asynchronous Operations

Commands are functions that return messages. Use `tea.Batch` to run multiple commands concurrently.

✓ **Good**: Structured async operations with typed messages
```go
type fetchCompleteMsg struct {
    data []Item
    err  error
}

func fetchItems() tea.Cmd {
    return func() tea.Msg {
        data, err := apiCall()
        return fetchCompleteMsg{data, err}
    }
}

func (m model) Init() tea.Cmd {
    return fetchItems()
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case fetchCompleteMsg:
        if msg.err != nil {
            m.err = msg.err
        } else {
            m.items = msg.data
        }
    }
    return m, nil
}
```

✗ **Avoid**: Global state or unbounded goroutines
```go
func fetchItems() tea.Cmd {
    go func() {
        globalData = apiCall()  // Unsafe
    }()
    return nil
}
```

#### Exiting the Application

Always use `tea.Quit` to exit gracefully. Never call `os.Exit()` directly.

✓ **Good**: Return tea.Quit command
```go
case tea.KeyPressMsg:
    switch msg.String() {
    case "q", "ctrl+c":
        return m, tea.Quit
    }
```

✗ **Avoid**: Abrupt exits
```go
if msg.String() == "q" {
    os.Exit(0)  // Unclean
}
```

#### Terminal Cleanup

Bubble Tea handles terminal state automatically. Do not manually manipulate raw terminal mode.

✓ **Good**: Let Bubble Tea manage the terminal
```go
p := tea.NewProgram(initialModel())
if _, err := p.Run(); err != nil {
    fmt.Fprintf(os.Stderr, "Error: %v\n", err)
    os.Exit(1)
}
// Terminal is automatically restored
```

✗ **Avoid**: Manual terminal manipulation
```go
exec.Command("stty", "raw", "-echo").Run()  // Don't do this
// ... application code ...
exec.Command("stty", "-raw", "echo").Run()
```

### Logging in TUI Applications

#### Problem: stdout Conflict

TUI applications own the terminal and write to stdout. Logging to stdout will corrupt the TUI rendering. Structured logging (slog) must be redirected away from stdout before the Bubble Tea program starts.

#### Solution: Redirect slog Output

Before calling `p.Run()`, redirect the default slog handler's output away from stdout:

✓ **Good**: Redirect slog before starting TUI
```go
package main

import (
    "log/slog"
    "os"
    tea "charm.land/bubbletea/v2"
)

func main() {
    // Redirect slog away from stdout to prevent TUI corruption
    slog.SetDefault(slog.New(
        slog.NewJSONHandler(os.Stderr, nil),
    ))

    p := tea.NewProgram(initialModel())
    if _, err := p.Run(); err != nil {
        slog.Error("TUI error", "err", err)
        os.Exit(1)
    }
}
```

✗ **Avoid**: Logging to stdout during TUI operation
```go
func main() {
    // slog still writes to stdout; TUI rendering will be corrupted
    p := tea.NewProgram(initialModel())
    p.Run()
}
```

#### OTLP Log Export

The slog redirect does not affect OTLP gRPC log export (via `otelslog` bridge). Structured logs continue to be exported to the configured OTLP endpoint regardless of the stdout redirect.

### Common Issues

**"My TUI output is corrupted with log messages"**
→ Redirect slog output away from stdout before starting the Bubble Tea program. See [Logging in TUI Applications](#logging-in-tui-applications).

**"How do I test a Bubble Tea application?"**
→ Use `tea.NewProgram(model).Run()` with mock commands. Bubble Tea provides testing utilities; see the examples in the repository.

**"How do I handle errors in commands?"**
→ Include an error field in your custom message type and check it in Update. Never panic in a command; always return a message with the error.

**"Can I use multiple Bubble Tea programs in one application?"**
→ Generally no. A Bubble Tea program takes exclusive control of the terminal. If you need multiple TUIs, compose them into a single Model with tabs or screens.

**"How do I integrate with external libraries that also manage the terminal?"**
→ Avoid it. Bubble Tea must have exclusive control. If integration is necessary, ensure the external library is fully suspended while Bubble Tea is running.

**"Upgrading from v1 to v2"**
→ See the [Bubble Tea v2 Upgrade Guide](https://github.com/charmbracelet/bubbletea/blob/main/UPGRADE_GUIDE_V2.md) for breaking changes and migration steps.

---

## go-app v10 (PWA Framework)

go-app is a Go package for building Progressive Web Apps (PWAs) using Go and WebAssembly (WASM). The same Go source compiles twice: once as a native HTTP server (backend) and once as a WASM binary (frontend). The server automatically generates and serves the PWA manifest, service worker, and WASM loader — no separate frontend toolchain is required.

### Core Principle

PWA applications in this platform MUST use go-app v10 (`github.com/maxence-charriere/go-app/v10`). go-app provides a declarative component model for building UIs in pure Go, automatic WASM compilation, and built-in PWA support (manifest, service worker, offline caching) without requiring a separate Node.js build pipeline.

### Setup

```go
// go.mod
require (
    github.com/maxence-charriere/go-app/v10 v10.x.x
)
```

Install the package:

```bash
go get -u github.com/maxence-charriere/go-app/v10/pkg/app
```

### Key Guidelines

#### Build: Compile for both native and WASM targets

go-app applications require two builds: the native Go server and the WASM client.

```bash
# Build native server (Linux/macOS/Windows)
go build -o web ./src/staccato-toolkit/web

# Build WASM client (must use GOOS=js and GOARCH=wasm)
GOOS=js GOARCH=wasm go build -o web/app.wasm ./src/staccato-toolkit/web
```

**Key requirement**: The WASM binary MUST be output to a `web/` subdirectory so the go-app HTTP server can serve it.

#### Components: Embed app.Compo and implement Render()

All UI components MUST embed `app.Compo` and implement a `Render() app.UI` method. Components are the building blocks of go-app applications.

```go
// ✓ Good: Component with embedded Compo and Render method
type Hello struct {
	app.Compo
	count int
}

func (h *Hello) Render() app.UI {
	return app.Div().Body(
		app.H1().Body(app.Text("Hello, PWA World!")),
		app.Button().
			Body(app.Text(fmt.Sprintf("Clicks: %d", h.count))).
			OnClick(h.OnClick),
	)
}

func (h *Hello) OnClick(ctx app.Context, e app.Event) {
	h.count++
}

// ✗ Avoid: Components without app.Compo or Render()
type BadComponent struct {
	// Missing app.Compo embedding
}
```

#### Routing: Use app.Route() for component routes and app.Handler for HTTP

go-app uses a two-level routing system:

```go
// ✓ Good: Component routing (WASM/client-side)
func init() {
	app.Route("/", func() app.Composer { return &Hello{} })
	app.Route("/about", func() app.Composer { return &About{} })
}

// ✓ Good: HTTP routing (native server)
func main() {
	app.RunWhenOnBrowser()  // Initialize client-side routing when running in browser
	
	http.Handle("/", &app.Handler{
		Name:        "Staccato Web",
		Description: "Staccato PWA application",
	})
	
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}

// ✗ Avoid: Mixing app.Route() and chi router for component routing
```

#### State Management: Use component fields and OnChange handlers

Component state is managed via struct fields and event handlers. Mutations trigger re-renders automatically.

```go
// ✓ Good: State in component field with event handler
type Counter struct {
	app.Compo
	value int
}

func (c *Counter) Render() app.UI {
	return app.Input().
		Type("number").
		Value(strconv.Itoa(c.value)).
		OnChange(c.OnChange)
}

func (c *Counter) OnChange(ctx app.Context, e app.Event) {
	c.value, _ = strconv.Atoi(e.Get("target").Get("value").String())
}

// ✗ Avoid: Global state variables or external state management for component-local state
```

### Component Development

#### Declarative UI with go-app's DSL

go-app provides a declarative API for building HTML elements:

```go
// ✓ Good: Declarative component composition
func (h *Hello) Render() app.UI {
	return app.Div().
		Class("container").
		Body(
			app.H1().Text("Welcome"),
			app.P().Text("This is a PWA built with go-app"),
			app.Button().
				Text("Click me").
				OnClick(h.handleClick),
		)
}

// ✗ Avoid: Manual HTML string concatenation
func BadRender() app.UI {
	return app.Div().Body(
		app.Raw("<h1>Welcome</h1>"),  // Avoid Raw() for static content
	)
}
```

#### Conditional rendering with app.If()

Use `app.If()` for conditional UI rendering:

```go
// ✓ Good: Conditional rendering
func (h *Hello) Render() app.UI {
	return app.Div().Body(
		app.If(h.isLoggedIn, func() app.UI {
			return app.Text("Welcome back!")
		}).Else(func() app.UI {
			return app.Text("Please log in")
		}),
	)
}
```

### WASM Compilation

#### Compilation target requirements

The WASM build MUST use specific environment variables:

```bash
# ✓ Good: Correct WASM compilation
GOOS=js GOARCH=wasm go build -o web/app.wasm ./src/staccato-toolkit/web

# ✗ Avoid: Missing GOOS=js or GOARCH=wasm
go build -o web/app.wasm ./src/staccato-toolkit/web
```

#### Output location

The WASM binary MUST be output to a `web/` directory within the module. The go-app HTTP server serves this directory:

```
src/staccato-toolkit/web/
├── main.go
├── hello.go
├── go.mod
└── web/
    └── app.wasm          # WASM binary (auto-served by app.Handler)
```

### HTTP Server Setup

#### app.Handler configuration

The `app.Handler` struct configures the PWA shell, manifest, and service worker:

```go
// ✓ Good: Full app.Handler configuration
func main() {
	app.RunWhenOnBrowser()
	
	http.Handle("/", &app.Handler{
		Name:        "Staccato Web",
		Description: "Interactive PWA application",
		Version:     "1.0.0",
	})
	
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}

// ✗ Avoid: Missing Name or Description
http.Handle("/", &app.Handler{})
```

#### Auto-generated assets

The `app.Handler` automatically generates and serves:

- `/manifest.webmanifest` — PWA manifest (browser install prompt)
- `/app-worker.js` — Service worker (offline caching)
- `/web/app.wasm` — WASM binary (frontend code)

No manual configuration is required for these assets.

#### Port configuration

The server SHOULD listen on a configurable port (default `:8080`):

```go
// ✓ Good: Configurable port with environment variable
port := os.Getenv("PORT")
if port == "" {
	port = ":8080"
}
if err := http.ListenAndServe(port, nil); err != nil {
	log.Fatal(err)
}
```

### Common Issues

**"WASM binary not found when running the app"**
→ Ensure WASM is built with `GOOS=js GOARCH=wasm go build -o web/app.wasm`. The `web/` directory MUST exist in the module.

**"Component not rendering or state not updating"**
→ Ensure component embeds `app.Compo` and implements `Render()`. State mutations in event handlers trigger re-renders automatically.

**"app.Handler not serving /manifest.webmanifest"**
→ Ensure `app.Handler` is registered as the root handler (`http.Handle("/", &app.Handler{...})`). The manifest is auto-generated from the `Name` and `Description` fields.

**"Service worker not caching offline content"**
→ The service worker is auto-generated by go-app. Ensure the server is running and the WASM binary is served correctly. Browser caching may require a hard refresh.

**"WASM compilation fails with 'undefined: syscall' or similar"**
→ WASM does not support all Go stdlib packages (e.g., `syscall`, `os/exec`). Use build tags to exclude platform-specific code:
```go
// +build !wasm

package main

import "os"  // Only imported for non-WASM builds
```

---

## Service Defaults (Observability)

The `servicedefaults` package is a unified initialization layer for Go services, analogous to .NET Aspire's `AddServiceDefaults()`. It provides a single `Configure()` call that sets up all observability signals (traces, metrics, logs).

### Core Principle

All Go services MUST use `servicedefaults.Configure()` for observability initialization. The package initializes OpenTelemetry TracerProvider, MeterProvider, and LoggerProvider with non-blocking OTLP dial, env-aware behavior (`OTEL_SDK_DISABLED` check), and unified shutdown. Services MUST use `slog.Default()` for logging (no global logger variables). HTTP clients SHOULD use `servicedefaults.NewHTTPClient()` for automatic OTel instrumentation.

### Setup

```go
// go.mod
require (
    github.com/staccato-toolkit/core/pkg/servicedefaults v0.1.0
)
```

Initialize observability in `main()`:

```go
import (
    "context"
    "log/slog"
    "os"
    "github.com/staccato-toolkit/core/pkg/servicedefaults"
)

func main() {
    ctx := context.Background()

    shutdown, err := servicedefaults.Configure(ctx, "my-service")
    if err != nil {
        slog.Error("failed to initialize service defaults", "error", err)
        os.Exit(1)
    }
    defer shutdown(ctx)

    slog.Info("service started", "port", 8080)
}
```

### Key Guidelines

#### Initialization: Use Configure() for all observability setup

```go
// ✓ Good: Single Configure() call
func main() {
    ctx := context.Background()
    shutdown, err := servicedefaults.Configure(ctx, "staccato-server")
    if err != nil {
        slog.Error("failed to initialize service defaults", "error", err)
        os.Exit(1)
    }
    defer shutdown(ctx)
    slog.Info("service started")
}

// ✗ Avoid: Manual telemetry initialization (deprecated)
func main() {
    shutdown, err := telemetry.InitTelemetry(ctx, "staccato-server")
    // ...
}
```

#### Environment Variables

- `OTEL_SDK_DISABLED=true` — skip all OTel initialization (local dev/testing without collector)
- `OTEL_EXPORTER_OTLP_ENDPOINT` — Collector address (default: `localhost:4317`)
- `OTEL_TRACES_SAMPLER` / `OTEL_TRACES_SAMPLER_ARG` — trace sampling configuration

The OTLP dial is **non-blocking**. If the Collector is unreachable, `Configure()` returns successfully and reconnects in the background.

#### Logging: Use slog.Default() instead of global logger variables

`Configure()` sets up `slog.Default()` with a TraceHandler-wrapped logger that injects `trace_id` and `span_id`.

```go
// ✓ Good: Use slog.Default() with context-aware logging
func HandleRequest(ctx context.Context, req *Request) error {
    slog.InfoContext(ctx, "processing request", "request_id", req.ID)
    return nil
}

// ✗ Avoid: Global logger variable (anti-pattern)
var logger *slog.Logger  // nil in tests unless TestMain initializes it
```

#### HTTP Client: Use NewHTTPClient() for instrumented outbound calls

```go
// ✓ Good: Automatic OTel instrumentation
client := servicedefaults.NewHTTPClient()
resp, err := client.Get("https://api.example.com/users")

// With options
client := servicedefaults.NewHTTPClient(
    servicedefaults.WithTimeout(10 * time.Second),
    servicedefaults.WithRetry(3, 100 * time.Millisecond),
)

// ✗ Avoid: http.DefaultClient has no OTel instrumentation
resp, err := http.Get("https://api.example.com/users")
```

#### Shutdown: Always defer the shutdown function

```go
// ✓ Good: Graceful shutdown with timeout
func main() {
    ctx := context.Background()
    shutdown, err := servicedefaults.Configure(ctx, "my-service")
    if err != nil { os.Exit(1) }

    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
    <-sigChan

    shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    shutdown(shutdownCtx)
}
```

### Migration from telemetry.InitTelemetry()

**Checklist:**
1. Replace `telemetry.InitTelemetry()` with `servicedefaults.Configure()`
2. Remove `var logger *slog.Logger` package-level variable
3. Replace `logger.Info()` with `slog.Info()` (or `slog.InfoContext()` for trace context)
4. Update tests: use `slog.Default()` instead of referencing a global logger

### Pattern Conformance

The `servicedefaults` package implements the **language-toolkits** pattern:

| Required Capability | Implementation |
|---|---|
| **Logging** | `Configure()` sets `slog.Default()` with `TraceHandler` (injects `trace_id`, `span_id`) |
| **Distributed tracing** | Initializes `TracerProvider` via `otlptracegrpc.New()` with non-blocking dial |
| **Metrics** | Initializes `MeterProvider` via `otlpmetricgrpc.New()` |
| **HTTP client defaults** | `NewHTTPClient()` wraps transport with `otelhttp.NewTransport()` |
| **Single entry-point** | `Configure(ctx, serviceName, ...Option)` — one function initializes all signals |
| **No-op path** | `OTEL_SDK_DISABLED=true` returns no-op shutdown, skips all initialization |
| **Graceful shutdown** | Returns shutdown function calling `Shutdown(ctx)` on all providers |

### Common Issues

**"Service fails to start without OTel Collector"**
→ Set `OTEL_SDK_DISABLED=true` for local development. The package uses non-blocking dial.

**"Spans/metrics/logs not appearing in Grafana"**
→ Check `OTEL_EXPORTER_OTLP_ENDPOINT`. Verify OTel Collector is running. Ensure `shutdown()` is called.

**"trace_id missing from logs"**
→ Use `slog.InfoContext(ctx, ...)` not `slog.Info(...)`. Context must contain an active span.

**"Tests fail with nil logger"**
→ Replace global `var logger` with `slog.Default()`. Use `t.Setenv("OTEL_SDK_DISABLED", "true")` in tests.

---

## Testing

Go's built-in testing package (`testing`) provides a standard framework for unit tests, integration tests, and benchmarks.

### Usage Standards

- Create test files with `_test.go` suffix in the same package
- Use `t.Run()` for subtests and organization
- Use `t.Helper()` for test utility functions
- Use table-driven tests for multiple input/output pairs
- Run tests with `go test ./...` in CI
- Aim for >80% code coverage on core functionality
- Use `go test -race` in CI to detect race conditions
- Use `go test -bench` for performance benchmarks

### Example

```go
func TestAdd(t *testing.T) {
    tests := []struct {
        name     string
        a, b, want int
    }{
        {"positive", 1, 2, 3},
        {"negative", -1, -2, -3},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := Add(tt.a, tt.b)
            if got != tt.want {
                t.Errorf("got %d, want %d", got, tt.want)
            }
        })
    }
}
```

---

## golangci-lint

golangci-lint is a fast Go linter that runs multiple linters in parallel and aggregates their results. All Go code MUST pass golangci-lint in CI.

### Usage Standards

- Configuration in `.golangci.yml` at repository root
- Enable presets: `presets: [bugs, performance, style, unused]`
- Run in CI with `golangci-lint run ./...`
- Fix auto-fixable issues with `golangci-lint run --fix`
- Exclude test files from certain checks (e.g., errcheck)
- Pin golangci-lint version in CI for reproducibility

### Configuration

```yaml
linters:
  enable:
    - errcheck
    - ineffassign
    - misspell
    - vet
  disable-all: false

issues:
  exclude-rules:
    - path: _test\.go
      linters:
        - errcheck
```

---

## See Also

- [OpenTelemetry Usage Rules](./opentelemetry.md) - OTel SDK patterns and tracing
- [slog Usage Rules](./slog.md) - Structured logging with trace context
- [Language Toolkit Pattern](../patterns/architecture/language-toolkits.md) - Canonical contract for language-runtime toolkits
- [Testing Pattern Rules](../patterns/code/testing.md) - Testing best practices
- [Chi Documentation](https://github.com/go-chi/chi) - Official chi router documentation
- [Cobra Documentation](https://cobra.dev) - Official Cobra CLI framework documentation
- [Cobra GitHub](https://github.com/spf13/cobra) - Cobra source repository
- [Observability Instrumentation Skill](../../skills/observability-instrumentation/SKILL.md) - Agent guidance for implementing observability
