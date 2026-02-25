import type { CssInJs } from "../plugin-types.ts";

export function timelineComponents(): Record<string, CssInJs> {
  return {
    ".timeline": {
      display: "flex",
      flexDirection: "column",
    },
    ".timeline-item": {
      display: "flex",
      gap: "1rem",
    },
    ".timeline-item-start": {
      flexDirection: "row",
    },
    ".timeline-item-end": {
      flexDirection: "row-reverse",
    },
    ".timeline-item-vertical": {
      flexDirection: "column",
    },
    ".timeline-item-horizontal": {
      flexDirection: "row",
    },
    ".timeline-start": {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      minWidth: "4rem",
      textAlign: "right",
    },
    ".timeline-end": {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      minWidth: "4rem",
      textAlign: "left",
    },
    ".timeline-middle": {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    },
    ".timeline-dot": {
      width: "1rem",
      height: "1rem",
      borderRadius: "9999px",
      backgroundColor: "var(--color-primary)",
      flexShrink: "0",
    },
    ".timeline-ring": {
      width: "2rem",
      height: "2rem",
      borderRadius: "9999px",
      backgroundColor: "color-mix(in srgb, var(--color-primary) 20%, transparent)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    ".timeline-line": {
      flex: "1",
      width: "2px",
      backgroundColor: "var(--color-surface1)",
    },
    ".timeline-box": {
      padding: "1rem",
      borderRadius: "0.5rem",
      backgroundColor: "var(--color-bg)",
      border: "1px solid var(--color-surface1)",
    },
    ".timeline-title": {
      fontWeight: "600",
      color: "var(--color-text)",
    },
    ".timeline-date": {
      fontSize: "0.75rem",
      color: "var(--color-text-secondary)",
    },
    ".timeline-text": {
      fontSize: "0.875rem",
      color: "var(--color-text-secondary)",
    },
  };
}
