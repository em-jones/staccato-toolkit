# Open Portal Search MVP Implementation Plan

## Architecture

Two complementary components:
1. **CommandPalette** — Cmd+K modal with search result preview and navigation
2. **CodeMirrorAutocomplete** — CodeMirror-based search input with pill-aware autocomplete

## File Structure

```
src/search/
├── index.ts                    # Barrel exports
├── types.ts                    # UI-specific types
├── useSearchPills.ts           # Pill parsing hook
├── useSearchKeyboard.ts        # Keyboard navigation hook
├── SearchPill.tsx              # Pill badge component
├── CommandPaletteInput.tsx     # CodeMirror-based search input
├── CommandPaletteResults.tsx   # Results list grouped by domain
├── CommandPalettePreview.tsx   # Responsive preview panel
└── CommandPalette.tsx          # Main palette component
```

## Implementation Details

### 1. package.json — Add Dependencies

Add to `dependencies`:
```json
"@codemirror/autocomplete": "^6.18.3",
"@codemirror/commands": "^6.7.1",
"@codemirror/language": "^6.10.8",
"@codemirror/state": "^6.5.0",
"@codemirror/view": "^6.36.2",
"@lezer/highlight": "^1.2.1",
"@lezer/lr": "^1.4.2",
"codemirror": "^6.0.1",
"solid-codemirror": "^2.3.2"
```

### 2. src/search/types.ts

```typescript
import type { SearchDomain, SearchResultItem, SearchFilter } from '@op/platform/search';

export interface SearchPill {
  key: string;
  operator?: string;
  value: string;
  raw: string;
}

export interface ParsedQuery {
  pills: SearchPill[];
  freeText: string;
  filters: SearchFilter[];
}

export interface PillKeyDef {
  key: string;
  label: string;
  description: string;
  icon?: string;
  values?: string[];
}

export const DEFAULT_PILL_KEYS: PillKeyDef[] = [
  { key: 'service', label: 'Service', description: 'Filter by service name' },
  { key: 'env', label: 'Environment', description: 'Filter by environment', values: ['production', 'staging', 'development'] },
  { key: 'level', label: 'Log Level', description: 'Filter by log level', values: ['debug', 'info', 'warn', 'error', 'fatal'] },
  { key: 'kind', label: 'Entity Kind', description: 'Filter by catalog entity kind' },
  { key: 'domain', label: 'Search Domain', description: 'Scope search to a domain', values: ['documentation', 'catalog', 'query_language'] },
];

export const DOMAIN_LABELS: Record<SearchDomain, string> = {
  documentation: 'Documentation',
  catalog: 'Catalog',
  query_language: 'Query',
};

export const DOMAIN_ICONS: Record<SearchDomain, string> = {
  documentation: '📄',
  catalog: '📦',
  query_language: '🔍',
};
```

### 3. src/search/useSearchPills.ts

```typescript
import { createMemo, createSignal } from 'solid-js';
import type { ParsedQuery, SearchPill, SearchFilter } from './types';

const PILL_REGEX = /(\w+)(:|>|<|>=|<=)(\S+)/g;

export function useSearchPills(initialValue = '') {
  const [rawValue, setRawValue] = createSignal(initialValue);

  const parsed = createMemo<ParsedQuery>(() => {
    const value = rawValue();
    const pills: SearchPill[] = [];
    let freeText = value;

    let match;
    const regex = new RegExp(PILL_REGEX.source, 'g');
    while ((match = regex.exec(value)) !== null) {
      pills.push({
        key: match[1],
        operator: match[2] === ':' ? undefined : match[2],
        value: match[3],
        raw: match[0],
      });
      freeText = freeText.replace(match[0], '');
    }

    freeText = freeText.trim();

    const filters: SearchFilter[] = pills.map((pill) => {
      if (pill.operator) {
        const op = pill.operator === '>' ? 'gt' : pill.operator === '<' ? 'lt' : pill.operator === '>=' ? 'gte' : 'lte';
        return { field: pill.key, operator: op, value: pill.value };
      }
      return { field: pill.key, operator: 'eq', value: pill.value };
    });

    return { pills, freeText, filters };
  });

  function addPill(key: string, value: string, operator = ':') {
    const pill = `${key}${operator}${value} `;
    setRawValue(rawValue() + pill);
  }

  function removePill(pill: SearchPill) {
    setRawValue(rawValue().replace(pill.raw, '').replace(/\s+/g, ' ').trim());
  }

  return {
    rawValue,
    setRawValue,
    parsed,
    addPill,
    removePill,
  };
}
```

