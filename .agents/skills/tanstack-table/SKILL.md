---
name: tanstack-table
description: Headless UI for building powerful tables & datagrids for TS/JS, React, Vue, Solid, Svelte, Qwik, Angular, and Lit.
---


## Overview

TanStack Table is a headless UI library for building data tables and datagrids. It provides logic for sorting, filtering, pagination, grouping, expanding, column pinning/ordering/visibility/resizing, and row selection - without rendering any markup or styles.

**Package:** `@tanstack/solid-table`
**Utilities:** `@tanstack/match-sorter-utils` (fuzzy filtering)
**Current Version:** v8

## Installation

```bash
npm install @tanstack/solid-table
```

## Core Architecture

### Building Blocks

1. **Column Definitions** - describe columns (data access, rendering, features)
2. **Table Instance** - central coordinator with state and APIs
3. **Row Models** - data processing pipeline (filter -> sort -> group -> paginate)
4. **Headers, Rows, Cells** - renderable units

### Critical: Data & Column Stability

```typescript
// WRONG - new references every render, causes infinite loops
const table = createSolidTable({
  data: fetchedData.results,     // new ref!
  columns: [{ accessorKey: 'name' }], // new ref!
})

// CORRECT - stable references (Solid uses createMemo)
const columns = createMemo(() => [...])
const data = createMemo(() => fetchedData?.results ?? [])

const table = createSolidTable({
  get data() { return data() },
  get columns() { return columns() },
  getCoreRowModel: getCoreRowModel(),
})
```

## Column Definitions

### Using createColumnHelper (Recommended)

```typescript
import { createColumnHelper } from '@tanstack/solid-table'

type Person = {
  firstName: string
  lastName: string
  age: number
  status: 'active' | 'inactive'
}

const columnHelper = createColumnHelper<Person>()

const columns = [
  // Accessor column (data column)
  columnHelper.accessor('firstName', {
    header: 'First Name',
    cell: info => info.getValue(),
    footer: info => info.column.id,
  }),

  // Accessor with function
  columnHelper.accessor(row => row.lastName, {
    id: 'lastName', // required with accessorFn
    header: () => <span>Last Name</span>,
    cell: info => <i>{info.getValue()}</i>,
  }),

  // Display column (no data, custom rendering)
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <button onClick={() => deleteRow(row.original)}>Delete</button>
    ),
  }),

  // Group column (nested headers)
  columnHelper.group({
    id: 'info',
    header: 'Info',
    columns: [
      columnHelper.accessor('age', { header: 'Age' }),
      columnHelper.accessor('status', { header: 'Status' }),
    ],
  }),
]
```

### Column Options

| Option | Type | Description |
|--------|------|-------------|
| `id` | `string` | Unique identifier (auto-derived from accessorKey) |
| `accessorKey` | `string` | Dot-notation path to row data |
| `accessorFn` | `(row) => any` | Custom accessor function |
| `header` | `string \| (context) => JSX.Element` | Header renderer |
| `cell` | `(context) => JSX.Element` | Cell renderer |
| `footer` | `(context) => JSX.Element` | Footer renderer |
| `size` | `number` | Default width (default: 150) |
| `minSize` | `number` | Min width (default: 20) |
| `maxSize` | `number` | Max width |
| `enableSorting` | `boolean` | Enable sorting |
| `sortingFn` | `string \| SortingFn` | Sort function |
| `enableFiltering` | `boolean` | Enable filtering |
| `filterFn` | `string \| FilterFn` | Filter function |
| `enableGrouping` | `boolean` | Enable grouping |
| `aggregationFn` | `string \| AggregationFn` | Aggregation function |
| `enableHiding` | `boolean` | Enable visibility toggle |
| `enableResizing` | `boolean` | Enable resizing |
| `enablePinning` | `boolean` | Enable pinning |
| `meta` | `any` | Custom metadata |

## Table Instance

### Creating a Table

