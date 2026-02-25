import type { JSX, ParentProps } from "solid-js";

export interface SearchPillProps extends ParentProps {
  onRemove?: () => void;
  class?: string;
}

const pillStyles: JSX.CSSProperties = {
  display: "inline-flex",
  "align-items": "center",
  gap: "0.25rem",
  padding: "0.125rem 0.375rem",
  "border-radius": "0.25rem",
  "font-size": "0.75rem",
  "font-family": "monospace",
  "background-color": "color-mix(in srgb, var(--color-primary) 15%, transparent)",
  color: "var(--color-primary)",
  border: "1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)",
};

const removeBtnStyles: JSX.CSSProperties = {
  display: "inline-flex",
  "align-items": "center",
  "justify-content": "center",
  width: "1rem",
  height: "1rem",
  "border-radius": "50%",
  border: "none",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  "font-size": "0.875rem",
  "line-height": "1",
  padding: "0",
};

/**
 * A removable filter pill displayed above the search input.
 * Wraps the raw pill text (e.g. `service:auth`) with an × button.
 */
export function SearchPill(props: SearchPillProps) {
  return (
    <span style={pillStyles} class={props.class}>
      {props.children}
      {props.onRemove && (
        <button
          style={removeBtnStyles}
          onClick={(e) => {
            e.stopPropagation();
            props.onRemove?.();
          }}
          aria-label="Remove filter"
          type="button"
        >
          ×
        </button>
      )}
    </span>
  );
}