### 4. src/search/useSearchKeyboard.ts

```typescript
import { createSignal, createEffect } from 'solid-js';

export interface UseSearchKeyboardProps {
  itemCount: () => number;
  onSelect: (index: number) => void;
  onClose: () => void;
  isOpen: () => boolean;
}

export function useSearchKeyboard(props: UseSearchKeyboardProps) {
  const [selectedIndex, setSelectedIndex] = createSignal(-1);

  function handleKeyDown(e: KeyboardEvent) {
    if (!props.isOpen()) return;

    const count = props.itemCount();

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < count - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : count - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex() >= 0) {
          props.onSelect(selectedIndex());
        }
        break;
      case 'Escape':
        e.preventDefault();
        props.onClose();
        break;
      case 'Tab':
        if (selectedIndex() >= 0) {
          e.preventDefault();
          props.onSelect(selectedIndex());
        }
        break;
    }
  }

  createEffect(() => {
    if (props.itemCount() === 0) {
      setSelectedIndex(-1);
    } else if (selectedIndex() >= props.itemCount()) {
      setSelectedIndex(props.itemCount() - 1);
    }
  });

  return {
    selectedIndex,
    setSelectedIndex,
    handleKeyDown,
  };
}
```

### 5. src/search/SearchPill.tsx

```typescript
import type { JSX, ParentProps } from 'solid-js';
import { Badge } from '../components/Badge';

export interface SearchPillProps extends ParentProps {
  onRemove?: () => void;
  class?: string;
}

const pillStyles: JSX.CSSProperties = {
  display: 'inline-flex',
  'align-items': 'center',
  gap: '0.25rem',
  padding: '0.125rem 0.25rem',
  'border-radius': '0.25rem',
  'font-size': '0.75rem',
  'font-family': 'monospace',
  'background-color': 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
  color: 'var(--color-primary)',
  border: '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)',
};

const removeBtnStyles: JSX.CSSProperties = {
  display: 'inline-flex',
  'align-items': 'center',
  'justify-content': 'center',
  width: '1rem',
  height: '1rem',
  'border-radius': '50%',
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  'font-size': '0.875rem',
  'line-height': '1',
  padding: '0',
};

export function SearchPill(props: SearchPillProps) {
  return (
    <span style={pillStyles} class={props.class}>
      {props.children}
      {props.onRemove && (
        <button style={removeBtnStyles} onClick={props.onRemove} aria-label="Remove filter">
          ×
        </button>
      )}
    </span>
  );
}
```

### 6. src/search/CommandPaletteInput.tsx

