import { type JSX, type ParentProps, createSignal } from "solid-js";

export interface NavbarProps extends ParentProps {
  size?: "xs" | "sm" | "md" | "lg";
  glass?: boolean;
  class?: string;
}

export interface NavbarSectionProps extends ParentProps {
  position: "start" | "center" | "end";
  class?: string;
}

export interface NavbarItemProps extends ParentProps {
  active?: boolean;
  icon?: JSX.Element;
  class?: string;
  href?: string;
}

export interface NavbarTitleProps extends ParentProps {
  class?: string;
}

const baseNavbarStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  "justify-content": "space-between",
  width: "100%",
  padding: "0.75rem 1.5rem",
  "background-color": "var(--color-bg)",
  "border-bottom": "1px solid var(--color-surface1)",
  "min-height": "4rem",
};

const sizeStyles: Record<string, JSX.CSSProperties> = {
  xs: {
    padding: "0.25rem 1rem",
    "min-height": "2.5rem",
  },
  sm: {
    padding: "0.5rem 1.25rem",
    "min-height": "3rem",
  },
  md: {
    padding: "0.75rem 1.5rem",
    "min-height": "4rem",
  },
  lg: {
    padding: "1rem 2rem",
    "min-height": "5rem",
  },
};

const sectionBaseStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  gap: "1rem",
};

const itemBaseStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  gap: "0.5rem",
  padding: "0.5rem 0.75rem",
  "border-radius": "var(--variant-radius-sm, 0.375rem)",
  color: "var(--color-text)",
  "text-decoration": "none",
  transition: "background-color var(--variant-transition, 150ms) ease",
  cursor: "pointer",
};

export const Navbar = (props: NavbarProps) => {
  const size = () => props.size ?? "md";

  const mergedStyles = (): JSX.CSSProperties => {
    const baseStyles = { ...baseNavbarStyles };
    const sizeStyle = sizeStyles[size()];

    if (props.glass) {
      baseStyles["background-color"] = "color-mix(in srgb, var(--color-bg) 80%, transparent)";
      baseStyles["backdrop-filter"] = "blur(12px)";
    }

    return { ...baseStyles, ...sizeStyle } as JSX.CSSProperties;
  };

  return (
    <nav class={props.class} style={mergedStyles()}>
      {props.children}
    </nav>
  );
};

export const NavbarSection = (props: NavbarSectionProps) => {
  const justifyContent = () => {
    switch (props.position) {
      case "start":
        return "flex-start";
      case "center":
        return "center";
      case "end":
        return "flex-end";
      default:
        return "flex-start";
    }
  };

  const sectionStyles = (): JSX.CSSProperties => ({
    ...sectionBaseStyles,
    "justify-content": justifyContent(),
  });

  return (
    <div class={props.class} style={sectionStyles()}>
      {props.children}
    </div>
  );
};

export const NavbarItem = (props: NavbarItemProps) => {
  const [isHovered, setIsHovered] = createSignal(false);

  const mergedStyles = (): JSX.CSSProperties => {
    const baseStyles = { ...itemBaseStyles };

    if (isHovered() || props.active) {
      baseStyles["background-color"] = "color-mix(in srgb, var(--color-primary) 10%, transparent)";
      baseStyles["color"] = "var(--color-primary)";
    }

    return baseStyles as JSX.CSSProperties;
  };

  const element = (
    <div
      class={props.class}
      style={mergedStyles()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="menuitem"
      aria-current={props.active ? "page" : undefined}
    >
      {props.icon && (
        <span
          style={{
            width: "1.25rem",
            height: "1.25rem",
          }}
        >
          {props.icon}
        </span>
      )}
      <span>{props.children}</span>
    </div>
  );

  if (props.href) {
    return (
      <a href={props.href} style={mergedStyles()} class={props.class}>
        {props.children}
      </a>
    );
  }

  return element;
};

export const NavbarTitle = (props: NavbarTitleProps) => {
  const titleStyles: JSX.CSSProperties = {
    "font-size": "1.25rem",
    "font-weight": "700",
    color: "var(--color-text)",
    "text-decoration": "none",
  };

  return (
    <div class={props.class} style={titleStyles}>
      {props.children}
    </div>
  );
};

export const NavbarDropdown = (props: ParentProps<{ trigger: JSX.Element; class?: string }>) => {
  const [isOpen, setIsOpen] = createSignal(false);

  const dropdownStyles: JSX.CSSProperties = {
    position: "relative",
  };

  const contentStyles: JSX.CSSProperties = {
    position: "absolute",
    left: "0",
    top: "100%",
    "margin-top": "0.5rem",
    "min-width": "12rem",
    padding: "0.5rem",
    "border-radius": "var(--variant-radius, 0.5rem)",
    "background-color": "var(--color-bg)",
    border: "1px solid var(--color-surface1)",
    "box-shadow": "var(--variant-shadow-md, none)",
    "z-index": "50",
    display: isOpen() ? "block" : "none",
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
