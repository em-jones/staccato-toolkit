import type { CssInJs } from "../plugin-types.ts";

export function drawerComponents(): Record<string, CssInJs> {
  return {
    ".drawer": {
      display: "grid",
      gridTemplateColumns: "1fr",
      gridTemplateRows: "auto 1fr",
      minHeight: "100vh",
    },
    ".drawer-mobile": {
      "& > .drawer-toggle": {
        display: "none",
      },
    },
    ".drawer-side": {
      gridRow: "1 / -1",
      gridColumn: "1",
      position: "fixed",
      inset: "0",
      zIndex: "40",
      backgroundColor: "transparent",
      transition: "transform 300ms ease-in-out",
    },
    ".drawer-toggle": {
      display: "none",
      "&:checked ~ .drawer-side": {
        pointerEvents: "auto",
        visibility: "visible",
        transform: "translateX(0%)",
      },
      "&:checked ~ .drawer-side > *": {
        pointerEvents: "auto",
        visibility: "visible",
      },
    },
    ".drawer-side > *": {
      pointerEvents: "none",
      visibility: "hidden",
    },
    ".drawer-start": {
      "& .drawer-side": {
        transform: "translateX(-100%)",
        "& > .drawer-overlay": {
          visibility: "hidden",
        },
      },
    },
    ".drawer-end": {
      "& .drawer-side": {
        transform: "translateX(100%)",
        "& > .drawer-overlay": {
          visibility: "hidden",
        },
      },
    },
    ".drawer-side-start": {
      transform: "translateX(-100%)",
    },
    ".drawer-side-end": {
      transform: "translateX(100%)",
    },
    ".drawer-side-open": {
      transform: "translateX(0%)",
    },
    ".drawer-overlay": {
      position: "absolute",
      inset: "0",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    ".drawer-content": {
      position: "relative",
      gridColumn: "1",
      gridRow: "2",
      overflow: "auto",
    },
    ".drawer-header": {
      gridColumn: "1",
      gridRow: "1",
      display: "flex",
      alignItems: "center",
      padding: "1rem",
      borderBottom: "1px solid var(--color-surface1)",
    },
  };
}
