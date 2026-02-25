import { type JSX, type ParentProps } from "solid-js";

type TimelineItemPosition = "start" | "end" | "vertical";
type TimelineItemDirection = "vertical" | "horizontal";

export interface TimelineProps extends ParentProps {
  class?: string;
}

export interface TimelineItemProps extends ParentProps {
  position?: TimelineItemPosition;
  direction?: TimelineItemDirection;
  class?: string;
}

export interface TimelineStartProps extends ParentProps {
  class?: string;
}

export interface TimelineEndProps extends ParentProps {
  class?: string;
}

export interface TimelineMiddleProps extends ParentProps {
  class?: string;
}

export interface TimelineDotProps extends ParentProps {
  class?: string;
}

export interface TimelineRingProps extends ParentProps {
  class?: string;
}

export interface TimelineLineProps extends ParentProps {
  class?: string;
}

export interface TimelineBoxProps extends ParentProps {
  class?: string;
}

export interface TimelineTitleProps extends ParentProps {
  class?: string;
}

export interface TimelineDateProps extends ParentProps {
  class?: string;
}

export interface TimelineTextProps extends ParentProps {
  class?: string;
}

const timelineStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-direction": "column",
};

const timelineItemStyles: JSX.CSSProperties = {
  display: "flex",
  gap: "1rem",
};

const timelineItemStartStyles: JSX.CSSProperties = {
  "flex-direction": "row",
};

const timelineItemEndStyles: JSX.CSSProperties = {
  "flex-direction": "row-reverse",
};

const timelineItemVerticalStyles: JSX.CSSProperties = {
  "flex-direction": "column",
};

const timelineStartStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-direction": "column",
  "align-items": "flex-end",
  "min-width": "4rem",
  "text-align": "right",
};

const timelineEndStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-direction": "column",
  "align-items": "flex-start",
  "min-width": "4rem",
  "text-align": "left",
};

const timelineMiddleStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-direction": "column",
  "align-items": "center",
};

const timelineDotStyles: JSX.CSSProperties = {
  width: "1rem",
  height: "1rem",
  "border-radius": "9999px",
  "background-color": "var(--color-primary)",
  "flex-shrink": "0",
};

const timelineRingStyles: JSX.CSSProperties = {
  width: "2rem",
  height: "2rem",
  "border-radius": "9999px",
  "background-color": "color-mix(in srgb, var(--color-primary) 20%, transparent)",
  display: "flex",
  "align-items": "center",
  "justify-content": "center",
};

const timelineLineStyles: JSX.CSSProperties = {
  flex: "1",
  width: "2px",
  "background-color": "var(--color-surface1)",
};

const timelineBoxStyles: JSX.CSSProperties = {
  padding: "1rem",
  "border-radius": "0.5rem",
  "background-color": "var(--color-bg)",
  border: "1px solid var(--color-surface1)",
};

const timelineTitleStyles: JSX.CSSProperties = {
  "font-weight": "600",
  color: "var(--color-text)",
};

const timelineDateStyles: JSX.CSSProperties = {
  "font-size": "0.75rem",
  color: "var(--color-text-secondary)",
};

const timelineTextStyles: JSX.CSSProperties = {
  "font-size": "0.875rem",
  color: "var(--color-text-secondary)",
};

export const Timeline = (props: TimelineProps) => {
  return (
    <div class={props.class} style={timelineStyles}>
      {props.children}
    </div>
  );
};

export const TimelineItem = (props: TimelineItemProps) => {
  const position = () => props.position ?? "start";
  const direction = () => props.direction ?? "vertical";

  const mergedStyles = (): JSX.CSSProperties => {
    let styles = { ...timelineItemStyles };

    if (position() === "start") {
      (styles as any)["flex-direction"] = "row";
    } else if (position() === "end") {
      (styles as any)["flex-direction"] = "row-reverse";
    } else if (direction() === "vertical") {
      (styles as any)["flex-direction"] = "column";
    }

    return styles as JSX.CSSProperties;
  };

  return (
    <div class={props.class} style={mergedStyles()}>
      {props.children}
    </div>
  );
};

export const TimelineStart = (props: TimelineStartProps) => {
  return (
    <div class={props.class} style={timelineStartStyles}>
      {props.children}
    </div>
  );
};

export const TimelineEnd = (props: TimelineEndProps) => {
  return (
    <div class={props.class} style={timelineEndStyles}>
      {props.children}
    </div>
  );
};

export const TimelineMiddle = (props: TimelineMiddleProps) => {
  return (
    <div class={props.class} style={timelineMiddleStyles}>
      {props.children}
    </div>
  );
};

export const TimelineDot = (props: TimelineDotProps) => {
  return (
    <div class={props.class} style={timelineDotStyles}>
      {props.children}
    </div>
  );
};

export const TimelineRing = (props: TimelineRingProps) => {
  return (
    <div class={props.class} style={timelineRingStyles}>
      {props.children}
    </div>
  );
};

export const TimelineLine = (props: TimelineLineProps) => {
  return (
    <div class={props.class} style={timelineLineStyles}>
      {props.children}
    </div>
  );
};

export const TimelineBox = (props: TimelineBoxProps) => {
  return (
    <div class={props.class} style={timelineBoxStyles}>
      {props.children}
    </div>
  );
};

export const TimelineTitle = (props: TimelineTitleProps) => {
  return (
    <div class={props.class} style={timelineTitleStyles}>
      {props.children}
    </div>
  );
};

export const TimelineDate = (props: TimelineDateProps) => {
  return (
    <div class={props.class} style={timelineDateStyles}>
      {props.children}
    </div>
  );
};

export const TimelineText = (props: TimelineTextProps) => {
  return (
    <div class={props.class} style={timelineTextStyles}>
      {props.children}
    </div>
  );
};
