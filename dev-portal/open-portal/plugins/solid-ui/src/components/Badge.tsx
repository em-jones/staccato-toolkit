import { type JSX, type ParentProps } from "solid-js";

type ColorVariant = "primary" | "secondary" | "accent" | "warning" | "error" | "green" | undefined;
type Size = "xs" | "sm" | "md" | "lg";

export interface BadgeProps extends ParentProps {
  color?: ColorVariant;
  size?: Size;
  outline?: boolean;
  class?: string;
}

const colorMap: Record<ColorVariant, string> = {
  primary: "var(--color-primary, #3b82f6)",
  secondary: "var(--color-secondary, #8b5cf6)",
  accent: "var(--color-accent, #ec4899)",
  warning: "var(--color-warning, #f59e0b)",
  error: "var(--color-error, #ef4444)",
  green: "var(--color-green, #10b981)",
  undefined: "var(--color-surface0, #e2e8f0)",
};

const colorContentMap: Record<ColorVariant, string> = {
  primary: "white",
  secondary: "white",
  accent: "white",
  warning: "white",
  error: "white",
  green: "white",
  undefined: "var(--color-text, #0f172a)",
};

const sizeStyles: Record<Size, JSX.CSSProperties> = {
  xs: {
    "font-size": "0.625rem",
    "padding-left": "0.375rem",
    "padding-right": "0.375rem",
    "padding-top": "0",
    "padding-bottom": "0",
    height: "0.875rem",
  },
  sm: {
    "font-size": "0.6875rem",
    "padding-left": "0.4375rem",
    "padding-right": "0.4375rem",
    "padding-top": "0.0625rem",
    "padding-bottom": "0.0625rem",
    height: "1.125rem",
  },
  md: {
    "font-size": "0.75rem",
    "padding-left": "0.5rem",
    "padding-right": "0.5rem",
    "padding-top": "0.125rem",
    "padding-bottom": "0.125rem",
    height: "1.25rem",
  },
  lg: {
    "font-size": "0.875rem",
    "padding-left": "0.625rem",
    "padding-right": "0.625rem",
    "padding-top": "0.1875rem",
    "padding-bottom": "0.1875rem",
    height: "1.5rem",
  },
};

const baseStyles: JSX.CSSProperties = {
  display: "inline-flex",
  "align-items": "center",
  "justify-content": "center",
  gap: "0.25rem",
  "white-space": "nowrap",
  "font-weight": "600",
  "line-height": "1",
  "border-radius": "9999px",
  border: "1px solid var(--color-surface2, #cbd5e1)",
};

export const Badge = (props: BadgeProps) => {
  const color = () => props.color;
  const size = () => props.size ?? "md";
  const sizeStyle = sizeStyles[size()];

  const mergedStyles = (): JSX.CSSProperties => {
    const colorBg = colorMap[color()];
    const colorContent = colorContentMap[color()];
    const outline = props.outline
      ? {
          "background-color": "transparent",
          "border-color": "currentColor",
          color: colorBg,
        }
      : {
          "background-color": colorBg,
          "border-color": colorBg,
          color: colorContent,
        };

    return {
      ...baseStyles,
      ...sizeStyle,
      ...outline,
    } as JSX.CSSProperties;
  };

  return (
    <span class={props.class} style={mergedStyles()}>
      {props.children}
    </span>
  );
};
