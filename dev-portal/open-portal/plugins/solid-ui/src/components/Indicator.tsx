import { type JSX, type ParentProps } from "solid-js";

export type IndicatorPosition = "top" | "middle" | "bottom";
export type IndicatorAlignment = "start" | "center" | "end";
export type IndicatorVariant = "default" | "dot";

export interface IndicatorItemProps extends ParentProps {
  position?: IndicatorPosition;
  alignment?: IndicatorAlignment;
  variant?: IndicatorVariant;
  className?: string;
  style?: JSX.CSSProperties;
}

export interface IndicatorProps extends ParentProps {
  className?: string;
  style?: JSX.CSSProperties;
}

const baseStyles: JSX.CSSProperties = {
  position: "relative",
  display: "inline-flex",
  width: "fit-content",
};

const itemBaseStyles: JSX.CSSProperties = {
  position: "absolute",
  "z-index": "10",
  display: "flex",
  "align-items": "center",
  "justify-content": "center",
  padding: "0.25rem 0.5rem",
  "font-size": "0.75rem",
  "font-weight": "600",
  "border-radius": "9999px",
  "background-color": "var(--color-primary)",
  color: "white",
  "white-space": "nowrap",
};

const dotStyles: JSX.CSSProperties = {
  width: "0.5rem",
  height: "0.5rem",
  padding: "0",
  "border-radius": "9999px",
};

const positionStyles: Record<IndicatorPosition, Record<IndicatorAlignment, JSX.CSSProperties>> = {
  top: {
    start: { top: "0", left: "0", transform: "translate(-50%, -50%)" },
    center: { top: "0", left: "50%", transform: "translate(-50%, -50%)" },
    end: { top: "0", right: "0", transform: "translate(50%, -50%)" },
  },
  middle: {
    start: { top: "50%", left: "0", transform: "translate(-50%, -50%)" },
    center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
    end: { top: "50%", right: "0", transform: "translate(50%, -50%)" },
  },
  bottom: {
    start: { bottom: "0", left: "0", transform: "translate(-50%, 50%)" },
    center: { bottom: "0", left: "50%", transform: "translate(-50%, 50%)" },
    end: { bottom: "0", right: "0", transform: "translate(50%, 50%)" },
  },
};

export const IndicatorItem = (props: IndicatorItemProps) => {
  const position = () => props.position || "top";
  const alignment = () => props.alignment || "end";
  const variant = () => props.variant || "default";

  const mergedStyles = () => ({
    ...itemBaseStyles,
    ...positionStyles[position()][alignment()],
    ...(variant() === "dot" ? dotStyles : {}),
  });

  return (
    <div style={mergedStyles()} class={props.className}>
      {props.children}
    </div>
  );
};

export const Indicator = (props: IndicatorProps) => {
  return (
    <div style={{ ...baseStyles, ...props.style }} class={props.className}>
      {props.children}
    </div>
  );
};