```typescript
import type { JSX } from 'solid-js';
import { createEffect, createSignal, onMount, onCleanup } from 'solid-js';
import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { autocompletion, CompletionContext, Completion } from '@codemirror/autocomplete';
import type { SearchService, TypeaheadResult } from '@op/platform/search';
import type { PillKeyDef, SearchPill } from './types';
import { SearchPill as SearchPillComponent } from './SearchPill';
import { useSearchPills } from './useSearchPills';

export interface CommandPaletteInputProps {
  searchService: SearchService;
  pillKeys?: PillKeyDef[];
  onQueryChange?: (query: string) => void;
  onSelect?: (result: TypeaheadResult) => void;
  placeholder?: string;
}

const containerStyles: JSX.CSSProperties = {
  display: 'flex',
  'flex-direction': 'column',
  'border-bottom': '1px solid var(--color-surface1)',
};

const editorContainerStyles: JSX.CSSProperties = {
  display: 'flex',
  'align-items': 'center',
  padding: '0.5rem 0.75rem',
  'font-size': '0.875rem',
  'font-family': 'inherit',
  background: 'transparent',
};

const editorStyles: JSX.CSSProperties = {
  flex: '1',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: 'var(--color-text)',
  'font-size': 'inherit',
  'font-family': 'inherit',
  'min-height': '2rem',
};

const pillsContainerStyles: JSX.CSSProperties = {
  display: 'flex',
  'flex-wrap': 'wrap',
  gap: '0.25rem',
  padding: '0.25rem 0.75rem 0.5rem',
};

export function CommandPaletteInput(props: CommandPaletteInputProps) {
  const { parsed, setRawValue, rawValue, addPill, removePill } = useSearchPills();
  const pillKeys = () => props.pillKeys ?? [];
  let editorRef: HTMLDivElement | undefined;
  let view: EditorView | undefined;

  const completionSource = async (context: CompletionContext) => {
    const word = context.matchBefore(/\w*$/);
    if (!word || (word.from === word.to && !context.explicit)) return null;

    const term = word.text;
    const pillKeyMatch = term.match(/^(\w+):$/);

    if (pillKeyMatch) {
      const key = pillKeyMatch[1];
      const def = pillKeys().find((k) => k.key === key);
      if (def?.values) {
        const completions: Completion[] = def.values.map((v) => ({
          label: `${key}:${v}`,
          type: 'keyword',
          detail: def.label,
        }));
        return { from: word.from, options: completions, validFor: /^\w+:$/ };
      }
    }

    if (term.length >= 2) {
      try {
        const results = await props.searchService.typeahead({
          term,
          maxResults: 10,
        });
        const completions: Completion[] = results.map((r) => ({
          label: r.label,
          type: 'text',
          detail: r.description,
          apply: (view: EditorView, completion: Completion, from: number, to: number) => {
            view.dispatch({
              changes: { from, to, insert: completion.label },
            });
          },
        }));
        return { from: word.from, options: completions, validFor: /^\w+$/ };
      } catch {
        return null;
      }
    }

    const pillCompletions: Completion[] = pillKeys().map((k) => ({
      label: `${k.key}:`,
      type: 'keyword',
      detail: k.description,
    }));

    return { from: word.from, options: pillCompletions, validFor: /^\w*$/ };
  };

  onMount(() => {
    if (!editorRef) return;

    const state = EditorState.create({
      doc: '',
      extensions: [
        EditorView.lineWrapping,
        cmPlaceholder(props.placeholder ?? 'Search...'),
        keymap.of([
          {
            key: 'Escape',
            run: () => false,
          },
        ]),
        autocompletion({
          override: [completionSource],
          activateOnTyping: true,
          selectOnOpen: false,
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            setRawValue(update.state.doc.toString());
            props.onQueryChange?.(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          '&': { background: 'transparent' },
          '.cm-content': {
            padding: '0',
            caretColor: 'var(--color-primary)',
            fontFamily: 'inherit',
            fontSize: 'inherit',
          },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-placeholder': {
            color: 'var(--color-text-secondary)',
            opacity: '0.6',
          },
          '.cm-tooltip-autocomplete': {
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-surface1)',
            borderRadius: '0.5rem',
            boxShadow: 'var(--variant-shadow-lg, none)',
            fontSize: '0.8125rem',
            maxHeight: '15rem',
            overflow: 'auto',
          },
          '.cm-tooltip-autocomplete ul li': {
            padding: '0.375rem 0.5rem',
            borderRadius: '0.25rem',
          },
          '.cm-tooltip-autocomplete ul li[aria-selected]': {
            backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
            color: 'var(--color-primary)',
          },
        }),
      ],
    });

    view = new EditorView({ state, parent: editorRef });
  });

  onCleanup(() => {
    view?.destroy();
  });

  return (
    <div style={containerStyles}>
      <div style={pillsContainerStyles}>
        {parsed().pills.map((pill) => (
          <SearchPillComponent onRemove={() => removePill(pill)}>
            {pill.raw}
          </SearchPillComponent>
        ))}
      </div>
      <div style={editorContainerStyles}>
        <div ref={editorRef} style={editorStyles} />
      </div>
    </div>
  );
}
```

