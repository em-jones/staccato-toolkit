import { type JSX, type ParentProps } from "solid-js";

export type JoinDirection = "horizontal" | "vertical";

export interface JoinItemProps extends ParentProps {
  className?: string;
  style?: JSX.CSSProperties;
}

export interface JoinProps extends ParentProps {
  direction?: JoinDirection;
  radius?: string;
  className?: string;
  style?: JSX.CSSProperties;
}

const baseStyles: JSX.CSSProperties = {
  display: "flex",
  "flex-wrap": "wrap",
  gap: "0",
};

const verticalStyles: JSX.CSSProperties = {
  "flex-direction": "column",
};

const itemStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
};

export const JoinItem = (props: JoinItemProps) => {
  return (
    <div style={itemStyles} class={props.className}>
      {props.children}
    </div>
  );
};

export const Join = (props: JoinProps) => {
  const direction = () => props.direction || "horizontal";
  const radius = () => props.radius || "0.5rem";

  const styles: JSX.CSSProperties = {
    ...baseStyles,
    ...(direction() === "vertical" ? verticalStyles : {}),
    "--join-radius": radius(),
    ...props.style,
  } as JSX.CSSProperties;

  return (
    <div style={styles} class={props.className}>
      {props.children}
    </div>
  );
};
