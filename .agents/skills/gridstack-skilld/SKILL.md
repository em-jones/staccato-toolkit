---
name: gridstack-skilld
description:
  'ALWAYS use when writing code importing "gridstack". Consult for debugging, best practices, or
  modifying gridstack, gridstack.js.'
metadata:
  version: 12.4.2
  generated_by: Anthropic · Haiku 4.5
  generated_at: 2026-03-26
---

# gridstack/gridstack.js `gridstack@12.4.2`

**Tags:** latest: 12.4.2

**References:** [package.json](./.skilld/pkg/package.json) • [README](./.skilld/pkg/README.md) •
[Docs](./.skilld/docs/_INDEX.md) • [Issues](./.skilld/issues/_INDEX.md) •
[Releases](./.skilld/releases/_INDEX.md)

## Search

Use `skilld search "query" -p gridstack` instead of grepping `.skilld/` directories. Run
`skilld search --guide -p gridstack` for full syntax, filters, and operators.

<!-- skilld:api-changes -->

## API Changes

This section documents version-specific API changes — prioritize recent major/minor releases.

- BREAKING: CSS variables migration (v12.0.0) — Removed dynamic stylesheet generation; all column
  sizing now uses browser CSS variables. `gridstack-extra.css` no longer exists or is needed. Custom
  column CSS classes no longer required [source](./.skilld/releases/v12.0.0.md)

- BREAKING: ES5 support removed (v12.1.0) — Dropped ES5 support entirely; v12 no longer distributes
  ES5 versions. IE and older browsers no longer supported
  [source](./.skilld/releases/v12.1.0.md:L13)

- BREAKING: Legacy column options removed (v12.1.0) — Removed `disableOneColumnMode`,
  `oneColumnSize`, and `oneColumnModeDomSort` options. Use `columnOpts: { breakpoints: [...] }`
  instead [source](./.skilld/releases/v12.1.0.md:L14)

- NEW: `.grid-stack-dragging` CSS class (v12.3.0) — Added to grid container when any child is being
  dragged; enables `cursor:grabbing` styling during drag operations
  [source](./.skilld/releases/v12.3.0.md:L9)

- NEW: `updateOptions(o: GridStackOptions)` method (v11.5.0+) — Update partial grid options after
  initialization without recreating the grid. Method does not mutate the input object
  [source](./.skilld/releases/v11.5.0.md:L10)

- NEW: Subgrid event propagation (v12.1.0) — Nested grid events now propagate to the topmost parent
  grid. Access `el.gridstackNode.grid` to identify which grid originated the event
  [source](./.skilld/releases/v12.1.0.md:L9)

- NEW: `prepareDragDrop(el, force?)` method (v11.5.0) — Force re-creation of drag/drop event
  bindings for an element. Useful after DOM modifications [source](./.skilld/releases/v11.5.0.md:L9)

- NEW: `GridStack.updateCB` callback (v12.2.1) — Called after widget is updated during `load()`
  operations (distinct from creation). Use for post-update framework integration
  [source](./.skilld/releases/v12.2.1.md)

- NEW: Custom resize handle target (v12.4.1) — Added support for custom resize div element
  targeting, allowing control over which elements trigger resize behavior
  [source](./.skilld/releases/v12.4.1.md:L9)

- ENHANCED: `save(columnCount?)` parameter (v12.3.1) — Save grid layout for a specific column count.
  Nested grids now use container's saved column count for consistency
  [source](./.skilld/releases/v12.3.1.md:L9)

- BEHAVIORAL: `updateOptions()` input not mutated (v12.1.0) — Unlike some setters, `updateOptions()`
  now only processes specified fields without modifying the input object
  [source](./.skilld/releases/v12.1.0.md:L10)

**Also changed:** `resizeToContent()` nested grid fix v12.1 · `resizeToContentCheck()` blocking
behavior v12.1 · Touch device event fix v12.4.2 · Custom resize div handling v12.4.1 · `minRow`
option constraints v12.2.2 · Widget re-initialization position fix v12.4.1

<!-- /skilld:api-changes -->

<!-- skilld:best-practices -->

## Best Practices

- Use `batchUpdate()` when adding multiple widgets to prevent unnecessary layout recalculations and
  get a single change event — wrap multiple `addWidget()` calls between `batchUpdate(true)` and
  `batchUpdate(false)` [source](./.skilld/pkg/dist/gridstack.d.ts:L224-226)