### 7. src/search/CommandPaletteResults.tsx

```typescript
import type { JSX } from 'solid-js';
import { For, Show } from 'solid-js';
import type { TypeaheadResult, TypeaheadGroup } from '@op/platform/search';
import { DOMAIN_ICONS, DOMAIN_LABELS } from './types';

export interface CommandPaletteResultsProps {
  groups: TypeaheadGroup[];
  selectedIndex: () => number;
  onSelect: (result: TypeaheadResult) => void;
  onHover: (index: number) => void;
  loading?: boolean;
}

const containerStyles: JSX.CSSProperties = {
  'max-height': '20rem',
  'overflow-y': 'auto',
  'scrollbar-width': 'thin',
};

const groupLabelStyles: JSX.CSSProperties = {
  padding: '0.375rem 0.75rem',
  'font-size': '0.6875rem',
  'font-weight': '600',
  'text-transform': 'uppercase',
  'letter-spacing': '0.05em',
  color: 'var(--color-text-secondary)',
  'background-color': 'var(--color-surface0)',
  'border-top': '1px solid var(--color-surface1)',
  'border-bottom': '1px solid var(--color-surface1)',
};

const resultItemStyles: (selected: boolean) => JSX.CSSProperties = (selected) => ({
  display: 'flex',
  'align-items': 'center',
  gap: '0.75rem',
  padding: '0.5rem 0.75rem',
  cursor: 'pointer',
  'background-color': selected ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'transparent',
  color: selected ? 'var(--color-primary)' : 'var(--color-text)',
  transition: 'background-color 150ms ease, color 150ms ease',
});

const resultIconStyles: JSX.CSSProperties = {
  width: '1.25rem',
  height: '1.25rem',
  'flex-shrink': '0',
  display: 'flex',
  'align-items': 'center',
  'justify-content': 'center',
  'font-size': '1rem',
};

const resultContentStyles: JSX.CSSProperties = {
  display: 'flex',
  'flex-direction': 'column',
  flex: '1',
  'min-width': '0',
};

const resultLabelStyles: JSX.CSSProperties = {
  'font-weight': '500',
  'font-size': '0.875rem',
  'white-space': 'nowrap',
  overflow: 'hidden',
  'text-overflow': 'ellipsis',
};

const resultDescStyles: JSX.CSSProperties = {
  'font-size': '0.75rem',
  color: 'var(--color-text-secondary)',
  'white-space': 'nowrap',
  overflow: 'hidden',
  'text-overflow': 'ellipsis',
};

const emptyStyles: JSX.CSSProperties = {
  padding: '2rem 1rem',
  'text-align': 'center',
  color: 'var(--color-text-secondary)',
  'font-size': '0.875rem',
};

export function CommandPaletteResults(props: CommandPaletteResultsProps) {
  let globalIndex = 0;

  return (
    <div style={containerStyles}>
      <Show when={props.loading}>
        <div style={emptyStyles}>Searching...</div>
      </Show>

      <For each={props.groups}>
        {(group) => (
          <>
            <div style={groupLabelStyles}>
              {DOMAIN_ICONS[group.domain as keyof typeof DOMAIN_ICONS] ?? ''} {group.label}
            </div>
            <For each={group.results}>
              {(result) => {
                const currentIndex = globalIndex++;
                const isSelected = () => props.selectedIndex() === currentIndex;
                return (
                  <div
                    style={resultItemStyles(isSelected())}
                    onClick={() => props.onSelect(result)}
                    onMouseEnter={() => props.onHover(currentIndex)}
                    role="option"
                    aria-selected={isSelected()}
                  >
                    <div style={resultIconStyles}>
                      {result.icon ?? DOMAIN_ICONS[result.domain as keyof typeof DOMAIN_ICONS] ?? ''}
                    </div>
                    <div style={resultContentStyles}>
                      <span style={resultLabelStyles}>{result.label}</span>
                      <Show when={result.description}>
                        <span style={resultDescStyles}>{result.description}</span>
                      </Show>
                    </div>
                  </div>
                );
              }}
            </For>
          </>
        )}
      </For>

      <Show when={!props.loading && props.groups.length === 0}>
        <div style={emptyStyles}>No results found</div>
      </Show>
    </div>
  );
}
```

