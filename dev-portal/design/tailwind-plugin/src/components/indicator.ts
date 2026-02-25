import type { CssInJs } from "../plugin-types.ts";

export function indicatorComponents(): Record<string, CssInJs> {
  return {
    ".indicator": {
      position: "relative",
      display: "inline-flex",
      width: "fit-content",
    },
    ".indicator-item": {
      position: "absolute",
      zIndex: "10",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "0.25rem 0.5rem",
      fontSize: "0.75rem",
      fontWeight: "600",
      borderRadius: "9999px",
      backgroundColor: "var(--color-primary)",
      color: "white",
      whiteSpace: "nowrap",
    },

    // ─── Top row ───────────────────────────────────────────────────────────────
    ".indicator-item.indicator-top.indicator-start": {
      top: "0",
      left: "0",
      transform: "translate(-50%, -50%)",
    },
    ".indicator-item.indicator-top.indicator-center": {
      top: "0",
      left: "50%",
      transform: "translate(-50%, -50%)",
    },
    ".indicator-item.indicator-top.indicator-end": {
      top: "0",
      right: "0",
      transform: "translate(50%, -50%)",
    },

    // ─── Middle row ────────────────────────────────────────────────────────────
    ".indicator-item.indicator-middle.indicator-start": {
      top: "50%",
      left: "0",
      transform: "translate(-50%, -50%)",
    },
    ".indicator-item.indicator-middle.indicator-center": {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    },
    ".indicator-item.indicator-middle.indicator-end": {
      top: "50%",
      right: "0",
      transform: "translate(50%, -50%)",
    },

    // ─── Bottom row ────────────────────────────────────────────────────────────
    ".indicator-item.indicator-bottom.indicator-start": {
      bottom: "0",
      left: "0",
      transform: "translate(-50%, 50%)",
    },
    ".indicator-item.indicator-bottom.indicator-center": {
      bottom: "0",
      left: "50%",
      transform: "translate(-50%, 50%)",
    },
    ".indicator-item.indicator-bottom.indicator-end": {
      bottom: "0",
      right: "0",
      transform: "translate(50%, 50%)",
    },

    // ─── Dot variant ───────────────────────────────────────────────────────────
    ".indicator-dot": {
      width: "0.5rem",
      height: "0.5rem",
      padding: "0",
      borderRadius: "9999px",
    },
  };
}