```typescript
import { createSignal } from 'solid-js'
import {
  createSolidTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/solid-table'
import type { SortingState, ColumnFiltersState, PaginationState } from '@tanstack/table-core'

function MyTable(props: { data: Person[]; columns: ColumnDef<Person, unknown>[] }) {
  const [sorting, setSorting] = createSignal<SortingState>([])
  const [columnFilters, setColumnFilters] = createSignal<ColumnFiltersState>([])
  const [pagination, setPagination] = createSignal<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const table = createSolidTable({
    get data() { return props.data },
    get columns() { return props.columns },
    state: {
      get sorting() { return sorting() },
      get columnFilters() { return columnFilters() },
      get pagination() { return pagination() },
    },
    onSortingChange: (updater) => setSorting(updater),
    onColumnFiltersChange: (updater) => setColumnFilters(updater),
    onPaginationChange: (updater) => setPagination(updater),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map(headerGroup => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <th
                key={header.id}
                onClick={header.column.getToggleSortingHandler()}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
                {{
                  asc: ' ↑',
                  desc: ' ↓',
                }[header.column.getIsSorted() as string] ?? null}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map(row => (
          <tr key={row.id}>
            {row.getVisibleCells().map(cell => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

## State Management Patterns

### Passing Signals to Table

In Solid, pass signals using getter functions for reactivity:

```typescript
const [data, setData] = createSignal<Person[]>([])
const [columns] = createMemo(() => [...])

const table = createSolidTable({
  get data() { return data() },
  get columns() { return columns() },
  // ...
})
```

### Initial State

Use `initialState` to set default values without controlling:

```typescript
const table = createSolidTable({
  data,
  columns,
  initialState: {
    columnOrder: ['age', 'firstName', 'lastName'],
    columnVisibility: { id: false },
    expanded: true,
    sorting: [{ id: 'age', desc: true }],
    pagination: { pageIndex: 0, pageSize: 10 },
  },
})
```

### Fully Controlled State

For complete control, use `onStateChange`:

```typescript
const table = createSolidTable({
  get data() { return data() },
  get columns() { return columns() },
})

const [state, setState] = createSignal({
  ...table.initialState,
  pagination: { pageIndex: 0, pageSize: 15 },
})

table.setOptions(prev => ({
  ...prev,
  get state() { return state() },
  onStateChange: setState,
}))
```

## Sorting

```typescript
const [sorting, setSorting] = createSignal<SortingState>([])

const table = createSolidTable({
  state: {
    get sorting() { return sorting() },
  },
  onSortingChange: (updater) => setSorting(updater),
  getSortedRowModel: getSortedRowModel(),
  enableSorting: true,
  enableMultiSort: true,
  // manualSorting: true,  // For server-side sorting
})

// Built-in sort functions: 'alphanumeric', 'text', 'datetime', 'basic'
// Column-level: sortingFn: 'alphanumeric'
```

## Filtering

### Column Filtering

```typescript
const [columnFilters, setColumnFilters] = createSignal<ColumnFiltersState>([])

const table = createSolidTable({
  state: {
    get columnFilters() { return columnFilters() },
  },
  onColumnFiltersChange: (updater) => setColumnFilters(updater),
  getFilteredRowModel: getFilteredRowModel(),
  getFacetedRowModel: getFacetedRowModel(),
  getFacetedUniqueValues: getFacetedUniqueValues(),
  getFacetedMinMaxValues: getFacetedMinMaxValues(),
})

// Built-in: 'includesString', 'equalsString', 'arrIncludes', 'inNumberRange', etc.

// Filter UI
function Filter(props: { column: Column<any, unknown> }) {
  return (
    <input
      value={(props.column.getFilterValue() ?? '') as string}
      onInput={e => props.column.setFilterValue(e.target.value)}
      placeholder={`Filter... (${props.column.getFacetedUniqueValues()?.size})`}
    />
  )
}
```

### Global Filtering

```typescript
const [globalFilter, setGlobalFilter] = createSignal('')

const table = createSolidTable({
  state: {
    get globalFilter() { return globalFilter() },
  },
  onGlobalFilterChange: (updater) => setGlobalFilter(updater),
  globalFilterFn: 'includesString',
  getFilteredRowModel: getFilteredRowModel(),
})
```

### Fuzzy Filtering

```typescript
import { rankItem } from '@tanstack/match-sorter-utils'

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta({ itemRank })
  return itemRank.passed
}

const table = createSolidTable({
  filterFns: { fuzzy: fuzzyFilter },
  globalFilterFn: 'fuzzy',
})
```

## Pagination

```typescript
const [pagination, setPagination] = createSignal<PaginationState>({
  pageIndex: 0,
  pageSize: 10,
})