### 8. src/search/CommandPalettePreview.tsx

```typescript
import type { JSX } from 'solid-js';
import { Show } from 'solid-js';
import type { TypeaheadResult, DocumentationResult, CatalogResult, QueryLanguageResult } from '@op/platform/search';
import { Badge } from '../components/Badge';
import { DOMAIN_LABELS } from './types';

export interface CommandPalettePreviewProps {
  result: TypeaheadResult | null;
}

const containerStyles: JSX.CSSProperties = {
  'border-top': '1px solid var(--color-surface1)',
  padding: '1rem',
  'max-height': '16rem',
  'overflow-y': 'auto',
  'background-color': 'var(--color-surface0)',
};

const titleStyles: JSX.CSSProperties = {
  'font-size': '1rem',
  'font-weight': '600',
  color: 'var(--color-text)',
  'margin-bottom': '0.5rem',
};

const metaStyles: JSX.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  'align-items': 'center',
  'margin-bottom': '0.75rem',
  'flex-wrap': 'wrap',
};

const snippetStyles: JSX.CSSProperties = {
  'font-size': '0.8125rem',
  color: 'var(--color-text-secondary)',
  'line-height': '1.5',
  padding: '0.75rem',
  'background-color': 'var(--color-bg)',
  'border-radius': '0.375rem',
  border: '1px solid var(--color-surface1)',
  'white-space': 'pre-wrap',
  'word-break': 'break-word',
};

const queryStyles: JSX.CSSProperties = {
  'font-family': 'monospace',
  'font-size': '0.8125rem',
  padding: '0.75rem',
  'background-color': 'var(--color-bg)',
  'border-radius': '0.375rem',
  border: '1px solid var(--color-surface1)',
  'white-space': 'pre-wrap',
  'word-break': 'break-all',
  overflow: 'auto',
};

const emptyStyles: JSX.CSSProperties = {
  padding: '1.5rem',
  'text-align': 'center',
  color: 'var(--color-text-secondary)',
  'font-size': '0.8125rem',
};

function DocumentationPreview({ result }: { result: DocumentationResult }) {
  return (
    <>
      <div style={titleStyles}>{result.title}</div>
      <div style={metaStyles}>
        <Badge size="sm" color="primary">{result.source}</Badge>
        <span style={{ 'font-size': '0.75rem', color: 'var(--color-text-secondary)' }}>{result.path}</span>
      </div>
      <Show when={result.snippet}>
        <div style={snippetStyles}>{result.snippet}</div>
      </Show>
    </>
  );
}

function CatalogPreview({ result }: { result: CatalogResult }) {
  return (
    <>
      <div style={titleStyles}>{result.title ?? result.name}</div>
      <div style={metaStyles}>
        <Badge size="sm" color="secondary">{result.kind}</Badge>
        <Show when={result.owner}>
          <span style={{ 'font-size': '0.75rem', color: 'var(--color-text-secondary)' }}>
            Owner: {result.owner}
          </span>
        </Show>
        <Show when={result.system}>
          <span style={{ 'font-size': '0.75rem', color: 'var(--color-text-secondary)' }}>
            System: {result.system}
          </span>
        </Show>
      </div>
      <Show when={result.description}>
        <div style={snippetStyles}>{result.description}</div>
      </Show>
      <Show when={result.tags && result.tags!.length > 0}>
        <div style={{ display: 'flex', gap: '0.25rem', 'margin-top': '0.5rem', 'flex-wrap': 'wrap' }}>
          {result.tags!.map((tag) => (
            <Badge size="xs">{tag}</Badge>
          ))}
        </div>
      </Show>
    </>
  );
}

function QueryPreview({ result }: { result: QueryLanguageResult }) {
  return (
    <>
      <div style={metaStyles}>
        <Badge size="sm" color="accent">{result.dialect}</Badge>
        <Show when={result.totalRows}>
          <span style={{ 'font-size': '0.75rem', color: 'var(--color-text-secondary)' }}>
            {result.totalRows} rows
          </span>
        </Show>
      </div>
      <div style={queryStyles}>{result.query}</div>
      <Show when={result.previewRows && result.previewRows!.length > 0}>
        <div style={{ 'margin-top': '0.75rem', 'font-size': '0.75rem', color: 'var(--color-text-secondary)' }}>
          Preview: {result.previewRows!.length} rows
        </div>
      </Show>
    </>
  );
}

export function CommandPalettePreview(props: CommandPalettePreviewProps) {
  return (
    <div style={containerStyles}>
      <Show when={props.result} fallback={<div style={emptyStyles}>Select a result to preview</div>}>
        {(result) => {
          const raw = result() as TypeaheadResult;
          return (
            <>
              <Show when={raw.domain === 'documentation' && 'title' in raw}>
                <DocumentationPreview result={raw as unknown as DocumentationResult} />
              </Show>
              <Show when={raw.domain === 'catalog' && 'kind' in raw}>
                <CatalogPreview result={raw as unknown as CatalogResult} />
              </Show>
              <Show when={raw.domain === 'query_language' && 'query' in raw}>
                <QueryPreview result={raw as unknown as QueryLanguageResult} />
              </Show>
              <Show when={!('title' in raw) && !('kind' in raw) && !('query' in raw)}>
                <div style={titleStyles}>{raw.label}</div>
                <Show when={raw.description}>
                  <div style={snippetStyles}>{raw.description}</div>
                </Show>
              </Show>
            </>
          );
        }}
      </Show>
    </div>
  );
}
```

