---
name: codemirror-v6
description: >
  Comprehensive guide to CodeMirror 6. ALWAYS use when writing code that imports from
  any @codemirror/* package, integrating CodeMirror with SolidJS via solid-codemirror,
  building command-palette or app-launcher search experiences, implementing LSP-backed
  completions, or designing autocomplete/tooltip/decoration/panel extensions. Covers
  CM6 architecture, the full extension API, SolidJS integration (solid-codemirror),
  LSP integration (@marimo-team/codemirror-languageserver), and real-world patterns
  from HyperDX's production codebase. Version: CodeMirror 6 only (@codemirror/* ^6.x).
---

# CodeMirror 6 — Complete Agent Reference

> All APIs in this skill refer to **CodeMirror 6** (`@codemirror/*` at `^6.x`).
> Do NOT reference CM5 APIs.

---

## 1. Architecture Overview

### 1.1 Functional Core, Imperative Shell

CM6 splits into two strict layers:

| Layer | Packages | Nature |
|-------|----------|--------|
| **State** | `@codemirror/state` | Immutable — `EditorState`, `Text`, `Transaction`, `ChangeSet` |
| **View** | `@codemirror/view` | Imperative — `EditorView`, DOM, event handling |

**Rules:**
- Never mutate state properties directly.
- All changes flow through `Transaction` objects dispatched to the view.
- `TypeScript readonly` annotations enforce immutability.

### 1.2 Core Packages

```
@codemirror/state      — EditorState, Transaction, StateField, Facet, Compartment
@codemirror/view       — EditorView, Decoration, ViewPlugin, keymap, tooltip, panel
@codemirror/commands   — defaultKeymap, historyKeymap
codemirror            — basicSetup convenience bundle
```

### 1.3 Minimal Editor Setup

```typescript
import { EditorView, basicSetup } from "codemirror"
import { javascript } from "@codemirror/lang-javascript"

const view = new EditorView({
  doc: "console.log('hello')",
  extensions: [basicSetup, javascript()],
  parent: document.getElementById("editor")!,
})
```

> **Vite fix**: Add to `optimizeDeps.include: ['@codemirror/state', '@codemirror/view']`
> to prevent "multiple instances" `instanceof` errors.

### 1.4 State and Updates

```typescript
// Create a transaction
const tr = view.state.update({
  changes: { from: 0, insert: "hello" },
  selection: { anchor: 5 },
  scrollIntoView: true,
  annotations: Transaction.userEvent.of("input"),
})
view.dispatch(tr)

// Full document reset (clears undo history)
view.setState(EditorState.create({ doc: newContent, extensions }))
```

**Update lifecycle:**
1. `dispatch()` writes state to DOM synchronously.
2. `requestAnimationFrame` measure phase reads layout, validates viewport, scrolls.
3. Custom measure work via `view.requestMeasure({ read, write })`.

Never dispatch while another update is being synchronously applied.
Always call `view.destroy()` on unmount.

### 1.5 Document Model

- Positions are plain UTF-16 code unit offsets.
- `doc.line(n)` — 1-based line lookup.
- `doc.lineAt(pos)` — line object for a position.
- `ChangeDesc.mapPos(pos)` — translate positions across changes.

---

## 2. Extension System

### 2.1 Facets

A **Facet** is the primary mechanism for configuration and communication between extensions.

```typescript
const wordList = Facet.define<string, string[]>({
  combine: values => values.flat()
})

// Provide a value
wordList.of("foo")

// Computed value — recomputes when `doc` changes
wordList.compute(["doc"], state => [state.doc.length > 100 ? "big" : "small"])

// Read
const words = state.facet(wordList) // string[]
```

**Combining strategies:**
- `values => values[0]` — highest precedence wins (e.g., `tabSize`)
- `values => values.flat()` — collect all (e.g., event handlers)
- `values => values.some(Boolean)` — logical OR

### 2.2 Compartments (Dynamic Reconfiguration)

```typescript
const themeCompartment = new Compartment()

// Initial config
themeCompartment.of(darkTheme)

// Reconfigure later
view.dispatch({ effects: themeCompartment.reconfigure(lightTheme) })
```

### 2.3 Precedence

```typescript
Prec.highest(ext)   // always wins
Prec.high(ext)
Prec.default(ext)   // normal
Prec.low(ext)
Prec.lowest(ext)

// Ensure a keymap wins over all others:
Prec.highest(keymap.of([{ key: "Ctrl-Enter", run: myCmd }]))
```

### 2.4 State Fields

```typescript
const counterField = StateField.define<number>({
  create: () => 0,
  update(value, tr) {
    return tr.docChanged ? value + 1 : value
  },
  // Optionally wire to a facet:
  provide: f => someDisplayFacet.from(f)
})
```

**StateEffect** for inter-extension communication:

```typescript
const toggleMode = StateEffect.define<boolean>()

const modeField = StateField.define<boolean>({
  create: () => false,
  update(value, tr) {
    for (const e of tr.effects) if (e.is(toggleMode)) return e.value
    return value
  }
})

view.dispatch({ effects: toggleMode.of(true) })
```

### 2.5 View Plugins

For viewport-dependent or DOM-manipulating work:

```typescript
const myPlugin = ViewPlugin.fromClass(class {
  dom: HTMLElement

  constructor(view: EditorView) {
    this.dom = document.createElement("div")
    // attach to view.dom
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) this.refresh(update.view)
  }

  destroy() { this.dom.remove() }
}, {
  decorations: v => v.decorations,
  eventHandlers: { mousedown(e, view) { /* handle */ } }
})
```

### 2.6 Transaction Spec Reference

| Property | Type | Description |
|----------|------|-------------|
| `changes` | `ChangeSpec \| ChangeSet` | Document changes |
| `selection` | `EditorSelection \| {anchor,head?}` | New selection |
| `scrollIntoView` | `boolean` | Scroll main selection into view |
| `annotations` | `Annotation \| Annotation[]` | Metadata (e.g., `Transaction.userEvent`) |
| `effects` | `StateEffect \| StateEffect[]` | Extension side-effects |
| `sequential` | `boolean` | Apply specs sequentially |

```typescript
// Mark as user input (affects undo grouping)
view.dispatch({
  changes: { from: pos, insert: "x" },
  annotations: Transaction.userEvent.of("input")
})
```

### 2.7 Transaction Filters

```typescript
// Reject certain changes
EditorState.changeFilter.of(tr => !isReadOnlyRange(tr))

// Modify transactions
EditorState.transactionFilter.of(tr => {
  // Return modified specs, or the original tr
  return tr
})
```

---

## 3. The View

### 3.1 DOM Structure

```
.cm-editor                    ← outer wrapper (vertical flexbox, theme scope)
  .cm-scroller                ← overflow:auto scroll container
    .cm-gutters               ← line numbers, fold markers
    .cm-content[contenteditable]  ← MutationObserver target
      .cm-line                ← one per viewport line
  .cm-tooltip                 ← autocomplete/hover (absolute)
  .cm-panels                  ← panels (above/below scroller)
```

Never directly manipulate this DOM. Use **Decorations** instead.

### 3.2 Viewport

```typescript
const { from, to } = view.viewport       // rendered range
const ranges = view.visibleRanges        // excludes folded/invisible content
```

Use `visibleRanges` (not `viewport`) in decoration loops — skips invisible content.

### 3.3 Commands and Keybindings

```typescript
// A command returns true if it handled the action
const myCmd: Command = (view) => {
  view.dispatch(view.state.replaceSelection("!"))
  return true
}

