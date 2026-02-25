import { type JSX, type ParentProps, createSignal } from "solid-js";

export interface PageItemProps extends ParentProps {
  active?: boolean;
  disabled?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  class?: string;
  onClick?: () => void;
}

export interface PaginationProps extends ParentProps {
  size?: "xs" | "sm" | "md" | "lg";
  class?: string;
}

const basePaginationStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  gap: "0.25rem",
  "list-style": "none",
  padding: "0",
  margin: "0",
};

const sizeStyles: Record<
  string,
  { itemMinWidth: string; itemHeight: string; fontSize: string; padding: string }
> = {
  xs: {
    itemMinWidth: "1.5rem",
    itemHeight: "1.5rem",
    fontSize: "0.75rem",
    padding: "0 0.5rem",
  },
  sm: {
    itemMinWidth: "2rem",
    itemHeight: "2rem",
    fontSize: "0.8125rem",
    padding: "0 0.625rem",
  },
  md: {
    itemMinWidth: "2.5rem",
    itemHeight: "2.5rem",
    fontSize: "0.875rem",
    padding: "0 0.75rem",
  },
  lg: {
    itemMinWidth: "3rem",
    itemHeight: "3rem",
    fontSize: "1rem",
    padding: "0 1rem",
  },
};

const basePageItemStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  "justify-content": "center",
  "min-width": "2.5rem",
  height: "2.5rem",
  padding: "0 0.75rem",
  "border-radius": "var(--variant-radius, 0.5rem)",
  "font-size": "0.875rem",
  "font-weight": "500",
  color: "var(--color-text)",
  cursor: "pointer",
  transition: "background-color 150ms ease, color 150ms ease",
  border: "none",
  background: "transparent",
};

export const Pagination = (props: PaginationProps) => {
  return (
    <div class={props.class} style={basePaginationStyles}>
      {props.children}
    </div>
  );
};

export const PageItem = (props: PageItemProps) => {
  const [isHovered, setIsHovered] = createSignal(false);
  const size = () => props.size ?? "md";
  const sizeStyle = sizeStyles[size()];

  const mergedStyles = (): JSX.CSSProperties => {
    const baseStyles = { ...basePageItemStyles };

    if (sizeStyle) {
      baseStyles["min-width"] = sizeStyle.itemMinWidth;
      baseStyles["height"] = sizeStyle.itemHeight;
      baseStyles["font-size"] = sizeStyle.fontSize;
      baseStyles["padding"] = sizeStyle.padding;
    }

    if (props.active) {
      baseStyles["background-color"] = "var(--color-primary)";
      baseStyles["color"] = "white";
    } else if (isHovered() && !props.disabled) {
      baseStyles["background-color"] = "color-mix(in srgb, var(--color-primary) 10%, transparent)";
      baseStyles["color"] = "var(--color-primary)";
    }

    if (props.disabled) {
      baseStyles["opacity"] = "0.5";
      baseStyles["cursor"] = "not-allowed";
      baseStyles["pointer-events"] = "none";
    }

    return baseStyles as JSX.CSSProperties;
  };

  return (
    <button
      class={props.class}
      style={mergedStyles()}
      disabled={props.disabled}
      onClick={props.onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-current={props.active ? "page" : undefined}
      aria-disabled={props.disabled}
    >
      {props.children}
    </button>
  );
};

export const PaginationPrev = (
  props: ParentProps<{ disabled?: boolean; class?: string; onClick?: () => void }>,
) => {
  return (
    <PageItem disabled={props.disabled} class={props.class} onClick={props.onClick}>
      {props.children || "←"}
    </PageItem>
  );
};

export const PaginationNext = (
  props: ParentProps<{ disabled?: boolean; class?: string; onClick?: () => void }>,
) => {
  return (
    <PageItem disabled={props.disabled} class={props.class} onClick={props.onClick}>
      {props.children || "→"}
    </PageItem>
  );
};
