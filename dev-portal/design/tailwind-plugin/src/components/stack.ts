import type { CssInJs } from "../plugin-types.ts";

export function stackComponents(): Record<string, CssInJs> {
  return {
    ".stack": {
      display: "flex",
      flexDirection: "column",
      gap: "1rem",
    },
    ".stack-horizontal": {
      flexDirection: "row",
    },
    ".stack-reverse": {
      flexDirection: "column-reverse",
    },
    ".stack-horizontal-reverse": {
      flexDirection: "row-reverse",
    },
    ".stack-gap-0": {
      gap: "0",
    },
    ".stack-gap-1": {
      gap: "0.25rem",
    },
    ".stack-gap-2": {
      gap: "0.5rem",
    },
    ".stack-gap-3": {
      gap: "0.75rem",
    },
    ".stack-gap-4": {
      gap: "1rem",
    },
    ".stack-gap-6": {
      gap: "1.5rem",
    },
    ".stack-gap-8": {
      gap: "2rem",
    },
    ".stack-items-start": {
      alignItems: "flex-start",
    },
    ".stack-items-end": {
      alignItems: "flex-end",
    },
    ".stack-items-center": {
      alignItems: "center",
    },
    ".stack-items-stretch": {
      alignItems: "stretch",
    },
    ".stack-justify-start": {
      justifyContent: "flex-start",
    },
    ".stack-justify-end": {
      justifyContent: "flex-end",
    },
    ".stack-justify-center": {
      justifyContent: "center",
    },
    ".stack-justify-between": {
      justifyContent: "space-between",
    },
  };
}
