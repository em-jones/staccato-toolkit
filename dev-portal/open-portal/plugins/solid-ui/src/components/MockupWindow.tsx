import { type ParentProps, type JSX } from "solid-js";

export interface MockupWindowProps extends ParentProps {
  class?: string;
  title?: string;
  scroll?: boolean;
  showToolbar?: boolean;
}

const windowStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-direction": "column",
  "background-color": "var(--color-bg, white)",
  "border-radius": "0.75rem",
  border: "1px solid var(--color-surface1, #e2e8f0)",
  overflow: "hidden",
};

const toolbarStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  gap: "0.5rem",
  padding: "0.75rem 1rem",
  "background-color": "var(--color-surface0, #f1f5f9)",
  "border-bottom": "1px solid var(--color-surface1, #e2e8f0)",
};

const dotBaseStyles: JSX.CSSProperties = {
  width: "0.75rem",
  height: "0.75rem",
  "border-radius": "9999px",
};

const dotStyles = {
  red: { "background-color": "var(--color-error, #ef4444)" },
  yellow: { "background-color": "var(--color-warning, #f59e0b)" },
  green: { "background-color": "var(--color-green, #10b981)" },
};

const titleStyles: JSX.CSSProperties = {
  flex: "1",
  "text-align": "center",
  "font-size": "0.875rem",
  color: "var(--color-text-secondary, #64748b)",
};

const contentStyles: JSX.CSSProperties = {
  padding: "1rem",
  overflow: (props) => (props.scroll ? "auto" : "visible"),
};

export const MockupWindow = (props: MockupWindowProps) => {
  const showToolbar = () => props.showToolbar ?? true;

  return (
    <div class={props.class} style={windowStyles}>
      {showToolbar() && (
        <div style={toolbarStyles}>
          <div style={{ ...dotBaseStyles, ...dotStyles.red }} />
          <div style={{ ...dotBaseStyles, ...dotStyles.yellow }} />
          <div style={{ ...dotBaseStyles, ...dotStyles.green }} />
          {props.title && <div style={titleStyles}>{props.title}</div>}
        </div>
      )}
      <div style={contentStyles(props)}>{props.children}</div>
    </div>
  );
};
