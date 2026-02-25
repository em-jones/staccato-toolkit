import { type ParentProps, type JSX, onMount } from "solid-js";

// Register keyframes on page load
if (typeof document !== "undefined") {
  onMount(() => {
    const styleId = "loading-keyframes";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        @keyframes bars {
          0%, 40%, 100% { transform: scaleY(0.4); }
          20% { transform: scaleY(1); }
        }
        @keyframes infinity {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `;
      document.head.appendChild(style);
    }
  });
}

export type LoadingVariant = "spinner" | "dots" | "ring" | "bars" | "infinity";

export type LoadingSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface LoadingProps extends ParentProps {
  class?: string;
  variant?: LoadingVariant;
  size?: LoadingSize;
}

const baseStyles: JSX.CSSProperties = {
  display: "inline-flex",
  "align-items": "center",
  "justify-content": "center",
  "pointer-events": "none",
};

const sizeMap: Record<LoadingSize, string> = {
  xs: "1rem",
  sm: "1.25rem",
  md: "1.5rem",
  lg: "2rem",
  xl: "2.5rem",
};

const sizeBorderWidthMap: Record<LoadingSize, string> = {
  xs: "2px",
  sm: "2px",
  md: "3px",
  lg: "4px",
  xl: "5px",
};

const spinnerStyles = (size: LoadingSize): JSX.CSSProperties => ({
  width: sizeMap[size],
  height: sizeMap[size],
  border: `${sizeBorderWidthMap[size]} solid var(--color-surface1, #e2e8f0)`,
  "border-top-color": "var(--color-primary, #3b82f6)",
  "border-radius": "9999px",
  animation: "spin 1s linear infinite",
});

const dotsStyles: JSX.CSSProperties = {
  display: "flex",
  gap: "0.25rem",
};

const dotItemStyles: JSX.CSSProperties = {
  width: "0.5rem",
  height: "0.5rem",
  "border-radius": "9999px",
  "background-color": "var(--color-primary, #3b82f6)",
  animation: "bounce 1.4s infinite ease-in-out both",
};

const ringStyles = (size: LoadingSize): JSX.CSSProperties => ({
  display: "inline-block",
  width: sizeMap[size],
  height: sizeMap[size],
  "border-radius": "9999px",
  border: `${sizeBorderWidthMap[size]} solid transparent`,
  "border-top-color": "var(--color-primary, #3b82f6)",
  animation: "spin 1s linear infinite",
  position: "relative",
});

const ringAfterStyles: JSX.CSSProperties = {
  content: '""',
  position: "absolute",
  inset: "-3px",
  "border-radius": "9999px",
  border: "3px solid transparent",
  "border-top-color": "var(--color-secondary, #8b5cf6)",
  animation: "spin 2s linear infinite",
};

const barsStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "flex-end",
  gap: "2px",
  height: "1.5rem",
};

const barItemStyles = (delay: string, height: string): JSX.CSSProperties => ({
  width: "4px",
  height,
  "background-color": "var(--color-primary, #3b82f6)",
  animation: `bars 1.2s infinite ease-in-out`,
  "animation-delay": delay,
});

const infinityStyles: JSX.CSSProperties = {
  width: "3rem",
  height: "1rem",
  position: "relative",
  overflow: "hidden",
};

const infinityPartStyles = (position: "left" | "right"): JSX.CSSProperties => ({
  content: '""',
  position: "absolute",
  top: "0",
  [position]: "0",
  width: "50%",
  height: "100%",
  "border-radius": "9999px",
  animation: "infinity 2s infinite ease-in-out",
  ...(position === "left" && {
    "background-color": "var(--color-primary, #3b82f6)",
  }),
  ...(position === "right" && {
    "background-color": "var(--color-secondary, #8b5cf6)",
    "animation-delay": "1s",
  }),
});

export const Loading = (props: LoadingProps) => {
  const variant = () => props.variant ?? "spinner";
  const size = () => props.size ?? "md";

  return (
    <div class={props.class} style={baseStyles}>
      {variant() === "spinner" && <div style={spinnerStyles(size())} />}

      {variant() === "dots" && (
        <div style={dotsStyles}>
          <span style={{ ...dotItemStyles, "animation-delay": "-0.32s" }} />
          <span style={{ ...dotItemStyles, "animation-delay": "-0.16s" }} />
          <span style={dotItemStyles} />
        </div>
      )}

      {variant() === "ring" && (
        <div style={ringStyles(size())}>
          <div style={ringAfterStyles} />
        </div>
      )}

      {variant() === "bars" && (
        <div style={barsStyles}>
          <span style={barItemStyles("-1.2s", "60%")} />
          <span style={barItemStyles("-1.1s", "40%")} />
          <span style={barItemStyles("-1s", "80%")} />
          <span style={barItemStyles("-0.9s", "50%")} />
        </div>
      )}

      {variant() === "infinity" && (
        <div style={infinityStyles}>
          <div style={infinityPartStyles("left")} />
          <div style={infinityPartStyles("right")} />
        </div>
      )}

      {props.children}
    </div>
  );
};
