import type { CssInJs } from "../plugin-types.ts";

export function swapComponents(): Record<string, CssInJs> {
  return {
    ".swap": {
      position: "relative",
      display: "inline-grid",
      alignContent: "center",
      placeContent: "center",
      cursor: "pointer",
      userSelect: "none",
      "& > *": {
        gridColumnStart: "1",
        gridRowStart: "1",
      },
    },
    ".swap-on": {
      opacity: "0",
      transition:
        "opacity 200ms cubic-bezier(0, 0, 0.2, 1), transform 200ms cubic-bezier(0, 0, 0.2, 1)",
    },
    ".swap-off": {
      opacity: "1",
      transition:
        "opacity 200ms cubic-bezier(0, 0, 0.2, 1), transform 200ms cubic-bezier(0, 0, 0.2, 1)",
    },
    ".swap-indeterminate": {
      "& .swap-on": {
        opacity: "0.5",
      },
    },
    ".swap-active": {
      "& .swap-on": {
        opacity: "1",
      },
      "& .swap-off": {
        opacity: "0",
      },
    },
    ".swap-rotate": {
      "& .swap-on": {
        transform: "rotate(45deg)",
      },
      "& .swap-off": {
        transform: "rotate(0deg)",
      },
      "&:has(.swap-on)": {
        "& .swap-on": {
          transform: "rotate(0deg)",
        },
        "& .swap-off": {
          transform: "rotate(-45deg)",
        },
      },
    },
    ".swap-flip": {
      perspective: "20rem",
      transformStyle: "preserve-3d",
      "& .swap-on": {
        transform: "rotateY(180deg)",
        backfaceVisibility: "hidden",
      },
      "& .swap-off": {
        transform: "rotateY(0deg)",
      },
      "&:has(.swap-on)": {
        "& .swap-on": {
          transform: "rotateY(0deg)",
          opacity: "1",
        },
        "& .swap-off": {
          transform: "rotateY(-180deg)",
          backfaceVisibility: "hidden",
          opacity: "1",
        },
      },
    },
  };
}