// Register via keymap facet
keymap.of([
  { key: "Mod-Enter", run: myCmd },      // Mod = Ctrl on PC, Cmd on Mac
  { key: "Alt-c",    run: myCmd, shift: altShiftCmd },
])
```

Built-in keymaps: `defaultKeymap`, `historyKeymap`, `searchKeymap`,
`completionKeymap`, `closeBracketsKeymap`, `foldKeymap`, `lintKeymap`.

---

## 4. Theming and Styling

### 4.1 Theme Extensions

```typescript
const myTheme = EditorView.theme({
  "&": { fontSize: "14px", fontFamily: "JetBrains Mono, monospace" },
  "&.cm-focused .cm-cursor": { borderLeftColor: "#58a6ff" },
  ".cm-content": { caretColor: "#58a6ff" },
  ".cm-gutters": { backgroundColor: "#0d1117", color: "#6e7681", border: "none" },
  ".cm-activeLine": { backgroundColor: "#161b22" },
  ".cm-selectionBackground, ::selection": { backgroundColor: "#264f78" },
  // Autocompletion tooltip
  ".cm-tooltip.cm-tooltip-autocomplete": {
    backgroundColor: "#1e1e1e", border: "1px solid #333",
    borderRadius: "6px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)"
  },
  ".cm-completionLabel": { color: "#ccc" },
  ".cm-completionDetail": { color: "#666", fontSize: "0.85em" },
  ".cm-completionMatchedText": { color: "#4ec9b0", fontWeight: "bold" },
}, { dark: true })
```

### 4.2 Base Themes (for Extension Authors)

```typescript
// Adapts to light/dark automatically
const myBaseTheme = EditorView.baseTheme({
  ".cm-myWidget": { padding: "2px 4px" },
  "&light .cm-myWidget": { background: "#f5f5f5", color: "#333" },
  "&dark .cm-myWidget":  { background: "#2a2a2a", color: "#ccc" }
})
```

### 4.3 Syntax Highlighting

```typescript
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language"
import { tags } from "@lezer/highlight"

const myHighlight = HighlightStyle.define([
  { tag: tags.keyword,      color: "#569cd6" },
  { tag: tags.string,       color: "#ce9178" },
  { tag: tags.comment,      color: "#6a9955", fontStyle: "italic" },
  { tag: tags.number,       color: "#b5cea8" },
  { tag: tags.typeName,     color: "#4ec9b0" },
  { tag: tags.variableName, color: "#9cdcfe" },
])

syntaxHighlighting(myHighlight)
```

---

## 5. Autocompletion API

Package: `@codemirror/autocomplete`

### 5.1 Setup

```typescript
import { autocompletion, completionKeymap } from "@codemirror/autocomplete"

autocompletion({
  override: [mySource],       // global completion sources
  activateOnTyping: true,     // trigger automatically while typing
  maxRenderedOptions: 20,
  defaultKeymap: true,        // Ctrl-Space, arrows, Enter, Escape
  icons: true,
  tooltipClass: () => "my-completion-tooltip"
})
```

### 5.2 CompletionSource

```typescript
import type { CompletionSource, CompletionContext } from "@codemirror/autocomplete"

const mySource: CompletionSource = (context: CompletionContext) => {
  // context.pos       — cursor position
  // context.explicit  — true if triggered by Ctrl-Space
  // context.state     — EditorState

  const word = context.matchBefore(/\w*/)
  if (!word || (word.from === word.to && !context.explicit)) return null

  return {
    from: word.from,
    options: [
      {
        label: "console.log",
        type: "function",
        detail: "log to console",
        info: "Writes to the browser console.",
        apply: (view, completion, from, to) => {
          view.dispatch({ changes: { from, to, insert: completion.label + "()" } })
        }
      },
      { label: "forEach", type: "method", boost: 10 },
    ],
    validFor: /^\w*$/,    // reuse result while cursor stays within a word
  }
}
```

### 5.3 Completion Object Properties

| Property | Type | Purpose |
|----------|------|---------|
| `label` | `string` | Display + default insert text |
| `type` | `string` | Icon: `"keyword"`, `"variable"`, `"function"`, `"method"`, `"class"`, `"type"`, `"constant"`, `"property"`, `"namespace"`, `"text"` |
| `detail` | `string` | Short annotation after label |
| `info` | `string \| ((c) => Node \| Promise<Node>)` | Rich docs shown when selected |
| `apply` | `string \| ((view,c,from,to) => void)` | Override insertion |
| `boost` | `number` | Ranking adjustment (-99 to 99) |
| `section` | `string \| CompletionSection` | Group under a header |

### 5.4 Completing from Syntax Tree

```typescript
import { syntaxTree } from "@codemirror/language"

const contextAwareSource: CompletionSource = (context) => {
  const node = syntaxTree(context.state).resolveInner(context.pos, -1)

  // Only complete inside JSDoc comments
  if (node.name !== "BlockComment") return null
  const word = context.matchBefore(/@\w*/)
  if (!word) return null

  return {
    from: word.from,
    options: [
      { label: "@param", type: "keyword" },
      { label: "@returns", type: "keyword" },
    ]
  }
}
```

### 5.5 Static Lists

```typescript
import { completeFromList } from "@codemirror/autocomplete"
const keywords = completeFromList(["SELECT", "WHERE", "FROM", "JOIN"])
```

### 5.6 Section Groups

```typescript
import { CompletionSection } from "@codemirror/autocomplete"

const schemaSection: CompletionSection = {
  name: "Schema",
  header: () => {
    const el = document.createElement("div")
    el.className = "cm-section-header"
    el.textContent = "Database Schema"
    return el
  },
  rank: 1
}

// Use in options:
{ label: "users", type: "class", section: schemaSection }
```

### 5.7 Async (Live Search) Pattern

```typescript
const liveSource: CompletionSource = async (context) => {
  const query = context.matchBefore(/[^\s]*/)
  if (!query) return null

  const results = await fetchSuggestions(query.text)
  if (!context.valid) return null  // user moved on — abort

  return {
    from: query.from,
    filter: false,   // we handle filtering server-side
    options: results.map(r => ({ label: r.label, detail: r.category, type: r.type }))
  }
}
```

### 5.8 Programmatic Control

```typescript
import { startCompletion, closeCompletion, acceptCompletion, currentCompletions } from "@codemirror/autocomplete"

startCompletion(view)             // trigger explicitly
closeCompletion(view)             // dismiss
acceptCompletion(view)            // accept selected item
currentCompletions(view.state)    // read active completions list
```

---

## 6. Decorations

### 6.1 Four Types

```typescript
import { Decoration } from "@codemirror/view"

// MARK: Style a text range
Decoration.mark({ class: "cm-highlight", attributes: { title: "hover text" } })

// WIDGET: Insert a DOM element at a position
Decoration.widget({ widget: new MyWidget(data), side: 1, block: false })

// REPLACE: Hide content or substitute with a widget
Decoration.replace({ widget: new MyWidget(), inclusive: false })

// LINE: Add attributes to the line wrapper element
Decoration.line({ class: "cm-active-line" })
```

### 6.2 WidgetType

```typescript
import { WidgetType } from "@codemirror/view"

class CheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean) { super() }

  toDOM(view: EditorView): HTMLElement {
    const el = document.createElement("input")
    el.type = "checkbox"
    el.checked = this.checked
    el.addEventListener("change", () => {
      view.dispatch(view.state.update({ /* update doc */ }))
    })
    return el
  }

  // Return true to reuse existing DOM (avoid recreation)
  updateDOM(dom: HTMLElement): boolean {
    ;(dom as HTMLInputElement).checked = this.checked
    return true
  }

  eq(other: CheckboxWidget): boolean { return other.checked === this.checked }
  ignoreEvent(): boolean { return false }
}
```

### 6.3 Providing Decorations

**From a StateField** (can influence block layout, cannot read viewport):
```typescript
const decoField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decos, tr) {
    return decos
      .map(tr.changes)              // ALWAYS map through changes first
      .update({ add: newDecos, filter: (from, to) => true })
  },
  provide: f => EditorView.decorations.from(f)
})
```

**From a ViewPlugin** (can read viewport, cannot influence block layout):
```typescript
const decoPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet

  constructor(view: EditorView) { this.decorations = this.build(view) }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.build(update.view)
    }
  }

  build(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>()
    for (const { from, to } of view.visibleRanges) {
      // Only decorate visible content for performance
    }
    return builder.finish()
  }
}, { decorations: v => v.decorations })
```

### 6.4 MatchDecorator

```typescript
import { MatchDecorator } from "@codemirror/view"

const urlDeco = new MatchDecorator({
  regexp: /https?:\/\/\S+/g,
  decoration: match => Decoration.mark({ class: "cm-url" })
})

ViewPlugin.fromClass(class {
  decorations: DecorationSet
  constructor(view: EditorView) { this.decorations = urlDeco.createDeco(view) }
  update(u: ViewUpdate) { this.decorations = urlDeco.updateDeco(u, this.decorations) }
}, { decorations: v => v.decorations })
```

---

## 7. Tooltips

Package: `@codemirror/view` — `showTooltip`, `hoverTooltip`

### 7.1 State-Driven Tooltip

```typescript
import { showTooltip, Tooltip } from "@codemirror/view"

const tooltipField = StateField.define<readonly Tooltip[]>({
  create: getCursorTooltips,
  update(tooltips, tr) {
    if (!tr.docChanged && !tr.selection) return tooltips
    return getCursorTooltips(tr.state)
  },
  provide: f => showTooltip.computeN([f], state => state.field(f))
})