### 9. src/search/CommandPalette.tsx

```typescript
import type { JSX } from 'solid-js';
import { createEffect, createMemo, createSignal, onMount, onCleanup, Show, For } from 'solid-js';
import type { SearchService, TypeaheadResult, TypeaheadGroup } from '@op/platform/search';
import { groupByDomain } from '@op/platform/search';
import { Kbd } from '../components/Kbd';
import { CommandPaletteInput } from './CommandPaletteInput';
import { CommandPaletteResults } from './CommandPaletteResults';
import { CommandPalettePreview } from './CommandPalettePreview';
import { useSearchKeyboard } from './useSearchKeyboard';
import { DEFAULT_PILL_KEYS, DOMAIN_LABELS, PillKeyDef } from './types';

export interface CommandPaletteProps {
  searchService: SearchService;
  open?: boolean;
  onClose?: () => void;
  pillKeys?: PillKeyDef[];
  maxResults?: number;
  showPreview?: boolean;
}

const overlayStyles: JSX.CSSProperties = {
  position: 'fixed',
  inset: '0',
  'z-index': '1000',
  display: 'flex',
  'align-items': 'flex-start',
  'justify-content': 'center',
  'padding-top': '10vh',
  'background-color': 'rgba(0, 0, 0, 0.5)',
  transition: 'opacity 200ms ease, visibility 200ms ease',
};

const paletteStyles: (isMobile: boolean) => JSX.CSSProperties = (isMobile) => ({
  width: isMobile ? 'calc(100% - 2rem)' : '48rem',
  'max-height': isMobile ? '80vh' : '36rem',
  'border-radius': '0.75rem',
  'background-color': 'var(--color-bg)',
  border: '1px solid var(--color-surface1)',
  'box-shadow': 'var(--variant-shadow-xl, none)',
  display: 'flex',
  'flex-direction': isMobile ? 'column' : 'column',
  overflow: 'hidden',
  transform: 'scale(1)',
  opacity: '1',
  transition: 'transform 200ms ease, opacity 200ms ease',
});

const headerStyles: JSX.CSSProperties = {
  display: 'flex',
  'align-items': 'center',
  'justify-content': 'space-between',
  padding: '0.75rem 1rem 0.25rem',
  'border-bottom': '1px solid var(--color-surface1)',
};

const footerStyles: JSX.CSSProperties = {
  display: 'flex',
  'align-items': 'center',
  gap: '0.75rem',
  padding: '0.5rem 1rem',
  'font-size': '0.75rem',
  color: 'var(--color-text-secondary)',
  'border-top': '1px solid var(--color-surface1)',
  'background-color': 'var(--color-surface0)',
};

export function CommandPalette(props: CommandPaletteProps) {
  const isOpen = () => props.open ?? false;
  const [query, setQuery] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [results, setResults] = createSignal<TypeaheadResult[]>([]);
  const [selectedResult, setSelectedResult] = createSignal<TypeaheadResult | null>(null);
  const [isMobile, setIsMobile] = createSignal(false);

  const pillKeys = () => props.pillKeys ?? DEFAULT_PILL_KEYS;

  const groups = createMemo<TypeaheadGroup[]>(() => {
    const items = results();
    if (items.length === 0) return [];
    return groupByDomain(items, DOMAIN_LABELS);
  });

  const totalItems = createMemo(() => results().length);

  const { selectedIndex, setSelectedIndex, handleKeyDown } = useSearchKeyboard({
    itemCount: totalItems,
    onSelect: (index) => {
      const result = results()[index];
      if (result) {
        setSelectedResult(result);
        handleResultAction(result);
      }
    },
    onClose: () => props.onClose?.(),
    isOpen,
  });

  function handleResultAction(result: TypeaheadResult) {
    switch (result.action.type) {
      case 'navigate':
        window.location.hash = result.action.path;
        props.onClose?.();
        break;
      case 'refine':
        setQuery(result.action.query);
        break;
      case 'execute':
        result.action.handler?.();
        props.onClose?.();
        break;
      case 'custom':
        result.action.handler();
        props.onClose?.();
        break;
    }
  }

  let debounceTimer: ReturnType<typeof setTimeout>;

  async function performSearch(term: string) {
    if (!term.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const typeaheadResults = await props.searchService.typeahead({
        term,
        maxResults: props.maxResults ?? 20,
      });
      setResults(typeaheadResults);
    } catch (e) {
      console.error('Search failed:', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function onQueryChange(newQuery: string) {
    setQuery(newQuery);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => performSearch(newQuery), 150);
  }

  function handleGlobalKeyDown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (!isOpen()) {
        props.onClose?.();
      }
    } else {
      handleKeyDown(e);
    }
  }

  function handleResultHover(index: number) {
    setSelectedIndex(index);
    const result = results()[index];
    if (result) setSelectedResult(result);
  }

  onMount(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    onCleanup(() => window.removeEventListener('resize', checkMobile));
  });

  return (
    <Show when={isOpen()}>
      <div style={overlayStyles} onClick={() => props.onClose?.()}>
        <div
          style={paletteStyles(isMobile())}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleGlobalKeyDown}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <div style={headerStyles}>
            <span style={{ 'font-size': '0.75rem', color: 'var(--color-text-secondary)' }}>
              Search
            </span>
            <Kbd size="sm" variant="default">ESC</Kbd>
          </div>

          <CommandPaletteInput
            searchService={props.searchService}
            pillKeys={pillKeys()}
            onQueryChange={onQueryChange}
            placeholder="Type to search... (use service:, env:, level: for filters)"
          />

          <CommandPaletteResults
            groups={groups()}
            selectedIndex={selectedIndex}
            onSelect={(result) => {
              setSelectedResult(result);
              handleResultAction(result);
            }}
            onHover={handleResultHover}
            loading={loading()}
          />

          <Show when={props.showPreview !== false && selectedResult()}>
            <CommandPalettePreview result={selectedResult()} />
          </Show>

          <div style={footerStyles}>
            <span><Kbd size="xs">↑</Kbd> <Kbd size="xs">↓</Kbd> navigate</span>
            <span><Kbd size="xs">↵</Kbd> select</span>
            <span><Kbd size="xs">esc</Kbd> close</span>
          </div>
        </div>
      </div>
    </Show>
  );
}
```

