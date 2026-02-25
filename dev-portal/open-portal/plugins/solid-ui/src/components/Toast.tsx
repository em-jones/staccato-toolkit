import { type ParentProps, type JSX } from "solid-js";

export type ToastPosition =
  | "top"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "middle";

export type ToastAlignment = "start" | "center" | "end";

export type ToastProps = ParentProps<{
  class?: string;
  position?: ToastPosition;
  alignment?: ToastAlignment;
  icon?: JSX.Element;
  title?: string;
  message?: string;
  onClose?: () => void;
}>;

const toastBaseStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "flex-start",
  gap: "0.75rem",
  padding: "1rem",
  "border-radius": "var(--variant-radius, 0.5rem)",
  "background-color": "var(--color-base, var(--color-bg))",
  border: "1px solid var(--color-surface1)",
  "box-shadow": "var(--variant-shadow-md, none)",
  "font-size": "0.875rem",
  "z-index": "1000",
};

const positionStyles: Record<ToastPosition, JSX.CSSProperties> = {
  top: {
    position: "fixed",
    top: "1rem",
    left: "50%",
    transform: "translateX(-50%)",
  },
  bottom: {
    position: "fixed",
    bottom: "1rem",
    left: "50%",
    transform: "translateX(-50%)",
  },
  middle: {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  },
  "top-left": {
    position: "fixed",
    top: "1rem",
    left: "1rem",
  },
  "top-right": {
    position: "fixed",
    top: "1rem",
    right: "1rem",
  },
  "bottom-left": {
    position: "fixed",
    bottom: "1rem",
    left: "1rem",
  },
  "bottom-right": {
    position: "fixed",
    bottom: "1rem",
    right: "1rem",
  },
};

const alignmentStyles: Record<ToastAlignment, JSX.CSSProperties> = {
  start: {
    "justify-content": "flex-start",
  },
  center: {
    "justify-content": "center",
  },
  end: {
    "justify-content": "flex-end",
  },
};

const toastIconStyles: JSX.CSSProperties = {
  "flex-shrink": "0",
  width: "1.25rem",
  height: "1.25rem",
};

const toastContentStyles: JSX.CSSProperties = {
  flex: "1 1 auto",
};

const toastTitleStyles: JSX.CSSProperties = {
  "font-weight": "600",
  "margin-bottom": "0.25rem",
};

const toastMessageStyles: JSX.CSSProperties = {
  opacity: "0.8",
};

const toastCloseStyles: JSX.CSSProperties = {
  "flex-shrink": "0",
  width: "1.25rem",
  height: "1.25rem",
  cursor: "pointer",
  opacity: "0.6",
  transition: "opacity var(--variant-transition, 150ms) ease",
};

export type ToastIconProps = ParentProps<{
  class?: string;
}>;

export const ToastIcon = (props: ToastIconProps) => (
  <div style={toastIconStyles} class={`toast-icon ${props.class || ""}`.trim()}>
    {props.children}
  </div>
);

export type ToastContentProps = ParentProps<{
  class?: string;
  title?: string;
  message?: string;
}>;

export const ToastContent = (props: ToastContentProps) => (
  <div style={toastContentStyles} class={`toast-content ${props.class || ""}`.trim()}>
    {props.title && (
      <div style={toastTitleStyles} class="toast-title">
        {props.title}
      </div>
    )}
    {props.message && (
      <div style={toastMessageStyles} class="toast-message">
        {props.message}
      </div>
    )}
    {props.children}
  </div>
);

export type ToastCloseProps = ParentProps<{
  class?: string;
  onClick?: () => void;
}>;

export const ToastClose = (props: ToastCloseProps) => (
  <button
    style={toastCloseStyles}
    class={`toast-close ${props.class || ""}`.trim()}
    onClick={props.onClick}
    aria-label="Close toast"
  >
    {props.children || "×"}
  </button>
);

export const Toast = (props: ToastProps) => {
  const position = () => props.position || "bottom-right";
  const alignment = () => props.alignment || "start";

  const toastStyles = (): JSX.CSSProperties => ({
    ...toastBaseStyles,
    ...positionStyles[position()],
    ...alignmentStyles[alignment()],
  });

  const toastClass = () =>
    `toast toast-${position()} toast-${alignment()} ${props.class || ""}`.trim();

  return (
    <div style={toastStyles()} class={toastClass()} role="status" aria-live="polite">
      {props.icon && <ToastIcon>{props.icon}</ToastIcon>}
      <ToastContent title={props.title} message={props.message}>
        {props.children}
      </ToastContent>
      {props.onClose && <ToastClose onClick={props.onClose} />}
    </div>
  );
};
