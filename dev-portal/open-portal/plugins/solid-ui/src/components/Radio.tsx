import { type JSX, Show } from "solid-js";

export type RadioColor = "primary" | "secondary" | "accent" | "warning" | "error";
export type RadioSize = "xs" | "sm" | "md" | "lg";

export interface RadioProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  color?: RadioColor;
  size?: RadioSize;
  bordered?: boolean;
  label?: string;
  class?: string;
}

const baseRadioStyles: JSX.CSSProperties = {
  appearance: "none",
  "border-radius": "9999px",
  border: "2px solid var(--color-surface2, #cbd5e1)",
  "background-color": "var(--color-bg)",
  cursor: "pointer",
  position: "relative",
  "flex-shrink": "0",
  "transition-property": "background-color, border-color",
  "transition-duration": "var(--variant-transition, 150ms)",
};

const sizeStyles: Record<RadioSize, JSX.CSSProperties> = {
  xs: { width: "1rem", height: "1rem" },
  sm: { width: "1.125rem", height: "1.125rem" },
  md: { width: "1.25rem", height: "1.25rem" },
  lg: { width: "1.5rem", height: "1.5rem" },
};

const containerStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  gap: "0.5rem",
};

export function Radio(props: RadioProps) {
  const size = () => props.size ?? "md";
  const color = () => props.color ?? "primary";

  const mergedRadioStyles = (): JSX.CSSProperties =>
    ({
      ...baseRadioStyles,
      ...sizeStyles[size()],
      ...(props.bordered && { "border-width": "2px" }),
    }) as JSX.CSSProperties;

  return (
    <label style={containerStyles} class={props.class}>
      <input
        {...props}
        type="radio"
        style={mergedRadioStyles()}
        class={`
          radio
          radio-${size()}
          radio-${color()}
          ${props.bordered ? "radio-bordered" : ""}
        `.trim()}
      />
      <Show when={props.label}>
        <span>{props.label}</span>
      </Show>
    </label>
  );
}
