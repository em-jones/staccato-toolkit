import { type JSX, type ParentProps } from "solid-js";

export type KbdSize = "xs" | "sm" | "md" | "lg" | "xl";
export type KbdVariant = "default" | "keyboard" | "dark" | "primary";

export interface KbdProps extends ParentProps<{
  size?: KbdSize;
  variant?: KbdVariant;
  class?: string;
}> {}

const baseStyles: JSX.CSSProperties = {
  display: "inline-flex",
  "align-items": "center",
  "justify-content": "center",
  "min-width": "1.5rem",
  height: "1.5rem",
  padding: "0 0.5rem",
  "font-size": "0.75rem",
  "font-family": "monospace",
  "font-weight": "500",
  color: "var(--color-text)",
  "background-color": "var(--color-surface0)",
  "border-radius": "var(--variant-radius-sm, 0.25rem)",
  border: "1px solid var(--color-surface1)",
  "box-shadow": "var(--variant-shadow-sm, none)",
};

const sizeStyles: Record<KbdSize, JSX.CSSProperties> = {
  xs: {
    "min-width": "1rem",
    height: "1rem",
    "font-size": "0.625rem",
    padding: "0 0.25rem",
  },
  sm: {
    "min-width": "1.25rem",
    height: "1.25rem",
    "font-size": "0.6875rem",
    padding: "0 0.375rem",
  },
  md: {
    "min-width": "1.5rem",
    height: "1.5rem",
    "font-size": "0.75rem",
  },
  lg: {
    "min-width": "2rem",
    height: "2rem",
    "font-size": "0.875rem",
    padding: "0 0.75rem",
  },
  xl: {
    "min-width": "2.5rem",
    height: "2.5rem",
    "font-size": "1rem",
    padding: "0 1rem",
  },
};

const variantStyles: Record<KbdVariant, JSX.CSSProperties> = {
  default: {},
  keyboard: {
    "box-shadow": "var(--variant-shadow-sm, none)",
    "border-bottom-width": "2px",
  },
  dark: {
    "background-color": "var(--color-neutral)",
    color: "white",
    "border-color": "transparent",
  },
  primary: {
    "background-color": "var(--color-primary)",
    color: "white",
    "border-color": "transparent",
  },
};

export function Kbd(props: KbdProps) {
  const size = () => props.size ?? "md";
  const variant = () => props.variant ?? "default";

  const mergedStyles = (): JSX.CSSProperties => ({
    ...baseStyles,
    ...sizeStyles[size()],
    ...variantStyles[variant()],
  });

  return (
    <kbd style={mergedStyles()} class={props.class}>
      {props.children}
    </kbd>
  );
}
