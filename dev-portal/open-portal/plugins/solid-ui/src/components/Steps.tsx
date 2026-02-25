import { type JSX, type ParentProps, createSignal } from "solid-js";

type StepStatus = "complete" | "active" | "pending";

export interface StepProps extends ParentProps {
  status?: StepStatus;
  icon?: JSX.Element;
  title?: string;
  description?: string;
  class?: string;
}

export interface StepsProps extends ParentProps {
  orientation?: "horizontal" | "vertical";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  class?: string;
}

const baseStepsStyles: JSX.CSSProperties = {
  display: "flex",
  width: "100%",
  "overflow-x": "auto",
  "scrollbar-width": "none",
};

const baseStepStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-direction": "column",
  "align-items": "center",
  gap: "0.5rem",
  flex: "1 1 0",
  "min-width": "4rem",
  position: "relative",
};

const sizeStyles: Record<
  string,
  { iconWidth: string; iconHeight: string; fontSize: string; beforeTop: string }
> = {
  xs: {
    iconWidth: "1.5rem",
    iconHeight: "1.5rem",
    fontSize: "0.75rem",
    beforeTop: "0.75rem",
  },
  sm: {
    iconWidth: "2rem",
    iconHeight: "2rem",
    fontSize: "0.875rem",
    beforeTop: "1rem",
  },
  md: {
    iconWidth: "2.5rem",
    iconHeight: "2.5rem",
    fontSize: "1rem",
    beforeTop: "1.25rem",
  },
  lg: {
    iconWidth: "3rem",
    iconHeight: "3rem",
    fontSize: "1.125rem",
    beforeTop: "1.5rem",
  },
  xl: {
    iconWidth: "3.5rem",
    iconHeight: "3.5rem",
    fontSize: "1.25rem",
    beforeTop: "1.75rem",
  },
};

export const Steps = (props: StepsProps) => {
  const orientation = () => props.orientation ?? "horizontal";

  const mergedStyles = (): JSX.CSSProperties => {
    const baseStyles = { ...baseStepsStyles };
    if (orientation() === "vertical") {
      baseStyles["flex-direction"] = "column";
    }
    return baseStyles as JSX.CSSProperties;
  };

  return (
    <div class={props.class} style={mergedStyles()}>
      {props.children}
    </div>
  );
};

export const Step = (props: StepProps) => {
  const status = () => props.status ?? "pending";
  const sizeStyle = sizeStyles["md"];

  const stepBaseStyles: JSX.CSSProperties = {
    ...baseStepStyles,
    "&::before": {
      content: '""',
      position: "absolute",
      top: sizeStyle.beforeTop,
      left: "-50%",
      right: "50%",
      height: "2px",
      "background-color": "var(--color-surface1)",
      "z-index": "0",
    },
  };

  const iconBaseStyles: JSX.CSSProperties = {
    display: "flex",
    "align-items": "center",
    "justify-content": "center",
    width: sizeStyle.iconWidth,
    height: sizeStyle.iconHeight,
    "border-radius": "9999px",
    "background-color": "var(--color-bg)",
    border: "2px solid var(--color-surface1)",
    color: "var(--color-overlay1)",
    "font-size": sizeStyle.fontSize,
    "font-weight": "600",
    "z-index": "1",
    transition: "background-color 150ms ease, border-color 150ms ease, color 150ms ease",
  };

  const getIconStyles = (): JSX.CSSProperties => {
    const baseIconStyles = { ...iconBaseStyles };
    if (status() === "active") {
      baseIconStyles["border-color"] = "var(--color-primary)";
      baseIconStyles["color"] = "var(--color-primary)";
    } else if (status() === "complete") {
      baseIconStyles["background-color"] = "var(--color-primary)";
      baseIconStyles["border-color"] = "var(--color-primary)";
      baseIconStyles["color"] = "white";
    }
    return baseIconStyles as JSX.CSSProperties;
  };

  const titleStyles: JSX.CSSProperties = {
    "font-size": "0.875rem",
    "font-weight": "500",
    color: status() === "active" ? "var(--color-primary)" : "var(--color-text-secondary)",
    "text-align": "center",
  };

  const descriptionStyles: JSX.CSSProperties = {
    "font-size": "0.75rem",
    color: "var(--color-overlay1)",
    "text-align": "center",
  };

  return (
    <div class={props.class} style={stepBaseStyles}>
      <div style={getIconStyles()}>{props.icon}</div>
      {props.title && <div style={titleStyles}>{props.title}</div>}
      {props.description && <div style={descriptionStyles}>{props.description}</div>}
      {props.children}
    </div>
  );
};

export const StepIcon = (props: ParentProps<{ class?: string }>) => {
  return (
    <span
      class={props.class}
      style={{
        width: "1.25rem",
        height: "1.25rem",
        display: "flex",
        "align-items": "center",
        "justify-content": "center",
      }}
    >
      {props.children}
    </span>
  );
};

export const StepContent = (props: ParentProps<{ class?: string }>) => {
  return (
    <div
      class={props.class}
      style={{
        display: "flex",
        "flex-direction": "column",
        gap: "0.25rem",
        "padding-top": "0.25rem",
      }}
    >
      {props.children}
    </div>
  );
};
