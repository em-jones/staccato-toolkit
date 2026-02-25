import type { JSX } from "solid-js";
import { For, Show } from "solid-js";
import type { TypeaheadResult, TypeaheadGroup } from "@op/platform/search";
import { DOMAIN_ICONS } from "./types";

export interface CommandPaletteResultsProps {
  groups: TypeaheadGroup[];
  selectedIndex: () => number;
  onSelect: (result: TypeaheadResult) => void;
  onHover: (index: number) => void;
  loading?: boolean;
}

const containerStyles: JSX.CSSProperties = {
  "max-height": "20rem",
  "overflow-y": "auto",
  "scrollbar-width": "thin",
};

const groupLabelStyles: JSX.CSSProperties = {
  padding: "0.375rem 0.75rem",
  "font-size": "0.6875rem",
  "font-weight": "600",
  "text-transform": "uppercase",
  "letter-spacing": "0.05em",
  color: "var(--color-text-secondary)",
  "background-color": "var(--color-surface0)",
  "border-top": "1px solid var(--color-surface1)",
  "border-bottom": "1px solid var(--color-surface1)",
};

function resultItemStyles(selected: boolean): JSX.CSSProperties {
  return {
    display: "flex",
    "align-items": "center",
    gap: "0.75rem",
    padding: "0.5rem 0.75rem",
    cursor: "pointer",
    "background-color": selected
      ? "color-mix(in srgb, var(--color-primary) 15%, transparent)"
      : "transparent",
    color: selected ? "var(--color-primary)" : "var(--color-text)",
    transition: "background-color 150ms ease, color 150ms ease",
  };
}

const resultIconStyles: JSX.CSSProperties = {
  width: "1.25rem",
  height: "1.25rem",
  "flex-shrink": "0",
  display: "flex",
  "align-items": "center",
  "justify-content": "center",
  "font-size": "1rem",
};

const resultContentStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-direction": "column",
  flex: "1",
  "min-width": "0",
};

const resultLabelStyles: JSX.CSSProperties = {
  "font-weight": "500",
  "font-size": "0.875rem",
  "white-space": "nowrap",
  overflow: "hidden",
  "text-overflow": "ellipsis",
};

const resultDescStyles: JSX.CSSProperties = {
  "font-size": "0.75rem",
  color: "var(--color-text-secondary)",
  "white-space": "nowrap",
  overflow: "hidden",
  "text-overflow": "ellipsis",
};

const emptyStyles: JSX.CSSProperties = {
  padding: "2rem 1rem",
  "text-align": "center",
  color: "var(--color-text-secondary)",
  "font-size": "0.875rem",
};

/**
 * Results list grouped by domain, with keyboard-driven selection highlighting.
 */
export function CommandPaletteResults(props: CommandPaletteResultsProps) {
  // We need a stable global index across groups. Use a signal that resets on prop change.
  let globalIndex = 0;

  return (
    <div style={containerStyles}>
      <Show when={props.loading}>
        <div style={emptyStyles}>Searching...</div>
      </Show>

      <For each={props.groups}>
        {(group) => {
          const groupStart = globalIndex;
          globalIndex += group.results.length;

          return (
            <>
              <div style={groupLabelStyles}>
                {DOMAIN_ICONS[group.domain as keyof typeof DOMAIN_ICONS] ?? ""} {group.label}
              </div>
              <For each={group.results}>
                {(result, idx) => {
                  const currentIndex = groupStart + idx();
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
                        {result.icon ??
                          DOMAIN_ICONS[result.domain as keyof typeof DOMAIN_ICONS] ??
                          ""}
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
          );
        }}
      </For>

      <Show when={!props.loading && props.groups.length === 0}>
        <div style={emptyStyles}>No results found</div>
      </Show>
    </div>
  );
}
