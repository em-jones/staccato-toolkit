import { type JSX, type ParentProps, Show, createSignal } from "solid-js";

type Position = "bottom" | "top" | "left" | "right" | "center" | "top-center" | "bottom-center";

export interface DropdownItemProps extends ParentProps {
  onClick?: () => void;
  class?: string;
}

export interface DropdownContentProps extends ParentProps {
  class?: string;
}

export interface DropdownProps extends ParentProps {
  trigger: JSX.Element;
  position?: Position;
  end?: boolean;
  hover?: boolean;
  class?: string;
}

const baseStyles: JSX.CSSProperties = {
  position: "relative",
  display: "inline-flex",
};

const contentBaseStyles: JSX.CSSProperties = {
  position: "absolute",
  "z-index": "50",
  display: "none",
  "min-width": "12rem",
  padding: "0.5rem",
  "margin-top": "0.5rem",
  "border-radius": "var(--variant-radius, 0.5rem)",
  "background-color": "var(--color-bg)",
  border: "1px solid var(--color-surface1)",
  "box-shadow": "var(--variant-shadow-md, none)",
};

const contentOpenStyles: JSX.CSSProperties = {
  display: "block",
};

const positionStyles: Record<Position, JSX.CSSProperties> = {
  bottom: {
    top: "100%",
    "margin-top": "0.5rem",
    "transform-origin": "top",
  },
  top: {
    bottom: "100%",
    "margin-top": "0",
    "margin-bottom": "0.5rem",
    "transform-origin": "bottom",
  },
  left: {
    right: "100%",
    top: "0",
    "margin-right": "0.5rem",
  },
  right: {
    left: "100%",
    top: "0",
    "margin-left": "0.5rem",
  },
  center: {
    left: "50%",
    transform: "translateX(-50%)",
  },
  "top-center": {
    bottom: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    "margin-bottom": "0.5rem",
  },
  "bottom-center": {
    top: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    "margin-top": "0.5rem",
  },
};

const itemStyles: JSX.CSSProperties = {
  padding: "0.5rem 0.75rem",
  "font-size": "0.875rem",
  color: "var(--color-text)",
  "background-color": "transparent",
  border: "none",
  cursor: "pointer",
  "white-space": "nowrap",
  "text-align": "left",
  width: "100%",
  transition: "background-color 150ms ease",
  "&:hover": {
    "background-color": "var(--color-surface1)",
  },
};

export const DropdownItem = (props: DropdownItemProps) => {
  return (
    <button style={itemStyles} onClick={props.onClick} class={props.class}>
      {props.children}
    </button>
  );
};

export const DropdownContent = (props: DropdownContentProps) => {
  return <div class={props.class}>{props.children}</div>;
};

export const Dropdown = (props: DropdownProps) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const position = () => props.position ?? "bottom";
  const end = () => props.end ?? false;

  const toggleDropdown = () => {
    setIsOpen(!isOpen());
  };

  const contentStyles = (): JSX.CSSProperties => {
    let styles: JSX.CSSProperties = { ...contentBaseStyles };
    styles = { ...styles, ...positionStyles[position()] };

    if (isOpen()) {
      styles = { ...styles, ...contentOpenStyles };
    }

    if (end()) {
      styles["right"] = "0";
    }

    return styles;
  };

  const containerStyles = (): JSX.CSSProperties => {
    let styles: JSX.CSSProperties = { ...baseStyles };
    if (end()) {
      styles["justify-content"] = "flex-end";
    }
    return styles;
  };

  const hoverClass = props.hover ? "group hover:dropdown-open" : "";

  return (
    <div style={containerStyles()} class={`${props.class} ${hoverClass}`}>
      <div onClick={toggleDropdown}>{props.trigger}</div>
      <div style={contentStyles()} class={hoverClass ? "group-hover:block hidden" : ""}>
        {props.children}
      </div>
    </div>
  );
};
