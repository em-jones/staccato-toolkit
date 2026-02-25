import { type JSX, type ParentProps, Show } from "solid-js";

export type ModalPosition = "middle" | "top" | "bottom" | "start" | "end";
export type ModalSize = "lg" | "xl" | "full" | "default";

export interface ModalProps extends ParentProps<{
  open?: boolean;
  position?: ModalPosition;
  size?: ModalSize;
  onClose?: () => void;
  actions?: JSX.Element;
  class?: string;
}> {}

const baseModalStyles: JSX.CSSProperties = {
  display: "flex",
  position: "fixed",
  inset: "0",
  "z-index": "100",
  transition:
    "opacity var(--variant-transition, 200ms) ease, visibility var(--variant-transition, 200ms) ease",
};

const positionStyles: Record<ModalPosition, JSX.CSSProperties> = {
  middle: {
    "align-items": "center",
    "justify-content": "center",
  },
  top: {
    "align-items": "flex-start",
  },
  bottom: {
    "align-items": "flex-end",
  },
  start: {
    "justify-content": "flex-start",
  },
  end: {
    "justify-content": "flex-end",
  },
};

const sizeMap: Record<ModalSize, string> = {
  default: "28rem",
  lg: "48rem",
  xl: "64rem",
  full: "calc(100% - 2rem)",
};

const baseBoxStyles: JSX.CSSProperties = {
  position: "relative",
  width: "calc(100% - 2rem)",
  padding: "1.5rem",
  "border-radius": "var(--variant-radius-lg, 0.75rem)",
  "background-color": "var(--color-bg)",
  border: "1px solid var(--color-surface1)",
  "box-shadow": "var(--variant-shadow-xl, none)",
  transition:
    "transform var(--variant-transition, 200ms) ease, opacity var(--variant-transition, 200ms) ease",
};

const positionBoxStyles: Record<ModalPosition, JSX.CSSProperties> = {
  middle: {
    "transform-origin": "center",
  },
  top: {
    "transform-origin": "top",
    "margin-top": "2rem",
  },
  bottom: {
    "transform-origin": "bottom",
    "margin-bottom": "2rem",
  },
  start: {
    "transform-origin": "left",
    "margin-left": "2rem",
  },
  end: {
    "transform-origin": "right",
    "margin-right": "2rem",
  },
};

const backdropStyles: JSX.CSSProperties = {
  position: "fixed",
  inset: "0",
  "background-color": "rgba(0, 0, 0, 0.5)",
  cursor: "pointer",
  "z-index": "-1",
};

const actionStyles: JSX.CSSProperties = {
  display: "flex",
  "justify-content": "flex-end",
  gap: "0.5rem",
  "margin-top": "1.5rem",
};

export function Modal(props: ModalProps) {
  const position = () => props.position ?? "middle";
  const size = () => props.size ?? "default";
  const isOpen = () => props.open ?? false;

  const mergedModalStyles = (): JSX.CSSProperties =>
    ({
      ...baseModalStyles,
      ...positionStyles[position()],
      visibility: isOpen() ? "visible" : "hidden",
      opacity: isOpen() ? "1" : "0",
    }) as JSX.CSSProperties;

  const mergedBoxStyles = (): JSX.CSSProperties =>
    ({
      ...baseBoxStyles,
      ...positionBoxStyles[position()],
      "max-width": sizeMap[size()],
      "max-height": size() === "full" ? "calc(100vh - 4rem)" : "auto",
      transform: isOpen() ? "scale(1)" : "scale(0.95)",
      opacity: isOpen() ? "1" : "0",
    }) as JSX.CSSProperties;

  return (
    <>
      <Show when={isOpen()}>
        <div style={backdropStyles} onClick={() => props.onClose?.()} />
      </Show>
      <div style={mergedModalStyles()} class={props.class}>
        <div style={mergedBoxStyles()}>
          {props.children}
          <Show when={props.actions}>
            <div style={actionStyles}>{props.actions}</div>
          </Show>
        </div>
      </div>
    </>
  );
}
