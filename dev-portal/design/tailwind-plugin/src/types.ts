export interface ThemeColors {
  name: string;
  light: Record<string, string>;
  dark: Record<string, string>;
}

export interface ThemeVariant {
  name: string;
  /** Base border-radius. Use "0px" for classic/TUI look. */
  borderRadius: string;
  /** Shadow intensity. Use "none" to disable all shadows. */
  shadowSize: string;
  /** Base spacing unit. */
  spacing: string;
  /** Transition duration. Use "0ms" to disable all animations. */
  transitionDuration: string;
  /** Text scale multiplier. Use "1" for normal size. */
  textScale?: string;
}

/** Semantic color keys that components rely on. */
export const semanticColors = [
  "bg",
  "text",
  "primary",
  "primary-content",
  "secondary",
  "secondary-content",
  "accent",
  "accent-content",
  "warning",
  "warning-content",
  "error",
  "error-content",
  "green",
  "green-content",
  "red",
  "blue",
  "yellow",
  "teal",
] as const;

export type SemanticColor = (typeof semanticColors)[number];
