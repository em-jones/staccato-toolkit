import { type JSX, type ParentProps, createSignal } from "solid-js";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

export interface TabsProps extends ParentProps {
  size?: Size;
  pills?: boolean;
  class?: string;
}

export interface TabsListProps extends ParentProps {
  centered?: boolean;
  full?: boolean;
  class?: string;
}

export interface TabProps extends ParentProps {
  value?: string;
  disabled?: boolean;
  active?: boolean;
  onClick?: () => void;
  class?: string;
}

export interface TabsContentProps extends ParentProps {
  value?: string;
  outlined?: boolean;
  hidden?: boolean;
  class?: string;
}

const sizeStyles: Record<Size, JSX.CSSProperties> = {
  xs: {
    "font-size": "0.75rem",
    "line-height": "1rem",
    "padding-left": "0.5rem",
    "padding-right": "0.5rem",
    "padding-top": "0.25rem",
    "padding-bottom": "0.25rem",
    gap: "0.25rem",
  },
  sm: {
    "font-size": "0.8125rem",
    "line-height": "1.125rem",
    "padding-left": "0.625rem",
    "padding-right": "0.625rem",
    "padding-top": "0.375rem",
    "padding-bottom": "0.375rem",
    gap: "0.25rem",
  },
  md: {
    "font-size": "0.875rem",
    "line-height": "1.25rem",
    "padding-left": "0.875rem",
    "padding-right": "0.875rem",
    "padding-top": "0.5rem",
    "padding-bottom": "0.5rem",
  },
  lg: {
    "font-size": "1rem",
    "line-height": "1.5rem",
    "padding-left": "1rem",
    "padding-right": "1rem",
    "padding-top": "0.75rem",
    "padding-bottom": "0.75rem",
    gap: "0.5rem",
  },
  xl: {
    "font-size": "1.125rem",
    "line-height": "1.75rem",
    "padding-left": "1.25rem",
    "padding-right": "1.25rem",
    "padding-top": "1rem",
    "padding-bottom": "1rem",
    gap: "0.5rem",
  },
};

const baseTabsStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-direction": "column",
  width: "100%",
};

const baseTabsListStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  gap: "0",
  "border-bottom": "1px solid var(--color-surface2, #cbd5e1)",
  "overflow-x": "auto",
  "overflow-y": "hidden",
  "scrollbar-width": "none",
};

const baseTabStyles: JSX.CSSProperties = {
  display: "inline-flex",
  "align-items": "center",
  "justify-content": "center",
  gap: "0.5rem",
  position: "relative",
  "font-weight": "500",
  color: "var(--color-text-secondary, #64748b)",
  "background-color": "transparent",
  border: "none",
  cursor: "pointer",
  "white-space": "nowrap",
  "user-select": "none",
  "transition-property": "color, background-color, border-color",
  "transition-timing-function": "cubic-bezier(0.4, 0, 0.2, 1)",
  "transition-duration": "150ms",
  padding: "0.5rem 0.875rem",
  "font-size": "0.875rem",
};

const tabActiveStyles: JSX.CSSProperties = {
  color: "var(--color-primary, #3b82f6)",
};

const baseTabsContentStyles: JSX.CSSProperties = {
  "padding-top": "1rem",
};

const tabsContentOutlinedStyles: JSX.CSSProperties = {
  border: "1px solid var(--color-surface2, #cbd5e1)",
  "border-top": "none",
  "border-radius": "0 0 0.375rem 0.375rem",
  padding: "1rem",
};

const pillsTabsListStyles: JSX.CSSProperties = {
  "border-bottom": "none",
  gap: "0.25rem",
  "background-color": "var(--color-surface0, #f1f5f9)",
  padding: "0.25rem",
  "border-radius": "0.375rem",
};

const pillsTabStyles: JSX.CSSProperties = {
  "border-radius": "0.25rem",
  padding: "0.5rem 0.875rem",
};

const pillsTabActiveStyles: JSX.CSSProperties = {
  "background-color": "var(--color-bg, white)",
  "box-shadow": "var(--tabs-pills-shadow, none)",
  color: "var(--color-primary, #3b82f6)",
};

export const Tabs = (props: TabsProps) => {
  const size = () => props.size ?? "md";
  const sizeStyle = sizeStyles[size()];

  const mergedStyles = (): JSX.CSSProperties =>
    ({
      ...baseTabsStyles,
      ...sizeStyle,
    }) as JSX.CSSProperties;

  return (
    <div class={props.class} style={mergedStyles()}>
      {props.children}
    </div>
  );
};

export const TabsList = (props: TabsListProps) => {
  const mergedStyles = (): JSX.CSSProperties => {
    const styles = { ...baseTabsListStyles };
    if (props.centered) {
      (styles as any)["justify-content"] = "center";
    }
    if (props.full) {
      // Handled in Tab component
    }
    return styles as JSX.CSSProperties;
  };

  return (
    <div class={props.class} style={mergedStyles()}>
      {props.children}
    </div>
  );
};

export const Tab = (props: TabProps) => {
  const mergedStyles = (): JSX.CSSProperties => {
    const styles = { ...baseTabStyles };
    if (props.active) {
      Object.assign(styles, tabActiveStyles);
    }
    if (props.disabled) {
      (styles as any)["opacity"] = "0.5";
      (styles as any)["cursor"] = "not-allowed";
      (styles as any)["pointer-events"] = "none";
    }
    return styles as JSX.CSSProperties;
  };

  return (
    <button
      class={props.class}
      style={mergedStyles()}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
};

export const TabsContent = (props: TabsContentProps) => {
  const mergedStyles = (): JSX.CSSProperties => {
    const styles = props.outlined
      ? { ...baseTabsContentStyles, ...tabsContentOutlinedStyles }
      : { ...baseTabsContentStyles };
    if (props.hidden) {
      (styles as any)["display"] = "none";
    }
    return styles as JSX.CSSProperties;
  };

  return (
    <div class={props.class} style={mergedStyles()}>
      {props.children}
    </div>
  );
};

// Helper: Tabs with Pills variant wrapper
export interface PillsTabsProps extends ParentProps {
  size?: Size;
  class?: string;
}

export const PillsTabs = (props: PillsTabsProps) => {
  const size = () => props.size ?? "md";
  const sizeStyle = sizeStyles[size()];

  const mergedStyles = (): JSX.CSSProperties =>
    ({
      ...baseTabsStyles,
      ...sizeStyle,
    }) as JSX.CSSProperties;

  return (
    <div class={props.class} style={mergedStyles()}>
      {props.children}
    </div>
  );
};

export const PillsTabsList = (props: TabsListProps) => {
  const mergedStyles = (): JSX.CSSProperties => {
    const styles = { ...baseTabsListStyles, ...pillsTabsListStyles };
    if (props.centered) {
      (styles as any)["justify-content"] = "center";
    }
    return styles as JSX.CSSProperties;
  };

  return (
    <div class={props.class} style={mergedStyles()}>
      {props.children}
    </div>
  );
};

export const PillsTab = (props: TabProps) => {
  const mergedStyles = (): JSX.CSSProperties => {
    const styles = { ...baseTabStyles, ...pillsTabStyles };
    if (props.active) {
      Object.assign(styles, pillsTabActiveStyles);
    }
    if (props.disabled) {
      (styles as any)["opacity"] = "0.5";
      (styles as any)["cursor"] = "not-allowed";
      (styles as any)["pointer-events"] = "none";
    }
    return styles as JSX.CSSProperties;
  };

  return (
    <button
      class={props.class}
      style={mergedStyles()}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
};
