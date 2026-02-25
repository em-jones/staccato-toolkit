import { type JSX, type ParentProps } from "solid-js";

export interface MockupBrowserToolbarProps extends ParentProps {
  address?: string;
  class?: string;
}

export interface MockupBrowserProps extends ParentProps {
  toolbar?: MockupBrowserToolbarProps;
  class?: string;
}

const browserBaseStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-direction": "column",
  "background-color": "var(--color-bg)",
  "border-radius": "0.75rem",
  border: "1px solid var(--color-surface1)",
  overflow: "hidden",
  "max-width": "32rem",
};

const toolbarStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  gap: "0.5rem",
  padding: "0.75rem 1rem",
  "background-color": "var(--color-surface0)",
  "border-bottom": "1px solid var(--color-surface1)",
};

const dotBaseStyles: JSX.CSSProperties = {
  width: "0.75rem",
  height: "0.75rem",
  "border-radius": "9999px",
  "flex-shrink": "0",
};

const dotStyles: Record<string, JSX.CSSProperties> = {
  red: {
    ...dotBaseStyles,
    "background-color": "#ef4444",
  },
  yellow: {
    ...dotBaseStyles,
    "background-color": "#eab308",
  },
  green: {
    ...dotBaseStyles,
    "background-color": "#22c55e",
  },
};

const addressStyles: JSX.CSSProperties = {
  flex: "1",
  display: "flex",
  "align-items": "center",
  gap: "0.5rem",
  padding: "0.375rem 0.75rem",
  "border-radius": "0.375rem",
  "background-color": "var(--color-bg)",
  border: "1px solid var(--color-surface1)",
  "font-size": "0.875rem",
  color: "var(--color-text-secondary)",
};

const contentStyles: JSX.CSSProperties = {
  padding: "1rem",
};

export const MockupBrowser = (props: MockupBrowserProps) => {
  return (
    <div style={browserBaseStyles} class={props.class}>
      {props.toolbar && (
        <div style={toolbarStyles} class={props.toolbar.class}>
          <div style={dotStyles.red} />
          <div style={dotStyles.yellow} />
          <div style={dotStyles.green} />
          {props.toolbar.address && <div style={addressStyles}>{props.toolbar.address}</div>}
        </div>
      )}
      <div style={contentStyles}>{props.children}</div>
    </div>
  );
};

export const MockupBrowserToolbar = (props: MockupBrowserToolbarProps) => {
  return (
    <div style={toolbarStyles} class={props.class}>
      <div style={dotStyles.red} />
      <div style={dotStyles.yellow} />
      <div style={dotStyles.green} />
      {props.address && <div style={addressStyles}>{props.address}</div>}
      {props.children}
    </div>
  );
};
