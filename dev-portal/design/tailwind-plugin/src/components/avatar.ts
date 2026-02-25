import type { CssInJs } from "../plugin-types.ts";

export function avatarComponents(): Record<string, CssInJs> {
  return {
    ".avatar": {
      position: "relative",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderRadius: "9999px",
      backgroundColor: "var(--color-surface1)",
      color: "var(--color-text)",
      fontSize: "0.875rem",
      fontWeight: "500",
      verticalAlign: "middle",
    },
    ".avatar img": {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    },
    ".avatar-xs": {
      width: "1.5rem",
      height: "1.5rem",
      fontSize: "0.625rem",
    },
    ".avatar-sm": {
      width: "2rem",
      height: "2rem",
      fontSize: "0.75rem",
    },
    ".avatar-md": {
      width: "2.5rem",
      height: "2.5rem",
      fontSize: "0.875rem",
    },
    ".avatar-lg": {
      width: "3rem",
      height: "3rem",
      fontSize: "1rem",
    },
    ".avatar-xl": {
      width: "4rem",
      height: "4rem",
      fontSize: "1.25rem",
    },
    ".avatar-2xl": {
      width: "5rem",
      height: "5rem",
      fontSize: "1.5rem",
    },
    ".avatar-placeholder": {
      backgroundColor: "var(--color-surface1)",
    },
    ".avatar-group": {
      display: "flex",
      "& .avatar": {
        border: "2px solid var(--color-bg)",
        marginLeft: "-0.5rem",
        "&:first-child": {
          marginLeft: "0",
        },
      },
    },
    ".avatar-online": {
      "&::after": {
        content: '""',
        position: "absolute",
        bottom: "0",
        right: "0",
        width: "0.625rem",
        height: "0.625rem",
        borderRadius: "9999px",
        backgroundColor: "var(--color-success)",
        border: "2px solid var(--color-bg)",
      },
    },
    ".avatar-offline": {
      "&::after": {
        content: '""',
        position: "absolute",
        bottom: "0",
        right: "0",
        width: "0.625rem",
        height: "0.625rem",
        borderRadius: "9999px",
        backgroundColor: "var(--color-surface2)",
        border: "2px solid var(--color-bg)",
      },
    },
    ".avatar-busy": {
      "&::after": {
        content: '""',
        position: "absolute",
        bottom: "0",
        right: "0",
        width: "0.625rem",
        height: "0.625rem",
        borderRadius: "9999px",
        backgroundColor: "var(--color-error)",
        border: "2px solid var(--color-bg)",
      },
    },
    ".avatar-away": {
      "&::after": {
        content: '""',
        position: "absolute",
        bottom: "0",
        right: "0",
        width: "0.625rem",
        height: "0.625rem",
        borderRadius: "9999px",
        backgroundColor: "var(--color-warning)",
        border: "2px solid var(--color-bg)",
      },
    },
    ".avatar-rounded": {
      borderRadius: "0.75rem",
    },
  };
}
