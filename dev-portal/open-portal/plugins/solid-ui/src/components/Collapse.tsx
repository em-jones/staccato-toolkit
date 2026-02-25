import { type JSX, type ParentProps, createSignal } from "solid-js";

type CollapseIconType = "arrow" | "plus";

export interface CollapseProps extends ParentProps {
  open?: boolean;
  iconType?: CollapseIconType;
  focus?: boolean;
  hover?: boolean;
  bordered?: boolean;
  glass?: boolean;
  class?: string;
  onOpenChange?: (isOpen: boolean) => void;
}

export interface CollapseTitleProps extends ParentProps {
  class?: string;
}

export interface CollapseContentProps extends ParentProps {
  class?: string;
}

const collapseStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-direction": "column",
  "background-color": "var(--color-bg)",
  "border-radius": "var(--variant-radius, 0.5rem)",
  border: "1px solid var(--color-surface1)",
  overflow: "hidden",
};

const collapseBorderedStyles: JSX.CSSProperties = {
  "border-width": "2px",
};

const collapseGlassStyles: JSX.CSSProperties = {
  "background-color": "color-mix(in srgb, var(--color-bg) 80%, transparent)",
  "backdrop-filter": "blur(8px)",
};

const collapseTitleStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  "justify-content": "space-between",
  padding: "1rem",
  "font-size": "1rem",
  "font-weight": "600",
  color: "var(--color-text)",
  cursor: "pointer",
};

const collapseContentStyles: JSX.CSSProperties = {
  padding: "0 1rem",
  "font-size": "0.875rem",
  color: "var(--color-text-secondary)",
  "max-height": "0",
  overflow: "hidden",
  "transition-property": "max-height, padding",
  "transition-duration": "var(--variant-transition, 300ms)",
  "transition-timing-function": "ease",
};

const collapseContentOpenStyles: JSX.CSSProperties = {
  "max-height": "1000px",
  "padding-top": "0.5rem",
  "padding-bottom": "1rem",
};

const collapseArrowStyles: JSX.CSSProperties = {
  width: "1.25rem",
  height: "1.25rem",
  "transition-property": "transform",
  "transition-duration": "var(--variant-transition, 150ms)",
  "transition-timing-function": "ease",
  "flex-shrink": "0",
};

export const Collapse = (props: CollapseProps) => {
  const [isOpen, setIsOpen] = createSignal(props.open ?? false);
  const iconType = () => props.iconType ?? "arrow";
  const isBordered = () => props.bordered ?? false;
  const isGlass = () => props.glass ?? false;
  const hasFocus = () => props.focus ?? false;
  const hasHover = () => props.hover ?? false;

  const toggleOpen = () => {
    const newState = !isOpen();
    setIsOpen(newState);
    props.onOpenChange?.(newState);
  };

  const mergedStyles = (): JSX.CSSProperties => {
    let styles = { ...collapseStyles };

    if (isBordered()) {
      (styles as any)["border-width"] = "2px";
    }

    if (isGlass()) {
      (styles as any)["background-color"] = "color-mix(in srgb, var(--color-bg) 80%, transparent)";
      (styles as any)["backdrop-filter"] = "blur(8px)";
    }

    return styles as JSX.CSSProperties;
  };

  return (
    <div class={props.class} style={mergedStyles()}>
      <CollapseTitleInternal
        isOpen={isOpen()}
        onToggle={toggleOpen}
        iconType={iconType()}
        hasFocus={hasFocus()}
        hasHover={hasHover()}
      >
        {props.children}
      </CollapseTitleInternal>
    </div>
  );
};

interface CollapseTitleInternalProps extends ParentProps {
  isOpen: boolean;
  onToggle: () => void;
  iconType: CollapseIconType;
  hasFocus: boolean;
  hasHover: boolean;
}

const CollapseTitleInternal = (props: CollapseTitleInternalProps) => {
  const mergedStyles = (): JSX.CSSProperties => {
    return collapseTitleStyles;
  };

  return (
    <button style={mergedStyles()} onClick={props.onToggle}>
      {props.children}
      {props.iconType === "arrow" && (
        <svg
          style={{
            ...collapseArrowStyles,
            transform: props.isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      )}
      {props.iconType === "plus" && (
        <span
          style={{
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
            width: "1.25rem",
            height: "1.25rem",
            "font-size": "1rem",
            "font-weight": "400",
            "transition-property": "transform",
            "transition-duration": "var(--variant-transition, 150ms)",
            "transition-timing-function": "ease",
            transform: props.isOpen ? "rotate(45deg)" : "rotate(0deg)",
          }}
        >
          +
        </span>
      )}
    </button>
  );
};

export const CollapseTitle = (props: CollapseTitleProps) => {
  return (
    <div class={props.class} style={collapseTitleStyles}>
      {props.children}
    </div>
  );
};

export const CollapseContent = (props: CollapseContentProps) => {
  return (
    <div class={props.class} style={collapseContentStyles}>
      {props.children}
    </div>
  );
};