const table = createSolidTable({
  state: {
    get pagination() { return pagination() },
  },
  onPaginationChange: (updater) => setPagination(updater),
  getPaginationRowModel: getPaginationRowModel(),
  // For server-side:
  // manualPagination: true,
  // pageCount: serverPageCount,
})

// Navigation
table.nextPage()
table.previousPage()
table.firstPage()
table.lastPage()
table.setPageSize(20)
table.getCanNextPage()     // boolean
table.getCanPreviousPage() // boolean
table.getPageCount()       // total pages
```

## Row Selection

```typescript
const [rowSelection, setRowSelection] = createSignal<RowSelectionState>({})

const table = createSolidTable({
  state: {
    get rowSelection() { return rowSelection() },
  },
  onRowSelectionChange: (updater) => setRowSelection(updater),
  enableRowSelection: true,
  enableMultiRowSelection: true,
})

// Checkbox column
columnHelper.display({
  id: 'select',
  header: ({ table }) => (
    <input
      type="checkbox"
      checked={table.getIsAllRowsSelected()}
      onChange={table.getToggleAllRowsSelectedHandler()}
    />
  ),
  cell: ({ row }) => (
    <input
      type="checkbox"
      checked={row.getIsSelected()}
      disabled={!row.getCanSelect()}
      onChange={row.getToggleSelectedHandler()}
    />
  ),
})

// Get selected rows
table.getSelectedRowModel().rows
```

## Column Visibility

```typescript
const [columnVisibility, setColumnVisibility] = createSignal<VisibilityState>({})

const table = createSolidTable({
  state: {
    get columnVisibility() { return columnVisibility() },
  },
  onColumnVisibilityChange: (updater) => setColumnVisibility(updater),
})

// Toggle UI
<table>
  {table.getAllLeafColumns().map(column => (
    <label>
      <input
        type="checkbox"
        checked={column.getIsVisible()}
        onChange={column.getToggleVisibilityHandler()}
      />
      {column.id}
    </label>
  ))}
</table>
```

## Column Pinning

```typescript
const [columnPinning, setColumnPinning] = createSignal<ColumnPinningState>({
  left: ['select', 'name'],
  right: ['actions'],
})

const table = createSolidTable({
  state: {
    get columnPinning() { return columnPinning() },
  },
  onColumnPinningChange: (updater) => setColumnPinning(updater),
  enableColumnPinning: true,
})

// Render pinned sections separately
row.getLeftVisibleCells()   // Left-pinned
row.getCenterVisibleCells() // Unpinned
row.getRightVisibleCells()  // Right-pinned
```

## Column Resizing

```typescript
const table = createSolidTable({
  enableColumnResizing: true,
  columnResizeMode: 'onChange', // 'onChange' | 'onEnd'
  defaultColumn: { size: 150, minSize: 50, maxSize: 500 },
})

// Resize handle in header
<div
  onMouseDown={header.getResizeHandler()}
  onTouchStart={header.getResizeHandler()}
  classList={{ resizer: true, isResizing: header.column.getIsResizing() }}
/>
```

## Grouping & Aggregation

```typescript
const [grouping, setGrouping] = createSignal<GroupingState>([])

const table = createSolidTable({
  state: {
    get grouping() { return grouping() },
  },
  onGroupingChange: (updater) => setGrouping(updater),
  getGroupedRowModel: getGroupedRowModel(),
  getExpandedRowModel: getExpandedRowModel(),
})

// Built-in aggregation: 'sum', 'min', 'max', 'mean', 'median', 'count', 'unique', 'uniqueCount'
columnHelper.accessor('amount', {
  aggregationFn: 'sum',
  aggregatedCell: ({ getValue }) => `Total: ${getValue()}`,
})
```

## Row Expanding

```typescript
const [expanded, setExpanded] = createSignal<ExpandedState>({})

const table = createSolidTable({
  state: {
    get expanded() { return expanded() },
  },
  onExpandedChange: (updater) => setExpanded(updater),
  getExpandedRowModel: getExpandedRowModel(),
  getSubRows: (row) => row.subRows, // For hierarchical data
})

// Expand toggle
<button onClick={row.getToggleExpandedHandler()}>
  {row.getIsExpanded() ? '−' : '+'}
</button>