function getCursorTooltips(state: EditorState): readonly Tooltip[] {
  return state.selection.ranges.map(range => ({
    pos: range.head,
    above: true,
    strictSide: true,
    arrow: true,
    create(view) {
      const dom = document.createElement("div")
      dom.textContent = `Pos: ${range.head}`
      return { dom }
    }
  }))
}
```

### 7.2 Hover Tooltip

```typescript
import { hoverTooltip } from "@codemirror/view"

const wordHover = hoverTooltip((view, pos, side) => {
  const { from, to, text } = view.state.doc.lineAt(pos)
  let start = pos, end = pos
  while (start > from && /\w/.test(text[start - from - 1])) start--
  while (end < to && /\w/.test(text[end - from])) end++
  if (start === end && side < 0) return null

  return {
    pos: start, end,
    above: true,
    create() {
      const dom = document.createElement("div")
      dom.textContent = text.slice(start - from, end - from)
      return { dom }
    }
  }
})
```

---

## 8. Panels

Package: `@codemirror/view` — `showPanel`

```typescript
import { showPanel, Panel } from "@codemirror/view"

const togglePanel = StateEffect.define<boolean>()

const panelState = StateField.define<boolean>({
  create: () => false,
  update(value, tr) {
    for (const e of tr.effects) if (e.is(togglePanel)) value = e.value
    return value
  },
  provide: f => showPanel.from(f, on => on ? createMyPanel : null)
})

function createMyPanel(view: EditorView): Panel {
  const dom = document.createElement("div")
  dom.className = "cm-my-panel"
  dom.innerHTML = `<input placeholder="Search..." />`
  return {
    dom,
    top: false,   // false = bottom panel
    update(update) { /* sync panel with state */ }
  }
}

// Toggle command
const toggleMyPanel: Command = view => {
  const isOpen = view.state.field(panelState)
  view.dispatch({ effects: togglePanel.of(!isOpen) })
  return true
}
```

---

## 9. Linting

Package: `@codemirror/lint`

```typescript
import { linter, lintGutter, Diagnostic } from "@codemirror/lint"

const myLinter = linter((view: EditorView): Diagnostic[] => {
  const diagnostics: Diagnostic[] = []
  const re = /\bTODO\b/g
  let match
  while ((match = re.exec(view.state.doc.toString())) !== null) {
    diagnostics.push({
      from: match.index,
      to: match.index + match[0].length,
      severity: "info",    // "info" | "warning" | "error"
      message: "TODO found",
      actions: [{
        name: "Remove",
        apply(view, from, to) {
          view.dispatch({ changes: { from, to, insert: "" } })
        }
      }]
    })
  }
  return diagnostics
}, { delay: 750 })

// Extensions: [myLinter, lintGutter()]
```

---

## 10. Language Support

### 10.1 SQL with Custom Dialect (HyperDX ClickHouse Pattern)

```typescript
import { SQLDialect, SQLConfig, sql } from "@codemirror/lang-sql"
import { clickhouse } from "sql-formatter"

const { tokenizerOptions } = clickhouse

const clickhouseDialect = SQLDialect.define({
  keywords: [
    ...tokenizerOptions.reservedKeywords,
    ...tokenizerOptions.reservedClauses,
    ...tokenizerOptions.reservedSelect,
    ...tokenizerOptions.reservedSetOperations,
    ...tokenizerOptions.reservedJoins,
    ...(tokenizerOptions.reservedKeywordPhrases ?? []),
  ].join(" ").toLowerCase(),
  types:   tokenizerOptions.reservedDataTypes.join(" ").toLowerCase(),
  builtin: tokenizerOptions.reservedFunctionNames.join(" ").toLowerCase(),
  backslashEscapes: true,
  doubleDollarQuotedStrings: true,
  operatorChars: "*+-%<>!=&|~^/?:",
  identifierQuotes: '`"',
})

export const clickhouseSql = (config?: SQLConfig) =>
  sql({ ...config, dialect: clickhouseDialect })
```

### 10.2 Schema-Aware SQL Completions

```typescript
import { sql } from "@codemirror/lang-sql"

const sqlWithSchema = sql({
  schema: {
    users:  ["id", "name", "email", "created_at"],
    orders: ["id", "user_id", "total", "status"],
  },
  defaultTable: "users",
  upperCaseKeywords: false
})
```

### 10.3 JSON

```typescript
import { json, jsonParseLinter } from "@codemirror/lang-json"
import { linter } from "@codemirror/lint"

[json(), linter(jsonParseLinter())]
```

---

## 11. SolidJS Integration (solid-codemirror)

Package: `solid-codemirror` — primitives-based, not a component wrapper.

### 11.1 Installation

```bash
bun add solid-codemirror @codemirror/state @codemirror/view
```

**Vite fix** (prevents multiple CM instances error):
```typescript
// vite.config.ts
optimizeDeps: { include: ["@codemirror/state", "@codemirror/view"] }
```

### 11.2 Basic Setup

```typescript
import { createCodeMirror } from "solid-codemirror"

export function Editor() {
  const { ref, editorView, createExtension } = createCodeMirror({
    value: "initial content",
    onValueChange: (value) => console.log(value),
    onModelViewUpdate: (view) => {},
    onTransactionDispatched: (tr, view) => {}
  })

  return <div ref={ref} />
}
```

`createCodeMirror` returns:

| Property | Type | Description |
|----------|------|-------------|
| `ref` | `(el: HTMLElement) => void` | Attach to DOM element |
| `editorView` | `Accessor<EditorView \| undefined>` | The CM EditorView (undefined until mounted) |
| `createExtension` | `(ext: Extension \| Accessor<Extension>) => void` | Compartment-based extension manager |

### 11.3 Controlled Value

```typescript
import { createCodeMirror, createEditorControlledValue } from "solid-codemirror"
import { createSignal } from "solid-js"

function ControlledEditor() {
  const [code, setCode] = createSignal("console.log('hello')")
  const { ref, editorView } = createCodeMirror({ onValueChange: setCode })

  // Syncs signal → editor whenever code() changes (memoized internally)
  createEditorControlledValue(editorView, code)

  return <div ref={ref} />
}
```

### 11.4 Dynamic Extensions

```typescript
import { createCodeMirror } from "solid-codemirror"
import { createSignal } from "solid-js"
import { EditorView, lineNumbers } from "@codemirror/view"

function FeatureRichEditor() {
  const [showLines, setShowLines] = createSignal(true)
  const [dark, setDark] = createSignal(true)
  const { ref, createExtension } = createCodeMirror()

  // Static extension — evaluated once
  createExtension(javascript())

  // Reactive extension — auto-reconfigures when signal changes
  createExtension(() => showLines() ? lineNumbers() : [])
  createExtension(() => dark() ? darkTheme : lightTheme)

  return (
    <div>
      <button onClick={() => setShowLines(v => !v)}>Toggle lines</button>
      <div ref={ref} />
    </div>
  )
}
```

### 11.5 Readonly and Focus Control

```typescript
import { createCodeMirror, createEditorReadonly, createEditorFocus } from "solid-codemirror"
import { createSignal } from "solid-js"

function ManagedEditor() {
  const [readonly, setReadonly] = createSignal(false)
  const { ref, editorView } = createCodeMirror()

  createEditorReadonly(editorView, readonly)

  const { focused, setFocused } = createEditorFocus(editorView, (f) => {
    console.log("focus changed:", f)
  })

  return <div ref={ref} />
}
```

### 11.6 Lazy Extension Loading

```typescript
import { createLazyCompartmentExtension } from "solid-codemirror"
import { Show } from "solid-js"

function LazyEditor() {
  const { ref } = createCodeMirror()

  const heavyExt = createLazyCompartmentExtension(
    () => import("./heavy-extension").then(m => m.heavyExtension)
  )

  return (
    <div>
      <div ref={ref} />
      <Show when={heavyExt.loading}>Loading extensions...</Show>
    </div>
  )
}
```

### 11.7 Direct EditorView Integration (without solid-codemirror)

```typescript
import { createEffect, onCleanup, onMount } from "solid-js"
import { EditorView, basicSetup } from "codemirror"
import { EditorState } from "@codemirror/state"

