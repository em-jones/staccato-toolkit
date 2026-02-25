import { type ParentProps, type JSX, createSignal } from "solid-js";

export type TooltipPosition = "top" | "bottom" | "left" | "right";
export type TooltipColor =
  | "primary"
  | "secondary"
  | "accent"
  | "info"
  | "success"
  | "warning"
  | "error";

export type TooltipProps = ParentProps<{
  class?: string;
  content: string;
  position?: TooltipPosition;
  color?: TooltipColor;
  open?: boolean;
}>;

const tooltipStyles: JSX.CSSProperties = {
  position: "relative",
  display: "inline-block",
};

const tooltipContentBaseStyles: JSX.CSSProperties = {
  position: "absolute",
  "z-index": "50",
  padding: "0.5rem 0.75rem",
  "font-size": "0.75rem",
  "font-weight": "500",
  "border-radius": "var(--variant-radius-sm, 0.375rem)",
  "background-color": "var(--color-neutral)",
  color: "var(--color-bg)",
  "white-space": "nowrap",
  opacity: "0",
  visibility: "hidden",
  transition:
    "opacity var(--variant-transition, 150ms) ease, visibility var(--variant-transition, 150ms) ease",
  "pointer-events": "none",
};

const positionStyles: Record<TooltipPosition, JSX.CSSProperties> = {
  top: {
    bottom: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    "margin-bottom": "0.5rem",
  },
  bottom: {
    top: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    "margin-top": "0.5rem",
  },
  left: {
    right: "100%",
    top: "50%",
    transform: "translateY(-50%)",
    "margin-right": "0.5rem",
  },
  right: {
    left: "100%",
    top: "50%",
    transform: "translateY(-50%)",
    "margin-left": "0.5rem",
  },
};

const colorStyles: Record<TooltipColor, string> = {
  primary: "var(--color-primary)",
  secondary: "var(--color-secondary)",
  accent: "var(--color-accent)",
  info: "var(--color-info)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  error: "var(--color-error)",
};

export type TooltipContentProps = ParentProps<{
  class?: string;
  visible?: boolean;
  position?: TooltipPosition;
  color?: TooltipColor;
}>;

export const TooltipContent = (props: TooltipContentProps) => {
  const contentStyles = (): JSX.CSSProperties => ({
    ...tooltipContentBaseStyles,
    ...(props.position && positionStyles[props.position]),
    ...(props.color && {
      "background-color": colorStyles[props.color],
    }),
    ...(props.visible && {
      opacity: "1",
      visibility: "visible",
    }),
  });

  return (
    <div style={contentStyles()} class={props.class} role="tooltip">
      {props.children}
    </div>
  );
};

export const Tooltip = (props: TooltipProps) => {
  const [isOpen, setIsOpen] = createSignal(props.open || false);

  const position = () => props.position || "bottom";
  const color = () => props.color || "primary";
  const containerClass = () => `tooltip tooltip-${position()} ${props.class || ""}`.trim();

  return (
    <div
      style={tooltipStyles}
      class={containerClass()}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
    >
      {props.children}
      <TooltipContent
        visible={isOpen()}
        position={position()}
        color={color()}
        class="tooltip-content"
      >
        {props.content}
      </TooltipContent>
    </div>
  );
};
