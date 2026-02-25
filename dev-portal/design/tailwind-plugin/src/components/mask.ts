import type { CssInJs } from "../plugin-types.ts";

export function maskComponents(): Record<string, CssInJs> {
  return {
    ".mask": {
      display: "block",
      width: "100%",
      height: "100%",
      objectFit: "cover",
    },
    ".mask-squircle": {
      clipPath: "polygon(100% 0%, 100% 100%, 0% 100%, 0% 50%, 0% 0%)",
    },
    ".mask-decagon": {
      clipPath: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
    },
    ".mask-diamond": {
      clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
    },
    ".mask-heart": {
      clipPath: "polygon(50% 0%, 100% 35%, 82% 100%, 50% 75%, 18% 100%, 0% 35%)",
    },
    ".mask-hexagon": {
      clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
    },
    ".mask-infcircle": {
      clipPath: "circle(closest-side)",
    },
    ".mask-octagon": {
      clipPath: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
    },
    ".mask-parallelogram": {
      clipPath: "polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)",
    },
    ".mask-pentagon": {
      clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
    },
    ".mask semicircle-bottom": {
      clipPath: "ellipse(50% 50% at 50% 100%)",
    },
    ".mask semicircle-left": {
      clipPath: "ellipse(50% 50% at 0% 50%)",
    },
    ".mask semicircle-right": {
      clipPath: "ellipse(50% 50% at 100% 50%)",
    },
    ".mask semicircle-top": {
      clipPath: "ellipse(50% 50% at 50% 0%)",
    },
    ".mask-triangle": {
      clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
    },
    ".mask-triangle-1": {
      clipPath: "polygon(0% 100%, 100% 100%, 50% 0%)",
    },
    ".mask-triangle-2": {
      clipPath: "polygon(0% 0%, 100% 0%, 50% 100%)",
    },
    ".mask-triangle-3": {
      clipPath: "polygon(0% 0%, 100% 0%, 100% 100%)",
    },
    ".mask-triangle-4": {
      clipPath: "polygon(0% 0%, 0% 100%, 100% 100%)",
    },
  };
}