function RawEditor(props: { value: string; onChange: (v: string) => void }) {
  let containerRef!: HTMLDivElement
  let view: EditorView

  onMount(() => {
    view = new EditorView({
      state: EditorState.create({
        doc: props.value,
        extensions: [
          basicSetup,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) props.onChange(update.state.doc.toString())
          })
        ]
      }),
      parent: containerRef
    })
  })

  onCleanup(() => view?.destroy())

  // Sync external value changes into the editor
  createEffect(() => {
    const newVal = props.value
    if (view && view.state.doc.toString() !== newVal) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: newVal } })
    }
  })

  return <div ref={containerRef} />
}
```

---

## 12. LSP Integration (@marimo-team/codemirror-languageserver)

### 12.1 Installation

```bash
bun add @marimo-team/codemirror-languageserver @open-rpc/client-js
```

### 12.2 Basic Usage

```typescript
import { languageServer } from "@marimo-team/codemirror-languageserver"
import { WebSocketTransport } from "@open-rpc/client-js"

const transport = new WebSocketTransport("ws://localhost:3001/lsp")

const lsExt = languageServer({
  transport,
  rootUri: "file:///",
  documentUri: "file:///query.sql",
  languageId: "sql",
  allowHTMLContent: true,       // render HTML in hover tooltips
  keyboardShortcuts: {
    rename: "F2",
    goToDefinition: "ctrlcmd"   // Ctrl/Cmd + Click
  }
})

EditorState.create({ extensions: [basicSetup, sql(), lsExt] })
```

### 12.3 Shared Client (Multiple Editors)

```typescript
import { LanguageServerClient, languageServerWithClient } from "@marimo-team/codemirror-languageserver"

const client = new LanguageServerClient({
  transport,
  rootUri: "file:///",
  workspaceFolders: [{ name: "workspace", uri: "file:///" }]
})

const editor1Ext = languageServerWithClient({
  client, documentUri: "file:///query1.sql", languageId: "sql"
})
const editor2Ext = languageServerWithClient({
  client, documentUri: "file:///query2.sql", languageId: "sql"
})
```

### 12.4 LSP Features

| Feature | LSP Method | CM6 Integration |
|---------|-----------|----------------|
| Completions | `textDocument/completion` | `autocompletion` tooltip |
| Hover | `textDocument/hover` | `hoverTooltip` (markdown rendered) |
| Diagnostics | `textDocument/publishDiagnostics` | `linter` underlines |
| Code actions | `textDocument/codeAction` | Quick-fix actions in lint |
| Rename | `textDocument/rename` | F2 keybinding |
| Go to def | `textDocument/definition` | Ctrl/Cmd+Click |
| Signature help | `textDocument/signatureHelp` | Tooltip |

---

## 13. Command Palette / App Launcher Pattern

### 13.1 Architecture Options

| Approach | Use When | CM6 Role |
|----------|----------|----------|
| **CM6 Autocompletion** | User is typing in-editor; context-aware suggestions | Primary — CM6 tooltip renders inside editor |
| **Overlay Palette** (Mantine Spotlight, cmdk) | Global Mod+K launcher; app-level navigation | CM6 may be embedded inside the palette input |
| **Hybrid** (HyperDX) | Both — search query completions + app launcher | CM6 for query input; Spotlight for navigation |

### 13.2 HyperDX Spotlight Pattern (Mantine)

```typescript
import { Spotlight } from "@mantine/spotlight"

// Actions are grouped with icons, keywords, descriptions
const actions: SpotlightActionData[] = [
  {
    id: "search",
    group: "Menu",
    leftSection: <IconLogs size={16} />,
    label: "Search",
    description: "Start a new search",
    keywords: ["log", "events"],
    onClick: () => router.push("/search"),
  },
  // Dynamic actions from API:
  ...savedSearches.map(s => ({
    id: s.id,
    group: "Saved searches",
    label: s.name,
    onClick: () => router.push(`/search/${s.id}`),
  }))
]

// Provider wraps the whole app
<Spotlight
  shortcut="mod + K"
  searchProps={{ leftSection: <IconSearch size={16} />, placeholder: "Search" }}
  nothingFound="Nothing found"
  zIndex={200001}     // above CM autocompletion tooltip
  highlightQuery
  actions={actions}
  limit={7}
  scrollable
/>
```

### 13.3 Rich Completion Info (DOM-based)

```typescript
const options: Completion[] = results.map(result => ({
  label: result.name,
  type: result.kind,
  info: () => {
    const dom = document.createElement("div")
    dom.className = "cm-completion-rich"
    dom.innerHTML = `
      <div class="completion-title">${result.name}</div>
      <div class="completion-type">${result.type}</div>
      <pre class="completion-example">${result.example}</pre>
    `
    return dom
  },
  apply: (view, completion, from, to) => {
    view.dispatch({ changes: { from, to, insert: result.insertText } })
  }
}))
```

### 13.4 Single-Line Search Input

```typescript
// Prevent Enter from inserting newlines
const singleLine = EditorState.transactionFilter.of(tr =>
  tr.newDoc.lines > 1
    ? [tr, { changes: { from: 0, to: tr.newDoc.length, insert: tr.newDoc.line(1).text } }]
    : tr
)

// Or use domEventHandlers:
EditorView.domEventHandlers({
  keydown(e) {
    if (e.key === "Enter") { e.preventDefault(); handleSearch() }
  }
})
```

---

## 14. Extension Architecture Template

Full extension bundle — the recommended pattern:

```typescript
// my-feature.ts

// 1. Configuration facet
interface MyConfig { maxItems?: number }
const myConfig = Facet.define<MyConfig, Required<MyConfig>>({
  combine: configs => ({ maxItems: configs.reduce((a, c) => c.maxItems ?? a, 10) })
})

// 2. State effects
const openEffect  = StateEffect.define<void>()
const closeEffect = StateEffect.define<void>()

// 3. State field
const panelField = StateField.define<boolean>({
  create: () => false,
  update(open, tr) {
    for (const e of tr.effects) {
      if (e.is(openEffect))  return true
      if (e.is(closeEffect)) return false
    }
    return open
  },
  provide: f => showPanel.from(f, open => open ? createPanel : null)
})

// 4. Base theme (create once at module level — NOT inside the factory)
const baseTheme = EditorView.baseTheme({
  ".cm-my-panel": { padding: "4px 8px" },
  "&dark .cm-my-panel": { background: "#161b22" },
})

// 5. Commands
export const openMyFeature: Command = view => {
  view.dispatch({ effects: openEffect.of() })
  return true
}

// 6. Public extension factory — even if no config, use a function for future-proofing
export function myFeature(config: MyConfig = {}) {
  return [
    myConfig.of(config),
    panelField,
    baseTheme,
    keymap.of([{ key: "Mod-k", run: openMyFeature }]),
  ]
}
```

---

## 15. Pitfalls and Best Practices

| Pitfall | Fix |
|---------|-----|
| Directly manipulating `.cm-editor` DOM | Use Decorations (mark/widget/replace/line) |
| Forgetting to `.map(tr.changes)` on DecorationSets | Always map first, then add/filter |
| Creating extension instances in render functions | Create once at module level; use `Compartment` for dynamic parts |
| Dispatching during a synchronous update callback | Defer with `setTimeout` or `queueMicrotask` |
| Multiple CM instance `instanceof` errors (Vite) | Add `@codemirror/state` + `@codemirror/view` to `optimizeDeps.include` |
| Setting `state.doc = ...` directly | Use transactions: `view.dispatch({ changes: { from:0, to:doc.length, insert:newContent } })` |
| Binding Tab to accept completion | Use Enter; Tab opt-in only (accessibility) |
| Reading layout in `StateField.update` | Use `ViewPlugin.update` + `view.requestMeasure` |
| Large doc `.toString()` on every keystroke | Use line iterators or `docChanges` to diff incrementally |

---

## 16. Quick API Reference

```
@codemirror/state
  EditorState.create({ doc, extensions })
  state.update(...specs) → Transaction
  state.facet(facet), state.field(field), state.doc, state.selection
  Facet.define(), StateField.define(), StateEffect.define()
  Compartment (of, reconfigure, get)
  Prec.highest/high/default/low/lowest(ext)
  Annotation.define(), Transaction.userEvent
  ChangeSet, ChangeDesc, RangeSet, RangeSetBuilder

@codemirror/view
  EditorView({ state, parent, dispatch? })
  view.dispatch(...specs), view.state, view.dom, view.destroy()
  view.viewport, view.visibleRanges, view.focus()
  EditorView.theme(spec, { dark? }), EditorView.baseTheme(spec)
  EditorView.decorations, EditorView.updateListener
  EditorView.domEventHandlers, EditorView.editorAttributes
  ViewPlugin.fromClass(class, spec?)
  Decoration.mark/widget/replace/line(spec)
  WidgetType, MatchDecorator
  keymap (Facet), showTooltip (Facet), hoverTooltip(source)
  showPanel (Facet), Panel

