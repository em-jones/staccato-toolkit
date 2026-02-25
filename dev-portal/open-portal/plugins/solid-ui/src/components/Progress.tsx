import { type JSX, Show } from "solid-js";

export type ProgressColor = "primary" | "secondary" | "accent" | "success" | "warning" | "error";
export type ProgressSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface ProgressProps extends JSX.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  color?: ProgressColor;
  size?: ProgressSize;
  indeterminate?: boolean;
  showLabel?: boolean;
  class?: string;
}

const baseProgressStyles: JSX.CSSProperties = {
  display: "inline-flex",
  "align-items": "center",
  width: "100%",
  "border-radius": "9999px",
  "background-color": "var(--color-surface1, #e2e8f0)",
  overflow: "hidden",
  position: "relative",
};

const sizeStyles: Record<ProgressSize, JSX.CSSProperties> = {
  xs: { height: "0.25rem" },
  sm: { height: "0.5rem" },
  md: { height: "1rem" },
  lg: { height: "1.5rem" },
  xl: { height: "2rem" },
};

const baseBarStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  "justify-content": "center",
  height: "100%",
  "border-radius": "9999px",
  transition: "width 300ms ease",
  "text-align": "center",
  "font-size": "0.75rem",
  "font-weight": "600",
  color: "white",
};

const keyframes = `
  @keyframes progress-indeterminate {
    0% { transform: translateX(-100%); }
    50% { transform: translateX(200%); }
    100% { transform: translateX(200%); }
  }
`;

export function Progress(props: ProgressProps) {
  const size = () => props.size ?? "md";
  const color = () => props.color ?? "primary";
  const value = () => props.value ?? 0;
  const max = () => props.max ?? 100;
  const percentage = () => Math.min((value() / max()) * 100, 100);

  const mergedProgressStyles = (): JSX.CSSProperties =>
    ({
      ...baseProgressStyles,
      ...sizeStyles[size()],
    }) as JSX.CSSProperties;

  const mergedBarStyles = (): JSX.CSSProperties =>
    ({
      ...baseBarStyles,
      "background-color": `var(--color-${color()})`,
      width: props.indeterminate ? "30%" : `${percentage()}%`,
      animation: props.indeterminate ? "progress-indeterminate 1.5s infinite ease-in-out" : "none",
    }) as JSX.CSSProperties;

  return (
    <div style={mergedProgressStyles()} class={props.class}>
      <style>{keyframes}</style>
      <div
        style={mergedBarStyles()}
        class={`
          progress-bar
          progress-${size()}
          progress-${color()}
          ${props.indeterminate ? "progress-indeterminate" : ""}
        `.trim()}
      >
        <Show when={props.showLabel && !props.indeterminate}>
          <span>{percentage().toFixed(0)}%</span>
        </Show>
      </div>
      {props.children}
    </div>
  );
}
