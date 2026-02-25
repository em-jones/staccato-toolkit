import { type JSX, type ParentProps, Show } from "solid-js";

export type DividerOrientation = "horizontal" | "vertical";
export type DividerAlign = "start" | "center" | "end";
export type DividerColor =
  | "neutral"
  | "primary"
  | "secondary"
  | "accent"
  | "info"
  | "success"
  | "warning"
  | "error";

export interface DividerProps extends ParentProps<{
  orientation?: DividerOrientation;
  align?: DividerAlign;
  color?: DividerColor;
  withContent?: boolean;
  class?: string;
  contentClass?: string;
}> {}

const baseStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  width: "100%",
  height: "1px",
  "background-color": "var(--color-surface1)",
  margin: "1rem 0",
};

const verticalStyles: JSX.CSSProperties = {
  "flex-direction": "column",
  width: "1px",
  height: "100%",
  margin: "0 1rem",
};

const alignStyles: Record<DividerAlign, JSX.CSSProperties> = {
  start: { "justify-content": "flex-start" },
  center: { "justify-content": "center" },
  end: { "justify-content": "flex-end" },
};

const colorMap: Record<DividerColor, string> = {
  neutral: "var(--color-neutral)",
  primary: "var(--color-primary)",
  secondary: "var(--color-secondary)",
  accent: "var(--color-accent)",
  info: "var(--color-info)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  error: "var(--color-error)",
};

const contentStyles: JSX.CSSProperties = {
  position: "relative",
  padding: "0 1rem",
  "z-index": "1",
  "background-color": "var(--color-bg)",
  color: "var(--color-text-secondary)",
  "font-size": "0.875rem",
};

const withContentBaseStyles: JSX.CSSProperties = {
  position: "relative",
};

const withContentBeforeAfterStyles: JSX.CSSProperties = {
  content: '""',
  position: "absolute",
  top: "50%",
  width: "50%",
  height: "1px",
  "background-color": "var(--color-surface1)",
};

export function Divider(props: DividerProps) {
  const orientation = () => props.orientation ?? "horizontal";
  const align = () => props.align ?? "center";
  const color = () => props.color ?? "neutral";
  const withContent = () => props.withContent ?? false;

  const mergedStyles = (): JSX.CSSProperties => {
    const styles: JSX.CSSProperties = {
      ...baseStyles,
      "background-color": colorMap[color()],
    };

    if (orientation() === "vertical") {
      Object.assign(styles, verticalStyles);
    }

    if (withContent()) {
      Object.assign(styles, withContentBaseStyles);
    }

    Object.assign(styles, alignStyles[align()]);

    return styles;
  };

  return (
    <>
      <Show
        when={withContent() && orientation() === "horizontal"}
        fallback={
          <div style={mergedStyles()} class={props.class}>
            {props.children}
          </div>
        }
      >
        <div
          style={{
            ...mergedStyles(),
            position: "relative",
            "&::before": withContentBeforeAfterStyles,
            "&::after": { ...withContentBeforeAfterStyles, right: "0", left: "auto" },
          }}
          class={props.class}
        >
          <div style={contentStyles} class={props.contentClass}>
            {props.children}
          </div>
        </div>
      </Show>
    </>
  );
}
