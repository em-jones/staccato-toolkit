import { type JSX, type ParentProps, For, createSignal } from "solid-js";

type ColorVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "info"
  | "success"
  | "warning"
  | "error"
  | undefined;
type Size = "xs" | "sm" | "md" | "lg";
type Variant = "solid" | "outline" | "ghost";

export interface SpeedDialItemProps {
  label?: string;
  icon: JSX.Element;
  onClick?: () => void;
  class?: string;
}

export interface FabProps extends ParentProps {
  color?: ColorVariant;
  size?: Size;
  variant?: Variant;
  square?: boolean;
  disabled?: boolean;
  class?: string;
  onClick?: () => void;
}

export interface SpeedDialProps {
  trigger: FabProps;
  items: SpeedDialItemProps[];
  direction?: "up" | "down" | "left" | "right";
  class?: string;
}

const baseStyles: JSX.CSSProperties = {
  display: "inline-flex",
  "align-items": "center",
  "justify-content": "center",
  width: "3.5rem",
  height: "3.5rem",
  "border-radius": "var(--variant-radius-badge, 9999px)",
  "background-color": "var(--color-primary)",
  color: "white",
  "box-shadow": "var(--variant-shadow-md, none)",
  cursor: "pointer",
  transition:
    "transform var(--variant-transition, 150ms) ease, box-shadow var(--variant-transition, 150ms) ease",
  border: "none",
  padding: "0",
  "&:hover": {
    transform: "var(--variant-active-transform, scale(1.05))",
    "box-shadow": "var(--variant-shadow-lg, none)",
  },
  "&:active": {
    transform: "var(--variant-active-transform, scale(0.95))",
  },
};

const sizeStyles: Record<Size, JSX.CSSProperties> = {
  xs: {
    width: "2rem",
    height: "2rem",
  },
  sm: {
    width: "2.75rem",
    height: "2.75rem",
  },
  md: {
    width: "3.5rem",
    height: "3.5rem",
  },
  lg: {
    width: "4.5rem",
    height: "4.5rem",
  },
};

const colorMap: Record<ColorVariant, string> = {
  primary: "var(--color-primary)",
  secondary: "var(--color-secondary)",
  accent: "var(--color-accent)",
  info: "var(--color-info)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  error: "var(--color-error)",
  undefined: "var(--color-primary)",
};

function getColorStyles(color: ColorVariant, variant: Variant): JSX.CSSProperties {
  if (variant === "outline") {
    const colorValue = colorMap[color];
    return {
      "background-color": "transparent",
      border: `2px solid ${colorValue}`,
      color: colorValue,
      "&:hover": {
        "background-color": colorValue,
        color: "white",
      },
    };
  }

  if (variant === "ghost") {
    const colorValue = colorMap[color];
    return {
      "background-color": "transparent",
      "box-shadow": "none",
      color: colorValue,
      "&:hover": {
        "background-color": `color-mix(in srgb, ${colorValue} 10%, transparent)`,
      },
    };
  }

  // solid variant
  return {
    "background-color": colorMap[color],
  };
}

export const Fab = (props: FabProps) => {
  const color = () => props.color ?? "primary";
  const size = () => props.size ?? "md";
  const variant = () => props.variant ?? "solid";

  const squareStyles = (): JSX.CSSProperties => {
    if (props.square) {
      return {
        "border-radius": "var(--variant-radius, 0.5rem)",
      };
    }
    return {};
  };

  const disabledStyles = (): JSX.CSSProperties => {
    if (props.disabled) {
      return {
        opacity: "0.5",
        cursor: "not-allowed",
        "pointer-events": "none",
      };
    }
    return {};
  };

  const mergedStyles = (): JSX.CSSProperties => {
    const colorStyles = getColorStyles(color(), variant());
    const sizeStyle = sizeStyles[size()];
    const square = squareStyles();
    const disabled = disabledStyles();

    return {
      ...baseStyles,
      ...sizeStyle,
      ...colorStyles,
      ...square,
      ...disabled,
    } as JSX.CSSProperties;
  };

  return (
    <button
      style={mergedStyles()}
      onClick={props.onClick}
      disabled={props.disabled}
      class={props.class}
    >
      {props.children}
    </button>
  );
};

const speedDialBaseStyles: JSX.CSSProperties = {
  position: "relative",
  display: "inline-flex",
  "flex-direction": "column",
  "align-items": "center",
};

const speedDialContentBaseStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-direction": "column",
  gap: "0.5rem",
  position: "absolute",
  bottom: "100%",
  left: "50%",
  transform: "translateX(-50%)",
  "padding-bottom": "0.5rem",
  opacity: "0",
  visibility: "hidden",
  transition:
    "opacity var(--variant-transition, 200ms) ease, visibility var(--variant-transition, 200ms) ease, transform var(--variant-transition, 200ms) ease",
};

const speedDialContentOpenStyles: JSX.CSSProperties = {
  opacity: "1",
  visibility: "visible",
};

const directionStyles: Record<string, JSX.CSSProperties> = {
  up: {
    "flex-direction": "column-reverse",
  },
  down: {
    "flex-direction": "column",
    "& .speed-dial-content": {
      top: "100%",
      bottom: "auto",
      "padding-top": "0.5rem",
      "padding-bottom": "0",
    },
  },
  left: {
    "flex-direction": "row",
    "& .speed-dial-content": {
      right: "100%",
      left: "auto",
      top: "50%",
      transform: "translateY(-50%)",
      "padding-right": "0.5rem",
      "padding-left": "0",
      bottom: "auto",
      "flex-direction": "column",
    },
  },
  right: {
    "flex-direction": "row-reverse",
    "& .speed-dial-content": {
      left: "100%",
      top: "50%",
      transform: "translateY(-50%)",
      "padding-left": "0.5rem",
      "padding-right": "0",
      bottom: "auto",
      "flex-direction": "column",
    },
  },
};

const speedDialItemStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  gap: "0.5rem",
  "font-size": "0.875rem",
  color: "var(--color-text-secondary)",
  "white-space": "nowrap",
};

export const SpeedDial = (props: SpeedDialProps) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const direction = () => props.direction ?? "up";

  const containerStyles = (): JSX.CSSProperties => {
    return {
      ...speedDialBaseStyles,
      ...directionStyles[direction()],
    };
  };

  const contentStyles = (): JSX.CSSProperties => {
    let styles: JSX.CSSProperties = { ...speedDialContentBaseStyles };
    if (isOpen()) {
      styles = { ...styles, ...speedDialContentOpenStyles };
    }
    return styles;
  };

  return (
    <div style={containerStyles()} class={props.class}>
      <Fab {...props.trigger} onClick={() => setIsOpen(!isOpen())} />
      <div style={contentStyles()} class="speed-dial-content">
        <For each={props.items}>
          {(item) => (
            <div style={speedDialItemStyles}>
              <button
                style={{
                  display: "inline-flex",
                  "align-items": "center",
                  "justify-content": "center",
                  width: "2.75rem",
                  height: "2.75rem",
                  "border-radius": "9999px",
                  "background-color": "var(--color-secondary)",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  transition: "transform 150ms ease",
                  "&:hover": {
                    transform: "scale(1.05)",
                  },
                }}
                onClick={() => {
                  item.onClick?.();
                  setIsOpen(false);
                }}
                class={item.class}
              >
                {item.icon}
              </button>
              {item.label && <span>{item.label}</span>}
            </div>
          )}
        </For>
      </div>
    </div>
  );
};
