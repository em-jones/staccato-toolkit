import { type JSX, type ParentProps } from "solid-js";

export type StackDirection = "vertical" | "horizontal";
export type StackGap = "0" | "1" | "2" | "3" | "4" | "6" | "8";
export type StackAlignment = "start" | "end" | "center" | "stretch";
export type StackJustify = "start" | "end" | "center" | "between";

export interface StackProps extends ParentProps {
  direction?: StackDirection;
  gap?: StackGap;
  alignment?: StackAlignment;
  justify?: StackJustify;
  reverse?: boolean;
  className?: string;
  style?: JSX.CSSProperties;
}

const gapMap: Record<StackGap, string> = {
  "0": "0",
  "1": "0.25rem",
  "2": "0.5rem",
  "3": "0.75rem",
  "4": "1rem",
  "6": "1.5rem",
  "8": "2rem",
};

const alignmentMap: Record<StackAlignment, string> = {
  start: "flex-start",
  end: "flex-end",
  center: "center",
  stretch: "stretch",
};

const justifyMap: Record<StackJustify, string> = {
  start: "flex-start",
  end: "flex-end",
  center: "center",
  between: "space-between",
};

const baseStyles: JSX.CSSProperties = {
  display: "flex",
};

export const Stack = (props: StackProps) => {
  const direction = () => props.direction || "vertical";
  const gap = () => props.gap || "4";
  const alignment = () => props.alignment || "stretch";
  const justify = () => props.justify || "start";
  const reverse = () => props.reverse || false;

  const flexDirection = (): string => {
    if (direction() === "horizontal") {
      return reverse() ? "row-reverse" : "row";
    }
    return reverse() ? "column-reverse" : "column";
  };

  const styles: JSX.CSSProperties = {
    ...baseStyles,
    "flex-direction": flexDirection(),
    gap: gapMap[gap()],
    "align-items": alignmentMap[alignment()],
    "justify-content": justifyMap[justify()],
    ...props.style,
  };

  return (
    <div style={styles} class={props.className}>
      {props.children}
    </div>
  );
};
