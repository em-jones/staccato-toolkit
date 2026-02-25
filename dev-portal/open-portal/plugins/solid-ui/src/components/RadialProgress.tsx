import { type JSX, type ParentProps } from "solid-js";

type ColorVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "success"
  | "warning"
  | "error"
  | undefined;
type Size = "xs" | "sm" | "md" | "lg" | "xl";

export interface RadialProgressProps extends ParentProps<JSX.HTMLAttributes<HTMLDivElement>> {
  value?: number;
  color?: ColorVariant;
  size?: Size;
  thickness?: "thin" | "normal" | "thick";
  centered?: boolean;
  class?: string;
}

const baseRadialProgressStyles: JSX.CSSProperties = {
  display: "inline-flex",
  "align-items": "center",
  "justify-content": "center",
  position: "relative",
  "border-radius": "9999px",
  "font-weight": "600",
  color: "var(--color-text, #0f172a)",
};

const sizeStyles: Record<Size, JSX.CSSProperties> = {
  xs: {
    width: "2rem",
    height: "2rem",
    "font-size": "0.625rem",
    "--rp-size": "2rem",
    "--rp-thickness": "0.25rem",
  } as JSX.CSSProperties,
  sm: {
    width: "3rem",
    height: "3rem",
    "font-size": "0.75rem",
    "--rp-size": "3rem",
    "--rp-thickness": "0.375rem",
  } as JSX.CSSProperties,
  md: {
    width: "5rem",
    height: "5rem",
    "font-size": "1rem",
    "--rp-size": "5rem",
    "--rp-thickness": "0.5rem",
  } as JSX.CSSProperties,
  lg: {
    width: "8rem",
    height: "8rem",
    "font-size": "1.5rem",
    "--rp-size": "8rem",
    "--rp-thickness": "0.75rem",
  } as JSX.CSSProperties,
  xl: {
    width: "10rem",
    height: "10rem",
    "font-size": "2rem",
    "--rp-size": "10rem",
    "--rp-thickness": "1rem",
  } as JSX.CSSProperties,
};

const thicknessStyles: Record<"thin" | "normal" | "thick", string> = {
  thin: "0.25rem",
  normal: "0.5rem",
  thick: "1rem",
};

const colorMap: Record<ColorVariant, string> = {
  primary: "var(--color-primary, #3b82f6)",
  secondary: "var(--color-secondary, #8b5cf6)",
  accent: "var(--color-accent, #ec4899)",
  success: "var(--color-success, #10b981)",
  warning: "var(--color-warning, #f59e0b)",
  error: "var(--color-error, #ef4444)",
  undefined: "var(--color-primary, #3b82f6)",
};

export function RadialProgress(props: RadialProgressProps) {
  const size = () => props.size ?? "md";
  const color = () => props.color;
  const value = () => Math.max(0, Math.min(props.value ?? 0, 100));
  const thickness = () => props.thickness ?? "normal";
  const centered = () => props.centered ?? false;

  const colorValue = colorMap[color()];
  const sizeStyle = sizeStyles[size()];
  const thicknessValue = thicknessStyles[thickness()];

  const mergedStyles = (): JSX.CSSProperties =>
    ({
      ...baseRadialProgressStyles,
      ...sizeStyle,
      "--rp-color": colorValue,
      "--rp-thickness": thicknessValue,
      background: `conic-gradient(${colorValue} calc(${value()} * 1%), var(--color-surface1, #e2e8f0) 0)`,
      color: colorValue,
    }) as JSX.CSSProperties;

  const innerStyles = (): JSX.CSSProperties => ({
    content: '""',
    position: "absolute",
    "border-radius": "9999px",
    inset: thicknessValue,
    background: "var(--color-bg, white)",
  });

  return (
    <div {...props} class={props.class} style={mergedStyles()}>
      <div style={innerStyles()} />
      <div
        style={{
          position: "relative",
          "z-index": "1",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          width: "100%",
          height: "100%",
        }}
      >
        {props.children}
      </div>
    </div>
  );
}
