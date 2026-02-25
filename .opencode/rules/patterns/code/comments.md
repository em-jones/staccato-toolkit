---
created-by-change: main
last-validated: 2026-02-28
---

# Code Comments Pattern Rules

_Guidance for writing comments that add value beyond what the code already says — using each
language's doc-block system as the primary vehicle, with inline examples for public APIs and ASCII
art for side effects._

## Core Principle

A comment should say what the code **cannot**. Use the language's native doc-block format for every
exported/public symbol. Inline examples make APIs self-evident without requiring a reader to leave
the file. Side effects — I/O, mutations, spawned processes — must be declared visually so they are
never a surprise.

> "Don't comment bad code — rewrite it. When you do comment, make the comment earn its place."
> — Clean Code, Ch. 4

---

## Key Guidelines

### Use the Language's Doc-Block Format

Every **exported or public** symbol gets a doc-block. Internal helpers get one when the intent is
not obvious from the name and signature alone.

| Language   | Format                         | Rendered by              |
| ---------- | ------------------------------ | ------------------------ |
| Go         | `// FuncName …` (godoc)        | `go doc`, pkg.go.dev     |
| TypeScript | `/** … */` (TSDoc / JSDoc)     | TypeDoc, VS Code hover   |
| Python     | `"""…"""` (PEP 257)            | Sphinx, `help()`         |
| Nix        | `/* … */` above the binding    | `nix eval … --describe`  |
| Bash       | `# FUNCTION: …` header block   | custom / shellcheck      |

**Go — godoc style:**
```go
// SaveProjectConfig writes cfg to path as YAML, creating or truncating the file.
// Returns an error if cfg fails validation or the file cannot be written.
func SaveProjectConfig(path string, cfg *ProjectConfig) error { … }
```

**TypeScript — TSDoc style:**
```typescript
/**
 * Saves the project configuration to the given path as YAML.
 * Creates the file if it does not exist; truncates it otherwise.
 */
export function saveProjectConfig(path: string, cfg: ProjectConfig): Promise<void> { … }
```

**Python — PEP 257 style:**
```python
def save_project_config(path: str, cfg: ProjectConfig) -> None:
    """Save *cfg* to *path* as YAML, creating or truncating the file."""
```

---

### Include a Mini Example for Public APIs

Any exported function whose usage is not immediately obvious from the signature gets a short,
runnable example in the doc-block. Keep examples to ≤ 10 lines.

**Go — Example function (appears in `go doc` and pkg.go.dev):**
```go
// StubFromName derives a URL-safe stub from a human-readable project name.
//
// Example:
//
//	StubFromName("My Platform 2025") // → "my-platform-2025"
//	StubFromName("Hello! World")     // → "hello-world"
func StubFromName(name string) string { … }
```

For Go, prefer a standalone `Example*` test function in `_test.go` when the example needs to
demonstrate output — godoc renders these automatically.

**TypeScript:**
```typescript
/**
 * Derives a URL-safe stub from a human-readable project name.
 *
 * @example
 * stubFromName("My Platform 2025") // → "my-platform-2025"
 * stubFromName("Hello! World")     // → "hello-world"
 */
export function stubFromName(name: string): string { … }
```

**Python:**
```python
def stub_from_name(name: str) -> str:
    """Derive a URL-safe stub from a human-readable project name.

    >>> stub_from_name("My Platform 2025")
    'my-platform-2025'
    >>> stub_from_name("Hello! World")
    'hello-world'
    """
```

Doctest-style examples (Python `>>>`) double as runnable tests via `doctest.testmod()`.

---

### Describe Side Effects with ASCII Art

When a function has a **side effect** — writing files, mutating external state, spawning a process,
sending a network request — the doc-block **must** describe it. Use a small ASCII diagram to make
the effect concrete and scannable.

#### File system writes

Show the directory tree with the affected path marked:

```go
// SaveProjectConfig writes cfg to path as YAML, creating or truncating the file.
// Intermediate directories are created with mode 0755.
//
// Side effects:
//
//	<dir>/
//	└── .st.yaml   ← written (created or truncated)
func SaveProjectConfig(path string, cfg *ProjectConfig) error { … }
```

```go
// upsertDevboxJSON creates or updates devbox.json in wsDir.
//
// Side effects:
//
//	<wsDir>/
//	└── devbox.json   ← created or merged in place
func upsertDevboxJSON(wsDir string, ws *Workspace) error { … }
```

#### Network / external calls

Use an arrow diagram:

```go
// fetchRelease calls the GitHub Releases API for the given repo and tag.
//
// Side effects:
//
//	caller ──GET──► api.github.com/repos/<owner>/<repo>/releases/tags/<tag>
//	        ◄──200─┘  (or 404 / 5xx on error)
func fetchRelease(owner, repo, tag string) (*Release, error) { … }
```

#### Process / subprocess

```go
// runDevbox executes `devbox shell` in dir, streaming output to stdout.
//
// Side effects:
//
//	host shell
//	  └── devbox shell   ← subprocess (inherits stdout/stderr)
func runDevbox(ctx context.Context, dir string) error { … }
```

#### State machine transitions

For functions that drive a state machine, a compact transition line is sufficient:

```go
// Run executes the init flow.
//
// State transitions:
//
//	idle → start → prompt-name → prompt-repo → write-config → ask-workspace → done
//	                                                                         ↘ already-done
func (f *InitFlow) Run(ctx context.Context) error { … }
```

---

### What NOT to Comment

Avoid noise. The following add no value and must be removed in review:

```go
// ✗ Avoid — restates the code
// i is the loop counter
for i := range items { … }

// ✗ Avoid — explains the obvious
// Returns nil
return nil

// ✗ Avoid — commented-out code (use git history instead)
// old := legacyTransform(x)
```

```typescript
// ✗ Avoid — type annotation already conveys this
/** A string. */
name: string;
```

---

### When Inline Comments Are Acceptable

Inline (`//` or `#`) comments inside a function body are acceptable **only** when:

1. A non-obvious algorithm step needs a reference (e.g., `// Collapse consecutive hyphens per RFC 3986 §3.3`).
2. A guard clause exists for a subtle reason that the condition alone does not convey.
3. A deliberate deviation from a pattern (e.g., `// intentionally not checking error — best effort cleanup`).

One line is almost always enough. If more space is needed, the code should probably be extracted
into a named function with a doc-block instead.

---

## Common Issues

**"My function is internal — does it need a doc-block?"**
→ If the name and signature fully communicate intent: no. If there is any subtlety (non-obvious
invariant, surprising behaviour, side effect): yes, at minimum a one-liner.

**"The side-effect diagram feels forced for a trivial write"**
→ Even a one-line note suffices: `// Side effects: writes <path> to disk.` Reserve the ASCII tree
for anything with multiple affected paths or nested directory creation.

**"My example is 20 lines long"**
→ Trim it or link to a test file. Doc-block examples should illustrate the happy path in ≤ 10 lines.
Exhaustive cases belong in tests.

**"I updated the function but forgot to update the doc-block example"**
→ Treat stale doc-block examples as bugs. Go's `Example*` test functions and Python doctests
enforce this automatically — prefer them over prose examples.

## See Also

- [Functions Pattern](./functions.md) — side effects and CQS at the design level
- [Naming Pattern](./naming.md) — a good name reduces how much a doc-block needs to say
- [Testing Pattern](./testing.md) — `Example*` functions and doctests as living documentation
- *Clean Code*, Robert C. Martin — Chapter 4: Comments
