import type { CssInJs } from "../plugin-types.ts";

export function mockupPhoneComponents(): Record<string, CssInJs> {
  return {
    ".mockup-phone": {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "var(--color-neutral)",
      borderRadius: "3rem",
      padding: "1rem",
      overflow: "hidden",
    },
    ".mockup-phone-display": {
      borderRadius: "2rem",
      backgroundColor: "var(--color-bg)",
      overflow: "hidden",
      border: "4px solid var(--color-neutral)",
    },
    ".mockup-phone-camera": {
      position: "absolute",
      top: "0.5rem",
      left: "50%",
      transform: "translateX(-50%)",
      width: "0.75rem",
      height: "0.75rem",
      borderRadius: "9999px",
      backgroundColor: "var(--color-surface2)",
    },
  };
}
