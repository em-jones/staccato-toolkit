import { type JSX } from "solid-js";

export type FileInputSize = "xs" | "sm" | "md" | "lg";
export type FileInputVariant = "default" | "ghost" | "bordered";
export type FileInputColor =
  | "primary"
  | "secondary"
  | "accent"
  | "warning"
  | "error"
  | "green"
  | undefined;

export interface FileInputProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "type"> {
  class?: string;
  size?: FileInputSize;
  variant?: FileInputVariant;
  color?: FileInputColor;
}

const colorMap: Record<FileInputColor, string> = {
  primary: "var(--color-primary, #3b82f6)",
  secondary: "var(--color-secondary, #8b5cf6)",
  accent: "var(--color-accent, #ec4899)",
  warning: "var(--color-warning, #f59e0b)",
  error: "var(--color-error, #ef4444)",
  green: "var(--color-green, #10b981)",
  undefined: "var(--color-surface1, #e2e8f0)",
};

const sizeStyles: Record<FileInputSize, JSX.CSSProperties> = {
  xs: {
    "--input-font-size": "0.75rem",
    "--input-line-height": "1rem",
    "--input-px": "0.5rem",
    "--input-py": "0.125rem",
    "--input-h": "1.5rem",
  } as JSX.CSSProperties,
  sm: {
    "--input-font-size": "0.8125rem",
    "--input-line-height": "1.125rem",
    "--input-px": "0.625rem",
    "--input-py": "0.25rem",
    "--input-h": "2rem",
  } as JSX.CSSProperties,
  md: {
    "--input-font-size": "0.875rem",
    "--input-line-height": "1.25rem",
    "--input-px": "0.75rem",
    "--input-py": "0.5rem",
    "--input-h": "2.5rem",
  } as JSX.CSSProperties,
  lg: {
    "--input-font-size": "1rem",
    "--input-line-height": "1.5rem",
    "--input-px": "1rem",
    "--input-py": "0.75rem",
    "--input-h": "3rem",
  } as JSX.CSSProperties,
};

const baseStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  width: "100%",
  "font-size": "var(--input-font-size, 0.875rem)",
  "line-height": "var(--input-line-height, 1.25rem)",
  "padding-left": "var(--input-px, 0.75rem)",
  "padding-right": "var(--input-px, 0.75rem)",
  "padding-top": "var(--input-py, 0.5rem)",
  "padding-bottom": "var(--input-py, 0.5rem)",
  height: "var(--input-h, 2.5rem)",
  "min-height": "var(--input-h, 2.5rem)",
  "border-radius": "var(--input-radius, 0.5rem)",
  "background-color": "var(--color-bg, white)",
  color: "var(--color-text, #0f172a)",
  cursor: "pointer",
  "transition-property": "border-color, box-shadow",
  "transition-timing-function": "cubic-bezier(0.4, 0, 0.2, 1)",
  "transition-duration": "150ms",
};

const variantStyles: Record<FileInputVariant, JSX.CSSProperties> = {
  default: {
    border: "1px solid var(--color-surface2, #cbd5e1)",
  },
  ghost: {
    border: "1px solid transparent",
    "background-color": "transparent",
  },
  bordered: {
    border: "2px solid var(--color-surface2, #cbd5e1)",
  },
};

function getButtonStyles(color: FileInputColor): JSX.CSSProperties {
  return {
    "margin-right": "0.75rem",
    padding: "0.25rem 0.75rem",
    "border-radius": "0.375rem",
    border: "none",
    "background-color": colorMap[color] ?? "var(--color-surface1, #e2e8f0)",
    color: "white",
    "font-size": "0.875rem",
    "font-weight": "500",
    cursor: "pointer",
    transition: "background-color 150ms ease",
  };
}

export const FileInput = (props: FileInputProps) => {
  const size = () => props.size ?? "md";
  const variant = () => props.variant ?? "default";
  const color = () => props.color;

  const mergedStyles = (): JSX.CSSProperties => {
    const sizeStyle = sizeStyles[size()];
    const variantStyle = variantStyles[variant()];

    return {
      ...baseStyles,
      ...sizeStyle,
      ...variantStyle,
      "border-color": "var(--color-surface2, #cbd5e1)",
    } as JSX.CSSProperties;
  };

  const createFileInputStyle = () => {
    const style = document.createElement("style");
    style.textContent = `
      .file-input::file-selector-button {
        margin-right: 0.75rem;
        padding: 0.25rem 0.75rem;
        border-radius: 0.375rem;
        border: none;
        background-color: ${colorMap[color()] ?? "var(--color-surface1, #e2e8f0)"};
        color: white;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 150ms ease;
      }
      
      .file-input:focus,
      .file-input:focus-visible {
        outline: none;
        border-color: ${colorMap[color()] ?? "var(--color-primary, #3b82f6)"};
        box-shadow: 0 0 0 2px color-mix(in srgb, ${colorMap[color()] ?? "var(--color-primary, #3b82f6)"} 25%, transparent);
      }
      
      .file-input:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `;
    if (typeof document !== "undefined") {
      document.head.appendChild(style);
    }
  };

  if (typeof document !== "undefined") {
    createFileInputStyle();
  }

  return (
    <input
      {...props}
      type="file"
      class={`file-input ${props.class || ""}`.trim()}
      style={mergedStyles()}
    />
  );
};