// Detail row pattern
{row.getIsExpanded() && (
  <tr>
    <td colSpan={columns.length}>
      <DetailComponent data={row.original} />
    </td>
  </tr>
)}
```

## Virtualization Integration

```typescript
import { createVirtualizer } from '@tanstack/solid-virtual'

function VirtualizedTable() {
  const table = createSolidTable({ /* ... */ })
  const { rows } = table.getRowModel()
  let parentRef: HTMLDivElement | undefined

  const virtualizer = createVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef ?? null,
    estimateSize: () => 35,
    overscan: 10,
  })

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <table>
        <tbody style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
          {virtualizer.getVirtualItems().map(virtualRow => {
            const row = rows[virtualRow.index]
            return (
              <tr
                key={row.id}
                style={{
                  position: 'absolute',
                  transform: `translateY(${virtualRow.start}px)`,
                  height: `${virtualRow.size}px`,
                }}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

## Server-Side Operations

```typescript
const table = createSolidTable({
  get data() { return serverData },
  get columns() { return columns },
  manualSorting: true,
  manualFiltering: true,
  manualPagination: true,
  pageCount: serverPageCount,
  state: {
    get sorting() { return sorting() },
    get columnFilters() { return columnFilters() },
    get pagination() { return pagination() },
  },
  onSortingChange: (updater) => setSorting(updater),
  onColumnFiltersChange: (updater) => setColumnFilters(updater),
  onPaginationChange: (updater) => setPagination(updater),
  getCoreRowModel: getCoreRowModel(),
  // Do NOT include getSortedRowModel, getFilteredRowModel, getPaginationRowModel
})

// Fetch data based on state (using createEffect)
createEffect(() => {
  fetchData({ sorting: sorting(), filters: columnFilters(), pagination: pagination() })
})
```

## TypeScript Patterns

### Extending Column Meta

```typescript
declare module '@tanstack/solid-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    filterVariant?: 'text' | 'range' | 'select'
    align?: 'left' | 'center' | 'right'
  }
}
```

### Custom Filter/Sort Function Registration

```typescript
declare module '@tanstack/solid-table' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface SortingFns {
    myCustomSort: SortingFn<unknown>
  }
}
```

### Editable Cells via Table Meta

```typescript
declare module '@tanstack/solid-table' {
  interface TableMeta<TData extends RowData> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void
  }
}

const table = createSolidTable({
  meta: {
    updateData: (rowIndex, columnId, value) => {
      setData(old => old.map((row, i) =>
        i === rowIndex ? { ...row, [columnId]: value } : row
      ))
    },
  },
})
```

## Key Imports

```typescript
import { createSignal, createMemo, createEffect } from 'solid'

import {
  createColumnHelper,
  flexRender,
  createSolidTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
} from '@tanstack/solid-table'

import type {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  PaginationState,
  ExpandedState,
  RowSelectionState,
  GroupingState,
  ColumnOrderState,
  ColumnPinningState,
  FilterFn,
  SortingFn,
} from '@tanstack/table-core'
```

## Best Practices

1. **Always use `createMemo` for `data` and `columns`** to prevent infinite re-renders
2. **Use `flexRender`** for all header/cell/footer rendering
3. **Use `table.getRowModel().rows`** for final rendered rows (not getCoreRowModel)
4. **Import only needed row models** - each adds processing to the pipeline
5. **Use `getRowId`** for stable row keys when data has unique IDs
6. **Use `manualX` options** for server-side operations
7. **Pair controlled state** with both `state.X` (as getter) and `onXChange`
8. **Use module augmentation** for custom meta, filter fns, sort fns
9. **Use column helper** for type-safe column definitions
10. **Set `autoResetPageIndex: true`** when filtering should reset pagination
11. **Use getter functions in state** - `get sorting() { return sorting() }` for reactivity

## Common Pitfalls

- Defining columns inline (creates new ref each render)
- Forgetting `getCoreRowModel()` (required for all tables)
- Using row models without importing them
- Not providing `id` when using `accessorFn`
- Mixing `manualPagination` with client-side `getPaginationRowModel`
- Forgetting `colSpan` for grouped headers
- Not handling `header.isPlaceholder` for group column spacers
- Using direct state instead of getters: `state: { sorting }` should be `state: { get sorting() { return sorting() } }`
