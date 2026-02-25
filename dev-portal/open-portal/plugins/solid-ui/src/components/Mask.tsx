import { type JSX, type ParentProps } from "solid-js";

export type MaskShape =
  | "squircle"
  | "decagon"
  | "diamond"
  | "heart"
  | "hexagon"
  | "circle"
  | "square"
  | "pentagon"
  | "triangle"
  | "octagon"
  | "parallelogram";

export interface MaskProps extends ParentProps {
  shape?: MaskShape;
  className?: string;
  style?: JSX.CSSProperties;
}

const baseStyles: JSX.CSSProperties = {
  display: "block",
  width: "100%",
  height: "100%",
  "object-fit": "cover",
};

const shapeStyles: Record<MaskShape, JSX.CSSProperties> = {
  squircle: {
    "clip-path": "polygon(100% 0%, 100% 100%, 0% 100%, 0% 50%, 0% 0%)",
  },
  decagon: {
    "clip-path": "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
  },
  diamond: {
    "clip-path": "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
  },
  heart: {
    "clip-path": "polygon(50% 0%, 100% 35%, 82% 100%, 50% 75%, 18% 100%, 0% 35%)",
  },
  hexagon: {
    "clip-path": "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
  },
  circle: {
    "clip-path": "circle(closest-side)",
  },
  square: {
    "clip-path": "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
  },
  pentagon: {
    "clip-path": "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
  },
  triangle: {
    "clip-path": "polygon(50% 0%, 0% 100%, 100% 100%)",
  },
  octagon: {
    "clip-path": "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
  },
  parallelogram: {
    "clip-path": "polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)",
  },
};

export const Mask = (props: MaskProps) => {
  const shape = () => props.shape || "square";

  const styles: JSX.CSSProperties = {
    ...baseStyles,
    ...shapeStyles[shape()],
    ...props.style,
  };

  return (
    <div style={styles} class={props.className}>
      {props.children}
    </div>
  );
};
