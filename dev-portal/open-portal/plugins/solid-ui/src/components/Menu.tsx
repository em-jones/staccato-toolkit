import { type JSX, type ParentProps, createSignal, For } from "solid-js";

export interface MenuItemProps extends ParentProps {
  icon?: JSX.Element;
  disabled?: boolean;
  bordered?: boolean;
  active?: boolean;
  class?: string;
}

export interface MenuProps extends ParentProps {
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "vertical" | "horizontal";
  class?: string;
}

export interface MenuTitleProps extends ParentProps {
  class?: string;
}

const baseMenuStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-direction": "column",
  gap: "0.25rem",
  padding: "0.5rem",
  "font-size": "0.875rem",
  "list-style": "none",
};

const sizeStyles: Record<string, JSX.CSSProperties> = {
  xs: {
    "font-size": "0.75rem",
  },
  sm: {
    "font-size": "0.8125rem",
  },
  md: {
    "font-size": "0.875rem",
  },
  lg: {
    "font-size": "1rem",
  },
};

const menuItemBaseStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  gap: "0.75rem",
  padding: "0.625rem 1rem",
  "border-radius": "var(--variant-radius, 0.5rem)",
  cursor: "pointer",
  color: "var(--color-text)",
  transition:
    "background-color var(--variant-transition, 150ms) ease, color var(--variant-transition, 150ms) ease",
};

const menuTitleBaseStyles: JSX.CSSProperties = {
  display: "block",
  padding: "0.5rem 1rem",
  "font-size": "0.75rem",
  "font-weight": "600",
  "text-transform": "uppercase",
  "letter-spacing": "0.05em",
  color: "var(--color-overlay1, #94a3b8)",
};

export const Menu = (props: MenuProps) => {
  const size = () => props.size ?? "md";
  const variant = () => props.variant ?? "vertical";

  const mergedStyles = (): JSX.CSSProperties => {
    const baseStyles: JSX.CSSProperties = {
      ...baseMenuStyles,
      "flex-direction": variant() === "horizontal" ? "row" : "column",
    };
    return { ...baseStyles, ...sizeStyles[size()] } as JSX.CSSProperties;
  };

  return (
    <div class={props.class} style={mergedStyles()}>
      {props.children}
    </div>
  );
};

export const MenuItem = (props: MenuItemProps) => {
  const [isHovered, setIsHovered] = createSignal(false);

  const mergedStyles = (): JSX.CSSProperties => {
    const baseStyles = { ...menuItemBaseStyles };

    if (isHovered() || props.active) {
      baseStyles["background-color"] = "color-mix(in srgb, var(--color-primary) 10%, transparent)";
      baseStyles["color"] = "var(--color-primary)";
    }

    if (props.disabled) {
      baseStyles["opacity"] = "0.5";
      baseStyles["cursor"] = "not-allowed";
      baseStyles["pointer-events"] = "none";
    }

    if (props.bordered) {
      baseStyles["border"] = "1px solid var(--color-surface1)";
    }

    return baseStyles as JSX.CSSProperties;
  };

  return (
    <div
      class={props.class}
      style={mergedStyles()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="menuitem"
      aria-disabled={props.disabled}
    >
      {props.icon && (
        <span
          style={{
            width: "1.25rem",
            height: "1.25rem",
            "flex-shrink": "0",
          }}
        >
          {props.icon}
        </span>
      )}
      <span>{props.children}</span>
    </div>
  );
};

export const MenuTitle = (props: MenuTitleProps) => {
  return (
    <div class={props.class} style={menuTitleBaseStyles}>
      {props.children}
    </div>
  );
};

export const MenuDropdown = (props: ParentProps<{ trigger: JSX.Element; class?: string }>) => {
  const [isOpen, setIsOpen] = createSignal(false);

  const dropdownStyles: JSX.CSSProperties = {
    position: "relative",
  };

  const contentStyles: JSX.CSSProperties = {
    position: "absolute",
    left: "100%",
    top: "0",
    "margin-left": "0.5rem",
    "min-width": "12rem",
    padding: "0.5rem",
    "border-radius": "var(--variant-radius, 0.5rem)",
    "background-color": "var(--color-bg)",
    border: "1px solid var(--color-surface1)",
    "box-shadow": "var(--variant-shadow-md, none)",
    display: isOpen() ? "block" : "none",
    "z-index": "50",
  };

  return (
    <div
      class={props.class}
      style={dropdownStyles}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocusIn={() => setIsOpen(true)}
      onFocusOut={() => setIsOpen(false)}
    >
      <div>{props.trigger}</div>
      <div style={contentStyles}>{props.children}</div>
    </div>
  );
};
