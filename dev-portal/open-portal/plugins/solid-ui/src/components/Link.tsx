import { type JSX, type ParentProps, createSignal } from "solid-js";

type ColorVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "info"
  | "success"
  | "warning"
  | "error"
  | "neutral";

export interface LinkProps extends ParentProps {
  color?: ColorVariant;
  variant?: "default" | "hover" | "ghost" | "active";
  class?: string;
  href?: string;
  onClick?: () => void;
}

const colorMap: Record<ColorVariant, string> = {
  primary: "var(--color-primary)",
  secondary: "var(--color-secondary)",
  accent: "var(--color-accent)",
  info: "var(--color-info)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  error: "var(--color-error)",
  neutral: "var(--color-text)",
};

const baseLinkStyles: JSX.CSSProperties = {
  color: "var(--color-primary)",
  "text-decoration": "none",
  cursor: "pointer",
  transition: "opacity 150ms ease",
};

const variantStyles: Record<string, JSX.CSSProperties> = {
  default: {},
  hover: {
    "&:hover": {
      "text-decoration": "underline",
    },
  },
  ghost: {},
  active: {
    "font-weight": "600",
  },
};

export const Link = (props: LinkProps) => {
  const [isHovered, setIsHovered] = createSignal(false);
  const color = () => props.color ?? "primary";
  const variant = () => props.variant ?? "default";

  const mergedStyles = (): JSX.CSSProperties => {
    const baseStyles = { ...baseLinkStyles };
    baseStyles["color"] = colorMap[color()];

    if (isHovered()) {
      baseStyles["opacity"] = "0.8";
      if (variant() === "hover") {
        baseStyles["text-decoration"] = "underline";
      } else if (variant() === "ghost") {
        baseStyles["background-color"] = "color-mix(in srgb, var(--color-text) 10%, transparent)";
      }
    }

    if (variant() === "active") {
      baseStyles["font-weight"] = "600";
    }

    return baseStyles as JSX.CSSProperties;
  };

  const focusStyles: JSX.CSSProperties = {
    outline: "2px solid var(--color-primary)",
    "outline-offset": "2px",
    "border-radius": "2px",
  };

  const sharedProps = {
    class: props.class,
    style: mergedStyles(),
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  };

  if (props.href) {
    return (
      <a {...sharedProps} href={props.href}>
        {props.children}
      </a>
    );
  }

  return (
    <button
      {...sharedProps}
      onClick={props.onClick}
      style={{ ...mergedStyles(), ...focusStyles, background: "none", border: "none" }}
    >
      {props.children}
    </button>
  );
};

export const LinkHover = (props: LinkProps) => {
  return <Link {...props} variant={props.variant ?? "hover"} />;
};

export const LinkPrimary = (props: Omit<LinkProps, "color">) => {
  return <Link {...props} color="primary" />;
};

export const LinkSecondary = (props: Omit<LinkProps, "color">) => {
  return <Link {...props} color="secondary" />;
};

export const LinkAccent = (props: Omit<LinkProps, "color">) => {
  return <Link {...props} color="accent" />;
};

export const LinkError = (props: Omit<LinkProps, "color">) => {
  return <Link {...props} color="error" />;
};

export const LinkSuccess = (props: Omit<LinkProps, "color">) => {
  return <Link {...props} color="success" />;
};

export const LinkWarning = (props: Omit<LinkProps, "color">) => {
  return <Link {...props} color="warning" />;
};
