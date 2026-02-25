import type { JSX } from "solid-js";
import { createSignal, For, Show } from "solid-js";

export interface TabDef {
  id: string;
  label: string;
  content: JSX.Element;
}

export interface EntityTabsProps {
  tabs: TabDef[];
  defaultTab?: string;
  class?: string;
}

export function EntityTabs(props: EntityTabsProps): JSX.Element {
  const [active, setActive] = createSignal(props.defaultTab ?? props.tabs[0]?.id ?? "");

  const activeTab = () => props.tabs.find((t) => t.id === active());

  return (
    <div class={props.class}>
      {/* Tab strip */}
      <div class="mb-4 flex gap-2 border-b border-[var(--color-surface1,rgba(0,0,0,0.1))] pb-0">
        <For each={props.tabs}>
          {(tab) => (
            <button
              onClick={() => setActive(tab.id)}
              class={`-mb-px rounded-t px-4 py-2 text-sm font-medium transition border-b-2 ${
                active() === tab.id
                  ? "border-[var(--color-primary,#0ea5e9)] text-[var(--color-primary,#0ea5e9)]"
                  : "border-transparent text-[var(--color-text-secondary,#6b7280)] hover:text-[var(--color-text,#111)]"
              }`}
            >
              {tab.label}
            </button>
          )}
        </For>
      </div>

      {/* Active tab content */}
      <Show when={activeTab()}>{(tab) => <div>{tab().content}</div>}</Show>
    </div>
  );
}
