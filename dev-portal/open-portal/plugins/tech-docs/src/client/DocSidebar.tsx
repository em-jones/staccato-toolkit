import type { JSX } from "solid-js";
import { createMemo, Show } from "solid-js";

export interface DocSidebarProps {
  headings: Array<{ level: number; text: string; id: string }>;
  activeId?: string;
  onSelect?: (id: string) => void;
  class?: string;
}

export function DocSidebar(props: DocSidebarProps): JSX.Element {
  const filteredHeadings = createMemo(() =>
    props.headings.filter((h) => h.level <= 3),
  );

  const headingIndent = (level: number) => {
    switch (level) {
      case 1:
        return "pl-2";
      case 2:
        return "pl-4";
      case 3:
        return "pl-6";
      default:
        return "pl-2";
    }
  };

  return (
    <nav
      class={`sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto border-l border-[var(--color-border,rgba(0,0,0,0.1))] ${props.class ?? ""}`}
    >
      <ul class="py-2">
        {filteredHeadings().map((heading) => (
          <li class={headingIndent(heading.level)}>
            <button
              class={`block w-full px-3 py-1 text-left text-sm transition-colors hover:bg-[var(--color-surface1,rgba(0,0,0,0.05))] ${
                props.activeId === heading.id
                  ? "font-medium text-[var(--color-primary,#3b82f6)]"
                  : "text-[var(--color-text-muted,#6b7280)]"
              }`}
              onClick={() => props.onSelect?.(heading.id)}
            >
              {heading.text}
            </button>
          </li>
        ))}

        <Show when={filteredHeadings().length === 0}>
          <li class="px-3 py-2 text-sm text-[var(--color-text-muted,#6b7280)]">
            No headings
          </li>
        </Show>
      </ul>
    </nav>
  );
}
