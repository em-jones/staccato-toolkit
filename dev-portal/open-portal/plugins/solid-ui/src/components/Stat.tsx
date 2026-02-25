import { type JSX, type ParentProps } from "solid-js";

type StatLayout = "vertical" | "horizontal";

export interface StatProps extends ParentProps {
  layout?: StatLayout;
  compact?: boolean;
  class?: string;
}

export interface StatTitleProps extends ParentProps {
  class?: string;
}

export interface StatValueProps extends ParentProps {
  class?: string;
}

export interface StatDescProps extends ParentProps {
  class?: string;
}

export interface StatFigureProps extends ParentProps {
  class?: string;
}

export interface StatActionsProps extends ParentProps {
  class?: string;
}

const baseStatStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-direction": "column",
  gap: "0.5rem",
  padding: "1.5rem",
  "background-color": "var(--color-bg)",
  "border-radius": "var(--variant-radius-lg, 0.75rem)",
  border: "1px solid var(--color-surface1)",
};

const statTitleStyles: JSX.CSSProperties = {
  "font-size": "0.875rem",
  "font-weight": "500",
  color: "var(--color-text-secondary)",
  "text-transform": "uppercase",
  "letter-spacing": "0.05em",
};

const statValueStyles: JSX.CSSProperties = {
  "font-size": "2rem",
  "font-weight": "700",
  "line-height": "1",
  color: "var(--color-text)",
};

const statDescStyles: JSX.CSSProperties = {
  "font-size": "0.875rem",
  color: "var(--color-text-secondary)",
};

const statFigureStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  "justify-content": "center",
  width: "3rem",
  height: "3rem",
  "border-radius": "var(--variant-radius, 0.5rem)",
  "background-color": "var(--color-surface0)",
};

const statActionsStyles: JSX.CSSProperties = {
  display: "flex",
  gap: "0.5rem",
  "margin-top": "0.5rem",
};

const statHorizontalStyles: JSX.CSSProperties = {
  "flex-direction": "row",
  "align-items": "center",
  gap: "1rem",
};

const statCompactStyles: JSX.CSSProperties = {
  padding: "1rem",
  gap: "0.25rem",
};

export const Stat = (props: StatProps) => {
  const layout = () => props.layout ?? "vertical";
  const isCompact = () => props.compact ?? false;

  const mergedStyles = (): JSX.CSSProperties => {
    let styles = { ...baseStatStyles };

    if (layout() === "horizontal") {
      (styles as any)["flex-direction"] = "row";
      (styles as any)["align-items"] = "center";
      (styles as any)["gap"] = "1rem";
    }

    if (isCompact()) {
      (styles as any)["padding"] = "1rem";
      (styles as any)["gap"] = "0.25rem";
    }

    return styles as JSX.CSSProperties;
  };

  return (
    <div class={props.class} style={mergedStyles()}>
      {props.children}
    </div>
  );
};

export const StatTitle = (props: StatTitleProps) => {
  return (
    <div class={props.class} style={statTitleStyles}>
      {props.children}
    </div>
  );
};

export const StatValue = (props: StatValueProps) => {
  return (
    <div class={props.class} style={statValueStyles}>
      {props.children}
    </div>
  );
};

export const StatDesc = (props: StatDescProps) => {
  return (
    <div class={props.class} style={statDescStyles}>
      {props.children}
    </div>
  );
};

export const StatFigure = (props: StatFigureProps) => {
  return (
    <figure class={props.class} style={statFigureStyles}>
      {props.children}
    </figure>
  );
};

export const StatActions = (props: StatActionsProps) => {
  return (
    <div class={props.class} style={statActionsStyles}>
      {props.children}
    </div>
  );
};