### 10. src/search/index.ts

```typescript
export type { CommandPaletteProps } from './CommandPalette';
export { CommandPalette } from './CommandPalette';
export type { CommandPaletteInputProps } from './CommandPaletteInput';
export { CommandPaletteInput } from './CommandPaletteInput';
export type { CommandPaletteResultsProps } from './CommandPaletteResults';
export { CommandPaletteResults } from './CommandPaletteResults';
export type { CommandPalettePreviewProps } from './CommandPalettePreview';
export { CommandPalettePreview } from './CommandPalettePreview';
export type { SearchPillProps } from './SearchPill';
export { SearchPill } from './SearchPill';
export type { SearchPill, ParsedQuery, PillKeyDef } from './types';
export { DEFAULT_PILL_KEYS, DOMAIN_LABELS, DOMAIN_ICONS } from './types';
export { useSearchPills } from './useSearchPills';
export { useSearchKeyboard } from './useSearchKeyboard';
```

### 11. Update src/index.ts

Add to the barrel exports:

```typescript
// Search
export type {
  CommandPaletteProps,
  CommandPaletteInputProps,
  CommandPaletteResultsProps,
  CommandPalettePreviewProps,
  SearchPillProps,
  SearchPill as SearchPillType,
  ParsedQuery,
  PillKeyDef,
} from './search';
export {
  CommandPalette,
  CommandPaletteInput,
  CommandPaletteResults,
  CommandPalettePreview,
  SearchPill,
  DEFAULT_PILL_KEYS,
  DOMAIN_LABELS,
  DOMAIN_ICONS,
  useSearchPills,
  useSearchKeyboard,
} from './search';
```

## Usage Example

```tsx
import { CommandPalette } from '@op-plugin/solid-ui';
import { createSignal } from 'solid-js';
import type { SearchService } from '@op/platform/search';

function App({ searchService }: { searchService: SearchService }) {
  const [open, setOpen] = createSignal(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>
        Search <Kbd>⌘K</Kbd>
      </button>
      <CommandPalette
        searchService={searchService}
        open={open()}
        onClose={() => setOpen(false)}
        showPreview={true}
      />
    </>
  );
}
```

## Next Steps After MVP

1. **Trace searching toggle** — Add tab/scope switcher in palette for traces
2. **Log searching with SQL highlighting** — Integrate CodeMirror SQL language support
3. **Search history** — Persist recent queries in localStorage
4. **Advanced pill operators** — Full support for `duration:>500ms`, `level:error`, etc.
5. **ClickHouse query builder** — Column selection and OrderBy in preview
6. **Full CodeMirror editor** — Multi-line query editing with syntax highlighting