@codemirror/autocomplete
  autocompletion(config), completionKeymap
  startCompletion, closeCompletion, acceptCompletion, currentCompletions
  completeFromList, ifNotIn, snippetCompletion
  CompletionContext, CompletionResult, Completion, CompletionSection

@codemirror/language
  syntaxTree(state), syntaxHighlighting(style)
  HighlightStyle.define(specs), defaultHighlightStyle
  bracketMatching, indentOnInput, foldGutter, codeFolding

@codemirror/search
  search(config), searchKeymap, highlightSelectionMatches
  openSearchPanel, closeSearchPanel, findNext, findPrevious

@codemirror/lint
  linter(source, options), lintGutter(), Diagnostic
  openLintPanel, closeLintPanel, nextDiagnostic

@codemirror/lang-sql
  sql({ dialect, schema, tables, defaultTable, upperCaseKeywords })
  SQLDialect.define(spec), StandardSQL, PostgreSQL, MySQL, SQLite

@codemirror/lang-json
  json(), jsonParseLinter()

solid-codemirror
  createCodeMirror({ value, onValueChange, onModelViewUpdate, onTransactionDispatched })
  createEditorControlledValue(editorView, valueAccessor)
  createEditorReadonly(editorView, readonlyAccessor)
  createEditorFocus(editorView, callback?) → { focused, setFocused }
  createLazyCompartmentExtension(() => Promise<Extension>)

@marimo-team/codemirror-languageserver
  languageServer({ transport, rootUri, documentUri, languageId, ... })
  languageServerWithClient({ client, documentUri, languageId })
  LanguageServerClient({ transport, rootUri, workspaceFolders })
  WebSocketTransport(url)  [from @open-rpc/client-js]
```

---

## 17. Documentation Sources

- System Guide: https://codemirror.net/docs/guide/
- API Reference: https://codemirror.net/docs/ref/
- Examples: https://codemirror.net/examples/
- solid-codemirror: https://github.com/riccardoperra/solid-codemirror
- codemirror-languageserver: https://github.com/marimo-team/codemirror-languageserver
- jdocmunch index: `codemirror/website` (use for deep reference queries)
- jcodemunch index: `local/hyperdx-research-a3ed49a3` (HyperDX real-world patterns)

---

## 18. Search Bar Architecture

This section documents the domain-specific search bar design: a CM6-powered input that combines
**badge decorations**, a **context finite-state machine**, **routed completion sources**, and
**live-preview panels**.

### 18.1 Search Grammar

```
input     ::= (segment SP)* segment?
segment   ::= badge | freetext
badge     ::= key ":" value
key       ::= [a-zA-Z_][a-zA-Z0-9_]*
value     ::= [^ ]+
freetext  ::= [^ :]+
```

Special `key` values that activate modes:
| Key token         | Mode activated          | Completion style      |
|-------------------|-------------------------|-----------------------|
| `search:logs`     | Log field mode          | Property/value pairs  |
| `search:query_logs` | SQL mode              | SQL keywords + schema |
| `search:<other>`  | Named context mode      | Context-specific      |
| *(no search:key)* | Global search           | Cross-category        |

---

### 18.2 Context State Field (FSM)

```typescript
// The parsed search context derived from document content
export type SearchMode =
  | { kind: "global" }
  | { kind: "logs" }
  | { kind: "query_logs" }
  | { kind: "named"; name: string };

export interface SearchContext {
  mode: SearchMode;
  // Position just after "search:<mode> " — where field completions begin
  fieldStart: number | null;
  // The badge token the cursor is currently inside, if any
  activeBadge: { key: string; value: string; from: number; to: number } | null;
}

function parseContext(doc: Text, cursorPos: number): SearchContext {
  const text = doc.toString();
  const modeMatch = text.match(/\bsearch:(\S+)/);
  if (!modeMatch) return { mode: { kind: "global" }, fieldStart: null, activeBadge: null };

  const modeName = modeMatch[1];
  const fieldStart = modeMatch.index! + modeMatch[0].length + 1;

  let mode: SearchMode;
  if (modeName === "logs") mode = { kind: "logs" };
  else if (modeName === "query_logs") mode = { kind: "query_logs" };
  else mode = { kind: "named", name: modeName };

  // Find badge the cursor sits inside
  const badgeRe = /(\w+):(\S+)/g;
  let activeBadge = null;
  let m: RegExpExecArray | null;
  while ((m = badgeRe.exec(text)) !== null) {
    if (cursorPos >= m.index && cursorPos <= m.index + m[0].length) {
      activeBadge = { key: m[1], value: m[2], from: m.index, to: m.index + m[0].length };
      break;
    }
  }

  return { mode, fieldStart, activeBadge };
}

export const searchContextField = StateField.define<SearchContext>({
  create(state) {
    return parseContext(state.doc, state.selection.main.head);
  },
  update(value, tr) {
    if (!tr.docChanged && !tr.selection) return value;
    return parseContext(tr.newDoc, tr.newSelection.main.head);
  },
});
```

---

### 18.3 Badge Widget Decoration

Replaces raw `key:value` tokens with a styled badge. The original text is hidden via
`Decoration.replace()`; the badge widget renders in its place.

```typescript
class BadgeWidget extends WidgetType {
  constructor(readonly key: string, readonly value: string) { super(); }

  eq(other: BadgeWidget) {
    return other.key === this.key && other.value === this.value;
  }

  toDOM() {
    const wrap = document.createElement("span");
    wrap.className = "cm-search-badge";
    const k = document.createElement("span");
    k.className = "cm-search-badge__key";
    k.textContent = this.key;
    const v = document.createElement("span");
    v.className = "cm-search-badge__value";
    v.textContent = this.value;
    wrap.append(k, document.createTextNode(":"), v);
    return wrap;
  }

  ignoreEvent() { return false; } // allow click-to-edit
}

