import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { EditorView } from "@codemirror/view";

/**
 * CodeMirror editor chrome theme — backgrounds, borders, autocomplete dropdown,
 * selection, focus ring, etc. All colors come from the @op/tailwind-config CSS
 * custom properties so the editor automatically follows the app's active theme
 * (catppuccin / tokyo-night / nord, light / dark).
 */
export function createCodeMirrorTheme() {
  return EditorView.theme({
    "&": { background: "transparent" },
    ".cm-content": {
      caretColor: "var(--color-primary)",
      fontFamily: "inherit",
      minHeight: "2rem",
    },
    ".cm-scroller": { overflow: "auto" },
    ".cm-placeholder": {
      color: "var(--color-text-secondary)",
      opacity: "0.6",
    },

    /* ── Autocomplete dropdown ─────────────────────────────────────── */
    ".cm-tooltip.cm-tooltip-autocomplete": {
      backgroundColor: "var(--color-bg)",
      border: "1px solid var(--color-surface1)",
      borderRadius: "var(--variant-radius)",
      boxShadow: "var(--variant-shadow-lg, none)",
      fontSize: "0.8125rem",
      maxHeight: "15rem",
      overflow: "auto",
      zIndex: "1100",
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul": {
      listStyle: "none",
      margin: "0",
      padding: "0.25rem",
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li": {
      padding: "0.375rem 0.5rem",
      borderRadius: "var(--variant-radius-sm)",
      cursor: "pointer",
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
      backgroundColor: "color-mix(in srgb, var(--color-primary) 15%, transparent)",
      color: "var(--color-primary)",
    },

    /* ── Completion info panel ─────────────────────────────────────── */
    ".cm-tooltip.cm-completionInfo": {
      backgroundColor: "var(--color-surface0, var(--color-bg))",
      border: "1px solid var(--color-surface1)",
      borderRadius: "var(--variant-radius)",
      padding: "8px",
    },

    /* ── Completion icons ──────────────────────────────────────────── */
    ".cm-completionIcon": {
      opacity: "0.7",
      marginRight: "6px",
    },

    /* ── Selection ─────────────────────────────────────────────────── */
    "& .cm-selectionBackground": {
      backgroundColor: "color-mix(in srgb, var(--color-primary) 25%, transparent)",
    },

    /* ── Active line ───────────────────────────────────────────────── */
    ".cm-activeLine": {
      backgroundColor: "color-mix(in srgb, var(--color-primary) 5%, transparent)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "color-mix(in srgb, var(--color-primary) 8%, transparent)",
    },

    /* ── Gutter ────────────────────────────────────────────────────── */
    ".cm-gutters": {
      backgroundColor: "var(--color-surface0, var(--color-bg))",
      borderRight: "1px solid var(--color-surface1)",
    },

    /* ── Focus ─────────────────────────────────────────────────────── */
    "&.cm-focused": {
      outline: "var(--variant-focus-ring, none)",
    },
  });
}

/**
 * Syntax highlighting style that maps CodeMirror token tags to the
 * tailwind-plugin's semantic color variables.
 *
 * Because every value is a `var(--color-…)` reference, the highlighting
 * automatically updates when the app switches theme or light/dark mode.
 */
export const syntaxHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--color-primary)" },
  { tag: tags.string, color: "var(--color-green)" },
  { tag: tags.number, color: "var(--color-yellow)" },
  {
    tag: tags.comment,
    color: "var(--color-subtext0)",
    fontStyle: "italic",
  },
  {
    tag: tags.function(tags.variableName),
    color: "var(--color-blue)",
  },
  { tag: tags.variableName, color: "var(--color-text)" },
  { tag: tags.propertyName, color: "var(--color-accent)" },
  { tag: tags.typeName, color: "var(--color-teal)" },
  { tag: tags.operator, color: "var(--color-text-secondary)" },
  { tag: tags.punctuation, color: "var(--color-overlay1)" },
  { tag: tags.tagName, color: "var(--color-red)" },
  { tag: tags.attributeName, color: "var(--color-accent)" },
  { tag: tags.atom, color: "var(--color-peach, var(--color-warning))" },
  { tag: tags.bool, color: "var(--color-peach, var(--color-warning))" },
  {
    tag: tags.regexp,
    color: "var(--color-pink, var(--color-accent))",
  },
  {
    tag: tags.escape,
    color: "var(--color-pink, var(--color-accent))",
  },
  {
    tag: tags.invalid,
    color: "var(--color-error)",
    textDecoration: "wavy underline var(--color-error)",
  },
  { tag: tags.deleted, color: "var(--color-red)" },
  { tag: tags.inserted, color: "var(--color-green)" },
  { tag: tags.heading, color: "var(--color-primary)", fontWeight: "bold" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "bold" },
  { tag: tags.link, color: "var(--color-blue)", textDecoration: "underline" },
  { tag: tags.macroName, color: "var(--color-teal)" },
  {
    tag: tags.meta,
    color: "var(--color-overlay2, var(--color-text-secondary))",
  },
  { tag: tags.labelName, color: "var(--color-accent)" },
  { tag: tags.null, color: "var(--color-peach, var(--color-warning))" },
  { tag: tags.unit, color: "var(--color-yellow)" },
  { tag: tags.angleBracket, color: "var(--color-overlay1)" },
  { tag: tags.separator, color: "var(--color-overlay1)" },
]);

/** Ready-to-use CodeMirror extension for syntax highlighting. */
export const syntaxTheme = syntaxHighlighting(syntaxHighlightStyle);