- Use `updateOptions()` to modify grid options after creation instead of recreating the grid —
  supports partial option updates without side effects [source](./.skilld/releases/v11.5.0.md)

- No need for `gridstack-extra.css` in v12+ — CSS variables eliminated the need for custom column
  classes. Nested grids automatically use column sizing [source](./.skilld/releases/v12.0.0.md)

- Define nested grids via API options and `GridStack.addGrid()` rather than initializing from DOM —
  the library focuses on dynamic API-based nesting for better control and compatibility
  [source](./.skilld/issues/issue-2554.md)

- Enable `float(true)` for grids with large widget counts (>200) — `float:true` provides
  significantly better performance than `float:false` for dense layouts
  [source](./.skilld/issues/issue-1924.md)

- Check `isIgnoreChangeCB()` when implementing dirty flags or tracking state changes — returns true
  during column changes, sizeToContent, or loading operations
  [source](./.skilld/releases/v11.3.0.md)

- Call `prepareDragDrop(el)` after framework-rendered content is added to widgets — necessary for
  Angular, React, and Vue when adding content dynamically after initial grid creation
  [source](./.skilld/releases/v11.4.0.md)

- Use `.grid-stack-dragging` CSS class selector to customize cursor during drag operations — the
  grid automatically adds this class during drag, allowing for `cursor: grabbing` styling
  [source](./.skilld/releases/v12.3.0.md)

- Set `layout: 'list'` option for nested grids to control reflow behavior during parent resize —
  prevents unwanted reordering of items in subgrids [source](./.skilld/releases/v11.1.0.md)

- Use `el.gridstackNode.grid` to identify which grid (parent or nested) sent an event — nested grid
  events now propagate to the topmost grid, allowing centralized event handling
  [source](./.skilld/releases/v12.1.0.md)

- Pass `column` parameter to `save()` when using responsive layouts — ensures serialized layout
  preserves responsive behavior across different breakpoints and screen sizes
  [source](./.skilld/pkg/doc/API.md:L180-182)

- Avoid `transform: scale()` CSS on grid containers when dragging widgets between grids — causes
position tracking to fail when dragging items out and back in due to unscaled coordinate tracking
[source](./.skilld/issues/issue-2575.md)
<!-- /skilld:best-practices -->

<!-- skilld:custom -->

## No Idea

GridStack is a **drag-and-drop responsive dashboard grid library** with zero external dependencies.
Start with `GridStack.init()` to convert a `.grid-stack` container into a responsive layout engine.

### Quick Start Patterns

**Initialize & add widgets:**

```js
const grid = GridStack.init();
grid.addWidget({ w: 2, h: 2, content: "Widget" });
```

**Load from JSON:**

```js
grid.load([
  { x: 0, y: 0, w: 2, h: 2 },
  { x: 2, y: 0, w: 3, h: 2 },
]);
```

**Save/restore layout:**

```js
const saved = grid.save(); // Serialize current layout
grid.load(saved); // Restore later
```

### Key Concepts

- **CSS Variables (v12):** Column counts and cell heights use CSS variables—no custom classes
  needed. Set via `grid.column(12)` or `grid.cellHeight(70)`
- **Nested Grids:** Convert items to sub-grids with `grid.makeSubGrid(el)`. Drag between
  parent/child grids seamlessly
- **Responsive:** Built-in responsive behavior. Configure breakpoints with
  `columnOpts: {breakpoints: [{w: 768, c: 1}]}`
- **Events:** Track layout changes via `.on('added', 'removed', 'dragstop', 'resizestop')`, etc.
- **Mobile:** Touch events supported natively (v6+)—no jQuery-UI required

### Framework Integration

Works directly with **Angular, React, Vue, Ember, Knockout**. Use `GridStack.renderCB` to control
widget content creation in your framework.

### Gotchas (v12 migration)

- `innerHTML` is no longer set by GridStack for security. Use `GridStack.renderCB()` or
  `createWidgetDivs()`
- `gridstack-extra.css` removed—CSS vars handle all column counts now
- IE support dropped (ES2020 target)

**References:** GridStack.init(), Events, Demos

<!-- /skilld:custom -->