// ViewPlugin that builds badge decorations for ALL complete key:value tokens
// EXCEPT the one the cursor is currently inside (allow editing it as raw text)
const badgeDecorationPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) { this.decorations = this.build(view); }
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet) {
        this.decorations = this.build(update.view);
      }
    }
    build(view: EditorView): DecorationSet {
      const ctx = view.state.field(searchContextField);
      const cursorPos = view.state.selection.main.head;
      const builder = new RangeSetBuilder<Decoration>();
      const text = view.state.doc.toString();
      const re = /(\w+):(\S+)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const from = m.index, to = m.index + m[0].length;
        // Skip the badge the cursor is inside — let it remain editable
        if (cursorPos >= from && cursorPos <= to) continue;
        // Skip the search: mode badge itself (keep it as-is or style differently)
        if (m[1] === "search") continue;
        builder.add(from, to, Decoration.replace({
          widget: new BadgeWidget(m[1], m[2]),
        }));
      }
      return builder.finish();
    }
  },
  { decorations: (v) => v.decorations }
);
```

CSS to go with it:
```css
.cm-search-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 4px;
  overflow: hidden;
  font-size: 0.85em;
  cursor: pointer;
}
.cm-search-badge__key {
  background: var(--badge-key-bg, #3b82f6);
  color: #fff;
  padding: 1px 5px;
}
.cm-search-badge__value {
  background: var(--badge-value-bg, #1e40af);
  color: #fff;
  padding: 1px 5px;
}
```

---

### 18.4 Routed Completion Sources

A single entry-point `CompletionSource` reads the `searchContextField` and delegates:

```typescript
// Source A: search mode picker — fires after "search:"
const searchModePicker: CompletionSource = (ctx) => {
  const m = ctx.matchBefore(/\bsearch:(\w*)$/);
  if (!m) return null;
  return {
    from: m.from + "search:".length,
    options: [
      { label: "logs",        detail: "Log field search",   boost: 10 },
      { label: "query_logs",  detail: "SQL query on logs",  boost: 9  },
      { label: "metrics",     detail: "Metrics search",     boost: 8  },
      { label: "traces",      detail: "Trace search",       boost: 8  },
    ],
    validFor: /^\w*$/,
  };
};

// Source B: log field completions — fires inside search:logs context
function makeLogFieldSource(fields: string[]): CompletionSource {
  return (ctx) => {
    const searchCtx = ctx.state.field(searchContextField);
    if (searchCtx.mode.kind !== "logs") return null;
    const m = ctx.matchBefore(/(\w*)$/);
    if (!m || (m.from === m.to && !ctx.explicit)) return null;
    return {
      from: m.from,
      options: fields.map((f) => ({ label: f, type: "property" })),
      validFor: /^\w*$/,
    };
  };
}

// Source C: SQL completions — fires inside search:query_logs context
// Delegates to @codemirror/lang-sql's built-in completion + custom schema
function makeSqlSource(schema: SQLConfig["schema"]): CompletionSource {
  return (ctx) => {
    const searchCtx = ctx.state.field(searchContextField);
    if (searchCtx.mode.kind !== "query_logs") return null;
    // Return null to let the sql() language extension handle it natively;
    // the Compartment swap (§18.5) loads the correct SQL extension when in this mode.
    return null;
  };
}

// Master router — registered via autocompletion({ override: [...] })
export function makeSearchCompletionRouter(
  logFields: string[],
  sqlSchema: SQLConfig["schema"]
): Extension {
  return autocompletion({
    override: [
      searchModePicker,
      makeLogFieldSource(logFields),
      makeSqlSource(sqlSchema),
    ],
    defaultKeymap: true,
    activateOnTyping: true,
  });
}
```

---

### 18.5 Language Compartment Swap on Mode Change

When the user enters `search:query_logs` the editor should become SQL-aware. Use a `Compartment`
that swaps the active language extension in response to context changes.

```typescript
const languageCompartment = new Compartment();

// Initial language — plain text or a lightweight token highlighter
const baseLanguage = languageCompartment.of([]);

// ViewPlugin that watches context changes and dispatches compartment reconfigurations
const languageSwapPlugin = ViewPlugin.fromClass(class {
  lastMode: string = "global";

  update(update: ViewUpdate) {
    const ctx = update.state.field(searchContextField);
    const modeName =
      ctx.mode.kind === "named" ? ctx.mode.name : ctx.mode.kind;

    if (modeName === this.lastMode) return;
    this.lastMode = modeName;

    // Async-safe: schedule the reconfigure as a separate transaction
    Promise.resolve().then(() => {
      let lang: Extension = [];
      if (modeName === "query_logs") {
        lang = clickhouseSql({ schema: getSchema() });
      }
      update.view.dispatch({
        effects: languageCompartment.reconfigure(lang),
      });
    });
  }
});
```

---

### 18.6 Live-Preview Panel System

Two panel variants share the same `showPanel` facet mechanism.

#### Page-context-aware (single-category) panel

```typescript
// Panel content is a SolidJS island mounted into the CM panel DOM node
const contextPreviewPanel = showPanel.of((view) => {
  const dom = document.createElement("div");
  dom.className = "cm-search-preview-panel";

  // Mount SolidJS component
  const dispose = render(
    () => <SearchPreviewPanel view={view} />,
    dom
  );

  return {
    dom,
    update(update) {
      // Trigger SolidJS reactive update via a shared signal/store
      previewStore.setContext(update.state.field(searchContextField));
    },
    destroy() { dispose(); },
  };
});
```

#### Global (multi-category) panel

When no `search:` key is present, render multiple result categories:

```typescript
// Driven by a StateField that holds preview visibility
export const previewPanelField = StateField.define<boolean>({
  create: () => false,
  update(show, tr) {
    const ctx = tr.state.field(searchContextField);
    return ctx.mode.kind !== "global"
      ? true   // show when a mode is active
      : show;
  },
  provide: (f) =>
    showPanel.from(f, (show) =>
      show ? buildPreviewPanel : null
    ),
});

function buildPreviewPanel(view: EditorView): Panel {
  const dom = document.createElement("div");
  dom.className = "cm-search-preview-global";
  const dispose = render(() => <GlobalSearchPreview view={view} />, dom);
  return {
    dom,
    update(update) {
      previewStore.setQuery(update.state.doc.toString());
      previewStore.setContext(update.state.field(searchContextField));
    },
    destroy() { dispose(); },
  };
}
```

`GlobalSearchPreview` renders a column-per-category layout:
- Logs
- Metrics
- Traces
- Dashboards
- Saved searches

Each category independently streams results via a SolidJS resource or signal.

---

### 18.7 Putting It Together — Extension Bundle

```typescript
export function createSearchBarExtensions(config: {
  logFields: string[];
  sqlSchema: SQLConfig["schema"];
  pageContext: "logs" | "metrics" | "traces" | "global";
}): Extension[] {
  return [
    // Core state
    searchContextField,

    // Badge rendering
    badgeDecorationPlugin,

    // Language swap
    baseLanguage,
    languageSwapPlugin,

    // Completions
    makeSearchCompletionRouter(config.logFields, config.sqlSchema),

    // Live preview panel
    previewPanelField,

    // Theming
    EditorView.baseTheme({
      ".cm-search-preview-panel, .cm-search-preview-global": {
        borderTop: "1px solid var(--cm-panel-border)",
        padding: "8px",
        maxHeight: "320px",
        overflowY: "auto",
      },
    }),
  ];
}
```

---

### 18.8 Implementation Checklist

- [ ] `searchContextField` — parses doc → `SearchContext` on every doc/selection change
- [ ] `badgeDecorationPlugin` — replaces completed `key:value` tokens with `BadgeWidget`
- [ ] `searchModePicker` — completes `search:<mode>` tokens
- [ ] `makeLogFieldSource` — field name completions in `logs` mode
- [ ] SQL completions — active via `languageCompartment` swap in `query_logs` mode
- [ ] `languageSwapPlugin` — reconfigures language compartment on mode transition
- [ ] `contextPreviewPanel` / `GlobalSearchPreview` — live result panels
- [ ] `previewPanelField` — controls panel visibility from context state
- [ ] CSS for `.cm-search-badge`, `.cm-search-preview-*`
- [ ] Hover tooltip on badges to show edit affordance or detail

---

## 19. Lezer Grammar Ecosystem

### 19.1 Decision Guide — When to Use What

```
Need folding / tree-based indentation?      → Full Lezer .grammar file
Need autocomplete driven by parse tree?     → Full Lezer .grammar file
Mixed languages (SQL inside template)?      → Lezer grammar + parseMixed()
Only token-level highlighting?              → StreamLanguage.define()
Porting a CodeMirror 5 mode?               → StreamLanguage.define() (near drop-in)
key:value / search token syntax?           → StreamLanguage.define()  ← simplest path
```

### 19.2 `StreamLanguage` for Search Token Grammar

Simplest path for the `key:value` search bar — no grammar file, no build step:

```typescript
import { StreamLanguage, LanguageSupport } from "@codemirror/language"
import { tags as t, Tag } from "@lezer/highlight"
import { StringStream } from "@codemirror/language"

const keyTag   = Tag.define(t.attributeName)
const valueTag = Tag.define(t.attributeValue)

interface SearchState { inValue: boolean }

const searchStreamParser = {
  name: "search",
  startState(): SearchState { return { inValue: false } },
  copyState(s: SearchState): SearchState { return { ...s } },

  token(stream: StringStream, state: SearchState): string | null {
    if (stream.eatSpace()) return null
    if (stream.eat("-")) return "operator"
    if (stream.eat('"')) {
      while (!stream.eol()) {
        const ch = stream.next()
        if (ch === '"') break
        if (ch === '\\') stream.next()
      }
      return "string"
    }
    if (stream.match(/^[\w-]+(?=:)/, true)) { state.inValue = true; return "attributeName" }
    if (stream.eat(":")) return "punctuation"
    if (stream.eatWhile(/[^\s"]/)) {
      const was = state.inValue; state.inValue = false
      return was ? "attributeValue" : "string"
    }
    stream.next(); return null
  }
}

export const searchLanguage = StreamLanguage.define(searchStreamParser)
export function searchTokenLanguage(): LanguageSupport {
  return new LanguageSupport(searchLanguage)
}
```

### 19.3 Full LR Grammar Skeleton (when tree is needed)

```
# src/search.grammar
@top SearchInput { (Badge | FreeText | space)* }

Badge { FieldName ":" FieldValue }

@tokens {
  FieldName  { @asciiLetter ($[a-zA-Z0-9_\-])* }
  FieldValue { $[^ \t\n]+ }
  FreeText   { $[^ \t\n:]+ }
  space      { $[ \t\n]+ }
  ":"
}
@skip { space }
```

```typescript
// src/index.ts
import { parser } from "./search.grammar"   // Rollup lezer plugin compiles this
import { LRLanguage, LanguageSupport } from "@codemirror/language"
import { styleTags, tags as t } from "@lezer/highlight"

export const searchLanguage = LRLanguage.define({
  name: "search",
  parser: parser.configure({
    props: [
      styleTags({
        FieldName:  t.attributeName,
        FieldValue: t.attributeValue,
        FreeText:   t.string,
        ":":        t.punctuation,
      })
    ]
  })
})

export function searchLang(): LanguageSupport {
  return new LanguageSupport(searchLanguage)
}
```

```js
// rollup.config.js
import { lezer } from "@lezer/generator/rollup"
export default { input: "./src/index.ts", plugins: [lezer()] }
```

### 19.4 `styleTags` + `tags` Quick Reference

```typescript
import { styleTags, tags as t } from "@lezer/highlight"

// Most-used tags for a search/query language:
styleTags({
  "if else for return":    t.keyword,
  "true false null":       t.bool,
  VariableName:            t.variableName,
  "CallExpr/VariableName": t.function(t.variableName),
  Number:                  t.number,
  String:                  t.string,
  Comment:                 t.lineComment,
  FieldName:               t.attributeName,
  FieldValue:              t.attributeValue,
  "{ }":                   t.brace,
  "( )":                   t.paren,
  ":":                     t.punctuation,
  ",":                     t.separator,
})

// Custom tags (inherit from standard for theme fallback):
const myTag = Tag.define(t.keyword)  // falls back to keyword styling
```

### 19.5 `syntaxTree()` — Walking the Parse Tree

```typescript
import { syntaxTree } from "@codemirror/language"

// Resolve innermost node at cursor
const node = syntaxTree(view.state).resolve(pos, -1)
console.log(node.name, node.from, node.to)

// Full traversal
syntaxTree(view.state).cursor().iterate(node => {
  if (node.name === "FieldName") {
    const text = view.state.sliceDoc(node.from, node.to)
    // validate, decorate, etc.
  }
})
```

---

## 20. @codemirror/lint — Deep Dive

### 20.1 Core API

```typescript
// linter() — main extension factory
linter(
  source: ((view: EditorView) => readonly Diagnostic[] | Promise<readonly Diagnostic[]>) | null,
  config?: {
    delay?: number           // debounce ms after last change (default: 750)
    needsRefresh?: (update: ViewUpdate) => boolean
    markerFilter?: (diags: readonly Diagnostic[], state: EditorState) => Diagnostic[]
    tooltipFilter?: (diags: readonly Diagnostic[], state: EditorState) => Diagnostic[]
    autoPanel?: boolean      // auto-open panel when errors exist
  }
) → Extension

// setDiagnostics() — inject from external source (LSP, server)
setDiagnostics(state: EditorState, diagnostics: readonly Diagnostic[]) → TransactionSpec
view.dispatch(setDiagnostics(view.state, myDiags))

// Diagnostic interface
interface Diagnostic {
  from: number
  to: number
  severity: "error" | "warning" | "info" | "hint"
  message: string
  source?: string        // label in panel (e.g. "field-validator")
  markClass?: string     // extra CSS class on underlined range
  renderMessage?: (view: EditorView) => Node
  actions?: Array<{
    name: string
    apply(view: EditorView, from: number, to: number): void
  }>
}
```

### 20.2 Inline Badge Validation — Synchronous Pattern

For `key:value` tokens, validate synchronously (delay: 0) using `syntaxTree`:

```typescript
import { linter, Diagnostic } from "@codemirror/lint"
import { syntaxTree } from "@codemirror/language"

const VALID_FIELDS = new Set(["status", "assignee", "label", "priority"])

const fieldValidator = linter((view) => {
  const diags: Diagnostic[] = []
  syntaxTree(view.state).cursor().iterate(node => {
    if (node.name !== "FieldName") return
    const name = view.state.sliceDoc(node.from, node.to)
    if (!VALID_FIELDS.has(name)) {
      diags.push({
        from: node.from, to: node.to,
        severity: "error",
        source: "field-validator",
        message: `Unknown field "${name}"`,
        markClass: "cm-invalid-field",
        actions: [{
          name: "Remove",
          apply(view, from, to) {
            // also remove the :value portion
            const rest = view.state.doc.sliceString(to, to + 200)
            const end = rest.search(/\s|$/)
            view.dispatch({ changes: { from, to: to + end, insert: "" } })
          }
        }]
      })
    }
  })
  return diags
}, { delay: 0 })
```

```css
.cm-invalid-field {
  background: #fee2e2;
  border: 1px solid #f87171;
  border-radius: 3px;
  padding: 0 2px;
  color: #b91c1c;
}
```

### 20.3 Async Lint with Abort Signal

```typescript
let controller: AbortController | null = null

const asyncLinter = linter(async (view) => {
  controller?.abort()
  controller = new AbortController()
  const { signal } = controller
  try {
    const issues = await fetch("/api/lint", {
      method: "POST",
      body: JSON.stringify({ code: view.state.doc.toString() }),
      signal,
    }).then(r => r.json())
    return issues.map((i: any) => ({
      from: i.offset, to: i.offset + i.length,
      severity: i.severity, message: i.message, source: "server"
    }))
  } catch (e) {
    if ((e as Error).name === "AbortError") return []
    throw e
  }
}, { delay: 400 })
```

### 20.4 Gutter + Commands

```typescript
import { lintGutter, lintKeymap, openLintPanel, forEachDiagnostic } from "@codemirror/lint"
import { keymap } from "@codemirror/view"

// Extensions
[linter(mySource), lintGutter(), keymap.of(lintKeymap)]

// Programmatic panel toggle
openLintPanel(view)   // Ctrl-Shift-m

// Iterate current diagnostics (use callback from/to for mapped positions)
forEachDiagnostic(view.state, (d, from, to) => {
  console.log(d.severity, from, to, d.message)
})
```

---

## 21. @codemirror/search — Internals & Custom Panel

### 21.1 `search()` Extension

```typescript
search(config?: {
  top?: boolean           // panel position (default: bottom)
  caseSensitive?: boolean
  createPanel?: (view: EditorView) => Panel   // replace built-in UI
}) → Extension
```

### 21.2 `SearchQuery` + Commands

```typescript
import { SearchQuery, getSearchQuery, setSearchQuery,
         findNext, findPrevious, selectMatches,
         replaceNext, replaceAll, searchKeymap } from "@codemirror/search"

// Read current query
const q = getSearchQuery(view.state)

// Update query programmatically
view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: "TODO", regexp: false })) })

