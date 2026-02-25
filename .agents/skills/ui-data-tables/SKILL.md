---
name: ui-data-tables
description: Guide for building performant data tables. Uses tanstack-table for table logic (sorting, filtering, pagination) and tanstack-virtual for rendering large datasets efficiently.
---

## Overview

This skill guides the creation of data tables that load and visualize data efficiently. It combines:

1. **tanstack-table** - for table logic (columns, sorting, filtering, pagination, grouping)
2. **tanstack-virtual** - for virtualizing large datasets to maintain 60FPS rendering

## When to Use This Skill

Use this skill when building:

- Data grids with large datasets (100+ rows)
- Admin dashboards with sortable/filterable tables
- Any table component that needs to render thousands of rows efficiently

## Architecture

### Data Loading Strategy

For large datasets, implement server-side operations:

```typescript
// 1. Fetch data based on table state
createEffect(() => {
  const params = {
    sort: sorting(),
    filters: columnFilters(),
    pagination: pagination(),
  };
  fetchData(params);
});

// 2. Configure table for server-side operations
const table = createSolidTable({
  get data() {
    return serverData;
  },
  get columns() {
    return columns;
  },
  manualSorting: true,
  manualFiltering: true,
  manualPagination: true,
  pageCount: serverPageCount,
  // ... other config
});
```

### Virtualization Pattern

Virtualize the table body when rendering more than ~100 rows:

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

## Key Principles

1. **Server-side operations** for datasets > 100 rows
2. **Virtualization** for smooth scrolling with large datasets
3. **Stable references** - use `createMemo` for data and columns
4. **Controlled state** - manage sorting/filtering/pagination externally

## Related Skills

- [tanstack-table](tanstack-table) - Table logic and features
- [tanstack-virtual](tanstack-virtual) - Virtualization implementation
