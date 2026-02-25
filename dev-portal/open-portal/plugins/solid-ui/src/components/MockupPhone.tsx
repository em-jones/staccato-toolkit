import { type ParentProps, type JSX } from "solid-js";

export interface MockupPhoneProps extends ParentProps {
  class?: string;
  landscape?: boolean;
}

const baseStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-direction": "column",
  "align-items": "center",
  "justify-content": "center",
  "background-color": "var(--color-neutral, #e5e7eb)",
  "border-radius": "3rem",
  padding: "1rem",
  overflow: "hidden",
};

const displayStyles: JSX.CSSProperties = {
  "border-radius": "2rem",
  "background-color": "var(--color-bg, white)",
  overflow: "hidden",
  border: "4px solid var(--color-neutral, #e5e7eb)",
};

const cameraStyles: JSX.CSSProperties = {
  position: "absolute",
  top: "0.5rem",
  left: "50%",
  transform: "translateX(-50%)",
  width: "0.75rem",
  height: "0.75rem",
  "border-radius": "9999px",
  "background-color": "var(--color-surface2, #cbd5e1)",
  "z-index": "1",
};

export const MockupPhone = (props: MockupPhoneProps) => {
  const containerStyles = (): JSX.CSSProperties => ({
    ...baseStyles,
    ...(props.landscape && {
      "flex-direction": "row",
    }),
  });

  const displayContainerStyles = (): JSX.CSSProperties => ({
    ...displayStyles,
    ...(props.landscape && {
      width: "100%",
      height: "18rem",
    }),
    ...(!props.landscape && {
      width: "100%",
      height: "32rem",
      position: "relative",
    }),
  });

  return (
    <div class={props.class} style={containerStyles()}>
      <div style={displayContainerStyles()}>
        {!props.landscape && <div style={cameraStyles()} />}
        {props.children}
      </div>
    </div>
  );
};