// Navigate
findNext(view)
findPrevious(view)

// Iterate all matches programmatically
const cursor = new SearchQuery({ search: "error" }).getCursor(view.state)
for (const { from, to } of cursor) { console.log(from, to) }
```

### 21.3 Multiple Panels Coexist

The `showPanel` facet is additive — search panel and custom preview panels stack:

```typescript
import { search } from "@codemirror/search"

const extensions = [
  search({ top: true }),   // search panel at top
  previewPanelField,       // custom preview panel at bottom — no conflict
]
```

### 21.4 Custom Search Panel via `createPanel`

The primary input **must** have `main-field="true"` — `openSearchPanel` calls `.focus()` on it:

```typescript
import { search, getSearchQuery, setSearchQuery, SearchQuery,
         findNext, findPrevious } from "@codemirror/search"

function myPanel(view: EditorView): Panel {
  const dom = document.createElement("div")
  dom.className = "my-search-panel"

  const input = dom.appendChild(document.createElement("input"))
  input.setAttribute("main-field", "true")   // REQUIRED
  input.placeholder = "Search…"

  input.addEventListener("input", () => {
    view.dispatch({ effects: setSearchQuery.of(
      new SearchQuery({ search: input.value })
    )})
  })
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.shiftKey ? findPrevious(view) : findNext(view) }
  })

  return {
    dom, top: true,
    update(update) {
      // Sync if query changed externally
      for (const tr of [update.transactions])
        for (const e of tr.effects)
          if (e.is(setSearchQuery) && input.value !== e.value.search)
            input.value = e.value.search
    }
  }
}

