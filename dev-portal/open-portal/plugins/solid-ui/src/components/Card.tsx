import type { JSX, ParentProps } from "solid-js";

export interface CardProps extends ParentProps {
  compact?: boolean;
  side?: boolean;
  bordered?: boolean;
  elevated?: boolean;
  hoverable?: boolean;
  glass?: boolean;
  class?: string;
}

export interface CardBodyProps extends ParentProps {
  class?: string;
}

export interface CardTitleProps extends ParentProps {
  class?: string;
}

export interface CardActionsProps extends ParentProps {
  class?: string;
}

export interface CardFigureProps extends ParentProps {
  class?: string;
}

const baseCardStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-direction": "column",
  "border-radius": "0.5rem",
  "background-color": "var(--color-base, var(--color-bg, white))",
  border: "1px solid var(--color-surface1, #e2e8f0)",
  overflow: "hidden",
  "transition-property": "box-shadow, border-color",
  "transition-timing-function": "cubic-bezier(0.4, 0, 0.2, 1)",
  "transition-duration": "150ms",
};

const cardBodyStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-direction": "column",
  gap: "0.5rem",
  padding: "1.25rem",
  flex: "1 1 auto",
};

const cardCompactBodyStyles: JSX.CSSProperties = {
  padding: "0.75rem",
  gap: "0.375rem",
};

const cardTitleStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  gap: "0.5rem",
  "font-size": "1.125rem",
  "font-weight": "600",
  "line-height": "1.75rem",
  color: "var(--color-text, #0f172a)",
};

const cardActionsStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-wrap": "wrap",
  "align-items": "center",
  gap: "0.5rem",
};

const cardFigureStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  "justify-content": "center",
  overflow: "hidden",
};

export const Card = (props: CardProps) => {
  const mergedStyles = (): JSX.CSSProperties => {
    const styles = { ...baseCardStyles };

    if (props.compact) {
      // Handled in CardBody
    }

    if (props.side) {
      (styles as any)["flex-direction"] = "row";
    }

    if (props.bordered) {
      (styles as any)["border-width"] = "2px";
    }

    if (props.elevated) {
      (styles as any)["border"] = "none";
      (styles as any)["box-shadow"] = "var(--variant-shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1))";
    }

    if (props.hoverable) {
      const originalStyles = styles;
      return {
        ...originalStyles,
      };
    }

    if (props.glass) {
      (styles as any)["background-color"] =
        "color-mix(in srgb, var(--color-bg, white) 70%, transparent)";
      (styles as any)["backdrop-filter"] = "blur(12px)";
      (styles as any)["border"] =
        "1px solid color-mix(in srgb, var(--color-surface1, #e2e8f0) 50%, transparent)";
    }

    return styles as JSX.CSSProperties;
  };

  const hoverableStyles = (): JSX.CSSProperties => {
    if (props.hoverable) {
      return {
        "&:hover": {
          "box-shadow": "var(--variant-shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1))",
          "border-color": "var(--color-primary, #3b82f6)",
        },
      } as JSX.CSSProperties;
    }
    return {};
  };

  return (
    <div class={props.class} style={mergedStyles()}>
      {props.children}
    </div>
  );
};

export const CardFigure = (props: CardFigureProps) => {
  return (
    <figure class={props.class} style={cardFigureStyles}>
      {props.children}
    </figure>
  );
};

export const CardBody = (props: CardBodyProps) => {
  // Note: compact style needs to be applied through parent Card's compact prop
  const mergedStyles = (): JSX.CSSProperties => ({
    ...cardBodyStyles,
  });

  return (
    <div class={props.class} style={mergedStyles()}>
      {props.children}
    </div>
  );
};

export const CardTitle = (props: CardTitleProps) => {
  return (
    <h2 class={props.class} style={cardTitleStyles}>
      {props.children}
    </h2>
  );
};

export const CardActions = (props: CardActionsProps) => {
  return (
    <div class={props.class} style={cardActionsStyles}>
      {props.children}
    </div>
  );
};
