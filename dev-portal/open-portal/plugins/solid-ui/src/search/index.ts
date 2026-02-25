// Search — Command Palette & CodeMirror Autocomplete
//
// A cmd+k command palette with pill-aware autocomplete powered by CodeMirror.

export type { CommandPaletteProps } from "./CommandPalette";
export { CommandPalette } from "./CommandPalette";

export type { CommandPaletteInputProps } from "./CommandPaletteInput";
export { CommandPaletteInput } from "./CommandPaletteInput";

export type { CommandPaletteResultsProps } from "./CommandPaletteResults";
export { CommandPaletteResults } from "./CommandPaletteResults";

export type { CommandPalettePreviewProps } from "./CommandPalettePreview";
export { CommandPalettePreview } from "./CommandPalettePreview";

export type { SearchPillProps } from "./SearchPill";
export { SearchPill } from "./SearchPill";

export type { SearchPill as SearchPillData, ParsedQuery, PillKeyDef } from "./types";
export { DEFAULT_PILL_KEYS, DOMAIN_LABELS, DOMAIN_ICONS } from "./types";

export { useSearchPills } from "./useSearchPills";
export { useSearchKeyboard } from "./useSearchKeyboard";

export { createCodeMirrorTheme, syntaxHighlightStyle, syntaxTheme } from "./codemirror-theme";
