import { type JSX, type ParentProps, Show } from "solid-js";

type ColorVariant = "primary" | "secondary" | "accent" | "warning" | "error" | "green" | undefined;
type Size = "xs" | "sm" | "md" | "lg" | "xl";
type Variant = "solid" | "outline" | "ghost" | "link";
type Shape = "default" | "circle" | "square";

export interface ButtonProps extends ParentProps {
  color?: ColorVariant;
  size?: Size;
  variant?: Variant;
  shape?: Shape;
  disabled?: boolean;
  block?: boolean;
  class?: string;
}

const baseStyles: JSX.CSSProperties = {
  display: "inline-flex",
  "align-items": "center",
  "justify-content": "center",
  gap: "0.5rem",
  "font-weight": "600",
  "white-space": "nowrap",
  cursor: "pointer",
  "user-select": "none",
  "transition-property": "background-color, border-color, color, box-shadow, opacity, transform",
  "transition-timing-function": "cubic-bezier(0.4, 0, 0.2, 1)",
  "transition-duration": "150ms",
  "border-radius": "0.5rem",
  border: "1px solid transparent",
  "font-size": "0.875rem",
  "line-height": "1.25rem",
  "padding-left": "0.875rem",
  "padding-right": "0.875rem",
  "padding-top": "0.375rem",
  "padding-bottom": "0.375rem",
  height: "2.25rem",
  "min-height": "2.25rem",
};

const sizeStyles: Record<Size, JSX.CSSProperties> = {
  xs: {
    "font-size": "0.75rem",
    "line-height": "1rem",
    "padding-left": "0.375rem",
    "padding-right": "0.375rem",
    "padding-top": "0.125rem",
    "padding-bottom": "0.125rem",
    height: "1.375rem",
    "min-height": "1.375rem",
  },
  sm: {
    "font-size": "0.8125rem",
    "line-height": "1.125rem",
    "padding-left": "0.625rem",
    "padding-right": "0.625rem",
    "padding-top": "0.25rem",
    "padding-bottom": "0.25rem",
    height: "1.875rem",
    "min-height": "1.875rem",
  },
  md: baseStyles,
  lg: {
    "font-size": "1rem",
    "line-height": "1.5rem",
    "padding-left": "1.25rem",
    "padding-right": "1.25rem",
    "padding-top": "0.625rem",
    "padding-bottom": "0.625rem",
    height: "2.75rem",
    "min-height": "2.75rem",
  },
  xl: {
    "font-size": "1.125rem",
    "line-height": "1.75rem",
    "padding-left": "1.75rem",
    "padding-right": "1.75rem",
    "padding-top": "0.875rem",
    "padding-bottom": "0.875rem",
    height: "3.25rem",
    "min-height": "3.25rem",
  },
};

const colorMap: Record<ColorVariant, string> = {
  primary: "var(--color-primary, #3b82f6)",
  secondary: "var(--color-secondary, #8b5cf6)",
  accent: "var(--color-accent, #ec4899)",
  warning: "var(--color-warning, #f59e0b)",
  error: "var(--color-error, #ef4444)",
  green: "var(--color-green, #10b981)",
  undefined: "var(--color-surface1, #e2e8f0)",
};

const colorContentMap: Record<ColorVariant, string> = {
  primary: "var(--color-primary-content, white)",
  secondary: "var(--color-secondary-content, white)",
  accent: "var(--color-accent-content, white)",
  warning: "var(--color-warning-content, white)",
  error: "var(--color-error-content, white)",
  green: "var(--color-green-content, white)",
  undefined: "var(--color-text, #0f172a)",
};

function getColorStyles(color: ColorVariant, variant: Variant): JSX.CSSProperties {
  if (variant === "outline") {
    return {
      "background-color": "transparent",
      "border-color": colorMap[color],
      color: colorMap[color],
    };
  }

  if (variant === "ghost") {
    return {
      "background-color": "transparent",
      border: "none",
      color: "var(--color-text, #0f172a)",
    };
  }

  if (variant === "link") {
    return {
      "background-color": "transparent",
      border: "none",
      color: colorMap[color],
      "text-decoration": "underline",
    };
  }

  // solid variant
  return {
    "background-color": colorMap[color],
    color: colorContentMap[color],
    "border-color": colorMap[color],
  };
}

export const Button = (props: ButtonProps) => {
  const color = () => props.color;
  const size = () => props.size ?? "md";
  const variant = () => props.variant ?? "solid";
  const shape = () => props.shape ?? "default";

  const shapeStyles = (): JSX.CSSProperties => {
    if (shape() === "circle") {
      return {
        "border-radius": "9999px",
        padding: "0",
        width: sizeStyles[size()]?.height || "2.25rem",
      };
    }
    if (shape() === "square") {
      return {
        "border-radius": "0.375rem",
        padding: "0",
        width: sizeStyles[size()]?.height || "2.25rem",
      };
    }
    return {};
  };

  const mergedStyles = (): JSX.CSSProperties => {
    const colorStyles = getColorStyles(color(), variant());
    const sizeStyle = sizeStyles[size()];
    const shape = shapeStyles();
    const block = props.block ? { width: "100%" } : {};
    const disabled = props.disabled
      ? { opacity: "0.5", cursor: "not-allowed", "pointer-events": "none" }
      : {};

    return {
      ...baseStyles,
      ...sizeStyle,
      ...colorStyles,
      ...shape,
      ...block,
      ...disabled,
    } as JSX.CSSProperties;
  };

  return (
    <button class={props.class} style={mergedStyles()} disabled={props.disabled}>
      {props.children}
    </button>
  );
};
