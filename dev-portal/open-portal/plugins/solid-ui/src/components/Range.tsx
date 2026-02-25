import { type JSX } from "solid-js";

type ColorVariant = "primary" | "secondary" | "accent" | "warning" | "error" | undefined;
type Size = "xs" | "sm" | "md" | "lg";

export interface RangeProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "type"> {
  color?: ColorVariant;
  size?: Size;
  class?: string;
}

const baseRangeStyles: JSX.CSSProperties = {
  appearance: "none",
  width: "100%",
  height: "1.5rem",
  "background-color": "transparent",
  cursor: "pointer",
};

const sizeStyles: Record<Size, JSX.CSSProperties> = {
  xs: {
    height: "1rem",
    "--range-track-height": "0.25rem",
    "--range-thumb-size": "0.75rem",
    "--range-thumb-margin": "-0.25rem",
  } as JSX.CSSProperties,
  sm: {
    height: "1.25rem",
    "--range-track-height": "0.375rem",
    "--range-thumb-size": "1rem",
    "--range-thumb-margin": "-0.3125rem",
  } as JSX.CSSProperties,
  md: {
    height: "1.5rem",
    "--range-track-height": "0.5rem",
    "--range-thumb-size": "1.25rem",
    "--range-thumb-margin": "-0.375rem",
  } as JSX.CSSProperties,
  lg: {
    height: "2rem",
    "--range-track-height": "0.75rem",
    "--range-thumb-size": "1.5rem",
    "--range-thumb-margin": "-0.375rem",
  } as JSX.CSSProperties,
};

const colorMap: Record<ColorVariant, string> = {
  primary: "var(--color-primary, #3b82f6)",
  secondary: "var(--color-secondary, #8b5cf6)",
  accent: "var(--color-accent, #ec4899)",
  warning: "var(--color-warning, #f59e0b)",
  error: "var(--color-error, #ef4444)",
  undefined: "var(--color-primary, #3b82f6)",
};

const styleSheet = `
  input[data-range-component]::-webkit-slider-runnable-track {
    width: 100%;
    height: var(--range-track-height, 0.5rem);
    border-radius: 9999px;
    background-color: var(--range-track-bg, var(--color-surface1, #e2e8f0));
    box-sizing: border-box;
  }

  input[data-range-component]::-webkit-slider-thumb {
    appearance: none;
    width: var(--range-thumb-size, 1.25rem);
    height: var(--range-thumb-size, 1.25rem);
    border-radius: 9999px;
    background-color: var(--range-thumb-color, var(--color-primary, #3b82f6));
    margin-top: var(--range-thumb-margin, -0.375rem);
    box-shadow: var(--variant-shadow-sm, none);
    transition: transform 150ms ease;
    cursor: pointer;
  }

  input[data-range-component]::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }

  input[data-range-component]::-moz-range-track {
    width: 100%;
    height: var(--range-track-height, 0.5rem);
    border-radius: 9999px;
    background-color: var(--range-track-bg, var(--color-surface1, #e2e8f0));
    border: none;
  }

  input[data-range-component]::-moz-range-thumb {
    width: var(--range-thumb-size, 1.25rem);
    height: var(--range-thumb-size, 1.25rem);
    border-radius: 9999px;
    background-color: var(--range-thumb-color, var(--color-primary, #3b82f6));
    border: none;
    box-shadow: var(--variant-shadow-sm, none);
    cursor: pointer;
    transition: transform 150ms ease;
  }

  input[data-range-component]::-moz-range-thumb:hover {
    transform: scale(1.1);
  }

  input[data-range-component]:focus-visible {
    outline: 2px solid var(--range-thumb-color, var(--color-primary, #3b82f6));
    outline-offset: 4px;
  }

  input[data-range-component]:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export function Range(props: RangeProps) {
  const size = () => props.size ?? "md";
  const color = () => props.color;

  const colorValue = colorMap[color()];
  const sizeStyle = sizeStyles[size()];

  const mergedStyles = (): JSX.CSSProperties =>
    ({
      ...baseRangeStyles,
      ...sizeStyle,
      "--range-thumb-color": colorValue,
      "--range-track-bg": `color-mix(in srgb, ${colorValue} 20%, var(--color-surface1, #e2e8f0))`,
    }) as JSX.CSSProperties;

  return (
    <>
      <style>{styleSheet}</style>
      <input
        {...props}
        type="range"
        data-range-component="true"
        class={props.class}
        style={mergedStyles()}
      />
    </>
  );
}
