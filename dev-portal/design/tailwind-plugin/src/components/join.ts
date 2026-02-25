import type { CssInJs } from "../plugin-types.ts";

export function joinComponents(): Record<string, CssInJs> {
  return {
    ".join": {
      display: "flex",
      flexWrap: "wrap",
      gap: "0",
    },
    ".join-item": {
      display: "flex",
      alignItems: "center",
    },
    ".join > *:first-child": {
      borderTopLeftRadius: "var(--join-radius, 0.5rem)",
      borderBottomLeftRadius: "var(--join-radius, 0.5rem)",
      borderTopRightRadius: "0",
      borderBottomRightRadius: "0",
    },
    ".join > *:last-child": {
      borderTopLeftRadius: "0",
      borderBottomLeftRadius: "0",
      borderTopRightRadius: "var(--join-radius, 0.5rem)",
      borderBottomRightRadius: "var(--join-radius, 0.5rem)",
    },
    ".join > *:not(:first-child):not(:last-child)": {
      borderRadius: "0",
    },
    ".join-vertical": {
      flexDirection: "column",
      "& > *:first-child": {
        borderTopLeftRadius: "var(--join-radius, 0.5rem)",
        borderTopRightRadius: "var(--join-radius, 0.5rem)",
        borderBottomLeftRadius: "0",
        borderBottomRightRadius: "0",
      },
      "& > *:last-child": {
        borderTopLeftRadius: "0",
        borderTopRightRadius: "0",
        borderBottomLeftRadius: "var(--join-radius, 0.5rem)",
        borderBottomRightRadius: "var(--join-radius, 0.5rem)",
      },
    },
    ".join-item-focus": {
      "&:focus-within": {
        zIndex: "1",
      },
    },
  };
}