search({ createPanel: myPanel })
```

### 21.5 CSS Classes

| Class | Element |
|---|---|
| `.cm-search` | panel wrapper |
| `.cm-textfield` | `<input>` fields |
| `.cm-button` | `<button>` elements |
| `.cm-searchMatch` | match highlights in document |
| `.cm-searchMatch-selected` | active/focused match |

---

## 22. HyperDX Filter Patterns (Reference Implementation)

### 22.1 `FilterState` — In-Memory Representation

```typescript
// Each field maps to: included set (IN), excluded set (NOT IN), optional range (BETWEEN)
type FilterState = {
  [fieldName: string]: {
    included: Set<string | boolean>
    excluded: Set<string | boolean>
    range?: { min: number; max: number }
  }
}
```

### 22.2 `filtersToQuery` — FilterState → SQL strings

```typescript
// status: { included: Set(['200','201']) } → "status IN ('200', '201')"
// status: { excluded: Set(['500']) }       → "status NOT IN ('500')"
// duration: { range: {min:100, max:500} }  → "duration BETWEEN 100 AND 500"
// booleans emitted unquoted: true / false
```

### 22.3 `parseQuery` — SQL → FilterState

Only processes `{ type: 'sql' }` filter objects. Regex for BETWEEN:
`/^(.+?)\s+BETWEEN\s+(.+?)\s+AND\s+(.+?)$/i`

For IN/NOT IN: quote-aware split on ` AND `, then split each part on ` IN ` / ` NOT IN `.

### 22.4 URL Serialization — `nuqs` Pattern

```typescript
import { useQueryStates, parseAsStringEncoded, parseAsJsonEncoded } from "nuqs"

type Filter =
  | { type: "sql"; condition: string }
  | { type: "sql_ast"; operator: "=" | "<" | ">"; left: string; right: string }

const [config, setConfig] = useQueryStates({
  source:        parseAsString,
  where:         parseAsStringEncoded,           // encodeURIComponent
  whereLanguage: parseAsStringEnum(["sql", "lucene"]),
  filters:       parseAsJsonEncoded<Filter[]>(), // encodeURIComponent(JSON.stringify(...))
  orderBy:       parseAsStringEncoded,
})
```

Double-encoding (`encodeURIComponent`) prevents Teams/Outlook from re-encoding `+` as `%2B`.

### 22.5 Saved Search Schema

```typescript
// Wire format (zod schema from @hyperdx/common-utils):
type SavedSearch = {
  id: string
  name: string
  select: string
  where: string
  whereLanguage: "sql" | "lucene"
  source: string            // data source UUID
  orderBy: string
  filters: Filter[]
  tags: string[]
  alerts?: Alert[]
}
```

### 22.6 Saved Search CRUD (React Query pattern)

```typescript
// All operations share one cache key — fetch-once, filter client-side
const { data: allSearches } = useQuery({ queryKey: ["saved-search"], queryFn: api.getSavedSearches })
const saved = allSearches?.find(s => s.id === targetId)

// Mutations invalidate the shared key
const create = useMutation({ mutationFn: api.createSavedSearch,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-search"] }) })
```

### 22.7 Local-Mode Storage Pattern

```typescript
// For offline/local saved searches — atomic localStorage via store2
export const localSavedSearches = createEntityStore<SavedSearch>("hdx-local-saved-searches")
// store2.transact() for atomic writes
// IDs: Math.abs(hashCode(Math.random().toString())).toString(16)
```

### 22.8 Field Typeahead Pattern (HyperDX)

```typescript
// Per-table connection metadata (React Query cached, stale-while-revalidate)
const fields = useTableMetadata({ connectionId, databaseName, tableName })

// CM6 completions built from metadata
const completions = useSqlSuggestions({ tableConnection, whereLanguage })
// → returns Extension[] including autocompletion({ override: [columnSource, keywordSource] })
```

### 22.9 Debounce

```typescript
import { useDebouncedCallback } from "@mantine/hooks"
// OR in SolidJS:
import { debounce } from "@solid-primitives/scheduled"

const debouncedSearch = debounce((query: string) => setSearchQuery(query), 400)
```

---

## 23. Completions Cache Architecture — @tanstack/solid-db

### 23.1 Hybrid Strategy (Recommended)

| Data | Tool | Why |
|------|------|-----|
| Search mode registry | `createStore` / plain array | Static, never changes, no persistence |
| Log field names (per source) | TanStack Query `staleTime: Infinity` | Server-fetched, simple array, no local writes |
| SQL columns (per schema) | TanStack Query `staleTime: Infinity` | Same as above |
| Saved searches | `@tanstack/solid-db` + `localStorageCollectionOptions` | Needs persistence, optimistic mutations, cross-tab sync |

Use `@tanstack/solid-db` as a unified solution when reactive **cross-collection joins** are needed.

### 23.2 `@tanstack/solid-db` — Core Primitives

```typescript
import { createCollection } from "@tanstack/solid-db"
import { localStorageCollectionOptions } from "@tanstack/db"
import { queryCollectionOptions } from "@tanstack/query-db-collection"
import { useLiveQuery } from "@tanstack/solid-db"
import { eq, and } from "@tanstack/db"
```

#### Log fields collection (server-synced via TanStack Query adapter)

```typescript
const logFieldsCollection = createCollection(
  queryCollectionOptions({
    queryKey: ["completions", "log-fields"],
    queryFn: () => api.getAllLogFields(),   // { source, name, type }[]
    getKey: (f) => `${f.source}::${f.name}`,
    syncMode: "eager",                     // <10k rows
  })
)
```

#### Saved searches collection (localStorage-persisted, cross-tab sync)

```typescript
const savedSearchesCollection = createCollection(
  localStorageCollectionOptions({
    storageKey: "completions:saved-searches",
    getKey: (s) => s.id,
    onInsert: async ({ transaction }) => api.saveFavorite(transaction.mutations[0].modified),
    onDelete: async ({ transaction }) => api.deleteFavorite(transaction.mutations[0].key),
  })
)

// Optimistic mutation (instant UI, async persist, auto-rollback on failure)
savedSearchesCollection.insert({ id: crypto.randomUUID(), label: "My search", query: "status:open" })
savedSearchesCollection.delete(id)
```

### 23.3 `useLiveQuery` in SolidJS

```typescript
// Returns Accessor<T[]> with reactive properties
const completions = useLiveQuery((q) =>
  q.from({ f: logFieldsCollection })
   .where(({ f }) => eq(f.source, activeSource()))   // Signal auto-tracked
   .orderBy(({ f }) => f.name, "asc")
)

// completions()           → T[]
// completions.isLoading   → boolean
// completions.isReady     → boolean
// completions.state       → ReactiveMap<key, T>  (fine-grained)

// Cross-collection join
const enriched = useLiveQuery((q) =>
  q.from({ saved: savedSearchesCollection })
   .join({ modes: searchModeRegistry }, ({ saved, modes }) => eq(saved.modeId, modes.id), "inner")
   .select(({ saved, modes }) => ({ id: saved.id, label: saved.label, modeLabel: modes.label }))
)
```

### 23.4 Wiring to CM6 Completion Source

```typescript
function makeCompletionsFromDB(): CompletionSource {
  // Capture the reactive query result outside CM6 (SolidJS context required)
  return (ctx) => {
    const m = ctx.matchBefore(/\w*$/)
    if (!m) return null
    const prefix = m.text.toLowerCase()

    // Read from the reactive collection — must be called from SolidJS reactive context
    // Pass completions in via Compartment reconfiguration when they change (see §18.5)
    return {
      from: m.from,
      options: cachedFields
        .filter(f => f.name.startsWith(prefix))
        .map(f => ({ label: f.name, detail: f.type, type: "property" })),
      validFor: /^\w*$/,
    }
  }
}

// In SolidJS component: watch the collection, reconfigure the editor when it changes
createEffect(() => {
  const fields = logFields()  // reactive
  if (!editorView()) return
  editorView()!.dispatch({
    effects: completionsCompartment.reconfigure(
      autocompletion({ override: [makeStaticSource(fields)] })
    )
  })
})
```

### 23.5 Persistence Options

| Package | Storage | Limit | Cross-tab |
|---------|---------|-------|-----------|
| `localStorageCollectionOptions` (built-in) | `localStorage` | ~5MB | Yes (storage events) |
| `@tanstack/browser-db-sqlite-persistence` | SQLite WASM | Large | No |
| TanStack Query in-memory | Memory only | RAM | No |

### 23.6 Key Caveats

- No `startsWith`/`LIKE` operator — prefix filter in JavaScript post-query
- No built-in IndexedDB — use SQLite WASM adapter for larger datasets
- `useLiveQuery` returns an `Accessor`, not a plain value — never destructure it
- Package is beta (v0.6.x) — API stable but may shift
- `@tanstack/solid-db` bundle: 5.4MB unpacked, tree-shakeable
