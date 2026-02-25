import { type JSX, type ParentProps, Show } from "solid-js";

type InputType = "text" | "email" | "password" | "number" | "search" | "tel" | "url";
type ColorVariant = "primary" | "secondary" | "accent" | "warning" | "error" | undefined;
type Size = "xs" | "sm" | "md" | "lg";

export interface InputProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "type"> {
  type?: InputType;
  color?: ColorVariant;
  size?: Size;
  class?: string;
}

export interface TextareaProps extends Omit<JSX.TextareaHTMLAttributes<HTMLTextAreaElement>, ""> {
  color?: ColorVariant;
  size?: Size;
  class?: string;
}

export interface SelectProps extends Omit<JSX.SelectHTMLAttributes<HTMLSelectElement>, ""> {
  color?: ColorVariant;
  size?: Size;
  class?: string;
}

export interface CheckboxProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "type"> {
  color?: ColorVariant;
  class?: string;
}

export interface ToggleProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "type"> {
  color?: ColorVariant;
  class?: string;
}

const colorMap: Record<ColorVariant, string> = {
  primary: "var(--color-primary, #3b82f6)",
  secondary: "var(--color-secondary, #8b5cf6)",
  accent: "var(--color-accent, #ec4899)",
  warning: "var(--color-warning, #f59e0b)",
  error: "var(--color-error, #ef4444)",
  undefined: "var(--color-surface2, #cbd5e1)",
};

const sizeStyles: Record<Size, JSX.CSSProperties> = {
  xs: {
    "font-size": "0.75rem",
    "line-height": "1rem",
    "padding-left": "0.5rem",
    "padding-right": "0.5rem",
    "padding-top": "0.125rem",
    "padding-bottom": "0.125rem",
    height: "1.5rem",
    "min-height": "1.5rem",
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
  md: {
    "font-size": "0.875rem",
    "line-height": "1.25rem",
    "padding-left": "0.75rem",
    "padding-right": "0.75rem",
    "padding-top": "0.375rem",
    "padding-bottom": "0.375rem",
    height: "2.25rem",
    "min-height": "2.25rem",
  },
  lg: {
    "font-size": "1rem",
    "line-height": "1.5rem",
    "padding-left": "1rem",
    "padding-right": "1rem",
    "padding-top": "0.625rem",
    "padding-bottom": "0.625rem",
    height: "2.75rem",
    "min-height": "2.75rem",
  },
};

const baseInputStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  width: "100%",
  "font-size": "0.875rem",
  "line-height": "1.25rem",
  "padding-left": "0.75rem",
  "padding-right": "0.75rem",
  "padding-top": "0.375rem",
  "padding-bottom": "0.375rem",
  height: "2.25rem",
  "min-height": "2.25rem",
  "border-radius": "0.375rem",
  border: "1px solid var(--color-surface2, #cbd5e1)",
  "background-color": "var(--color-bg, white)",
  color: "var(--color-text, #0f172a)",
  "transition-property": "border-color, box-shadow",
  "transition-timing-function": "cubic-bezier(0.4, 0, 0.2, 1)",
  "transition-duration": "150ms",
};

const baseTextareaStyles: JSX.CSSProperties = {
  display: "block",
  width: "100%",
  "min-height": "5rem",
  "font-size": "0.875rem",
  "line-height": "1.5",
  "padding-left": "0.75rem",
  "padding-right": "0.75rem",
  "padding-top": "0.375rem",
  "padding-bottom": "0.375rem",
  "border-radius": "0.375rem",
  border: "1px solid var(--color-surface2, #cbd5e1)",
  "background-color": "var(--color-bg, white)",
  color: "var(--color-text, #0f172a)",
  "transition-property": "border-color, box-shadow",
  "transition-timing-function": "cubic-bezier(0.4, 0, 0.2, 1)",
  "transition-duration": "150ms",
  resize: "vertical",
};

const checkboxStyles: JSX.CSSProperties = {
  appearance: "none",
  width: "1.25rem",
  height: "1.25rem",
  "border-radius": "0.25rem",
  border: "2px solid var(--color-surface2, #cbd5e1)",
  "background-color": "var(--color-bg, white)",
  cursor: "pointer",
  position: "relative",
  "flex-shrink": "0",
  "transition-property": "background-color, border-color",
  "transition-duration": "150ms",
};

const toggleStyles: JSX.CSSProperties = {
  appearance: "none",
  width: "2.75rem",
  height: "1.5rem",
  "border-radius": "9999px",
  "background-color": "var(--color-surface2, #cbd5e1)",
  cursor: "pointer",
  position: "relative",
  "flex-shrink": "0",
  "transition-property": "background-color",
  "transition-duration": "150ms",
  border: "none",
};

export const Input = (props: InputProps) => {
  const size = () => props.size ?? "md";
  const color = () => props.color;
  const sizeStyle = sizeStyles[size()];

  const mergedStyles = (): JSX.CSSProperties =>
    ({
      ...baseInputStyles,
      ...sizeStyle,
      "border-color": colorMap[color()],
    }) as JSX.CSSProperties;

  return (
    <input {...props} type={props.type ?? "text"} class={props.class} style={mergedStyles()} />
  );
};

export const Textarea = (props: TextareaProps) => {
  const size = () => props.size ?? "md";
  const color = () => props.color;
  const sizeStyle = sizeStyles[size()];

  const mergedStyles = (): JSX.CSSProperties =>
    ({
      ...baseTextareaStyles,
      ...sizeStyle,
      "border-color": colorMap[color()],
    }) as JSX.CSSProperties;

  return <textarea {...props} class={props.class} style={mergedStyles()} />;
};

export const Select = (props: SelectProps) => {
  const size = () => props.size ?? "md";
  const color = () => props.color;
  const sizeStyle = sizeStyles[size()];

  const mergedStyles = (): JSX.CSSProperties =>
    ({
      ...baseInputStyles,
      ...sizeStyle,
      "border-color": colorMap[color()],
      "padding-right": "2rem",
      "background-image": `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clip-rule='evenodd'/%3E%3C/svg%3E")`,
      "background-position": "right 0.5rem center",
      "background-repeat": "no-repeat",
      "background-size": "1.25rem 1.25rem",
    }) as JSX.CSSProperties;

  return <select {...props} class={props.class} style={mergedStyles()} />;
};

export const Checkbox = (props: CheckboxProps) => {
  const color = () => props.color;

  const mergedStyles = (): JSX.CSSProperties => {
    const checkedColor = colorMap[color()] ?? "var(--color-primary, #3b82f6)";
    return {
      ...checkboxStyles,
      "border-color": "var(--color-surface2, #cbd5e1)",
      "--checked-bg": checkedColor,
    } as JSX.CSSProperties;
  };

  return <input {...props} type="checkbox" class={props.class} style={mergedStyles()} />;
};

export const Toggle = (props: ToggleProps) => {
  const color = () => props.color;

  const mergedStyles = (): JSX.CSSProperties => {
    const checkedColor = colorMap[color()] ?? "var(--color-primary, #3b82f6)";
    return {
      ...toggleStyles,
      "--checked-bg": checkedColor,
    } as JSX.CSSProperties;
  };

  return <input {...props} type="checkbox" class={props.class} style={mergedStyles()} />;
};
