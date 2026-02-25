import createPlugin from "tailwindcss/plugin";
import { alertComponents } from "./components/alert.ts";
import { avatarComponents } from "./components/avatar.ts";
import { badgeComponents } from "./components/badge.ts";
import { breadcrumbsComponents } from "./components/breadcrumbs.ts";
import { buttonComponents } from "./components/button.ts";
import { cardComponents } from "./components/card.ts";
import { carouselComponents } from "./components/carousel.ts";
import { chatComponents } from "./components/chat.ts";
import { collapseComponents } from "./components/collapse.ts";
import { countdownComponents } from "./components/countdown.ts";
import { dividerComponents } from "./components/divider.ts";
import { dockComponents } from "./components/dock.ts";
import { drawerComponents } from "./components/drawer.ts";
import { dropdownComponents } from "./components/dropdown.ts";
import { fabComponents, speedDialComponents } from "./components/fab.ts";
import { fileInputComponents } from "./components/file-input.ts";
import { footerComponents } from "./components/footer.ts";
import { heroComponents } from "./components/hero.ts";
import { indicatorComponents } from "./components/indicator.ts";
import { inputComponents } from "./components/input.ts";
import { joinComponents } from "./components/join.ts";
import { kbdComponents } from "./components/kbd.ts";
import { linkComponents } from "./components/link.ts";
import { listComponents } from "./components/list.ts";
import { loadingComponents } from "./components/loading.ts";
import { maskComponents } from "./components/mask.ts";
import { menuComponents } from "./components/menu.ts";
import { mockupBrowserComponents } from "./components/mockup-browser.ts";
import { mockupCodeComponents } from "./components/mockup-code.ts";
import { mockupPhoneComponents } from "./components/mockup-phone.ts";
import { mockupWindowComponents } from "./components/mockup-window.ts";
import { modalComponents } from "./components/modal.ts";
import { navbarComponents } from "./components/navbar.ts";
import { paginationComponents } from "./components/pagination.ts";
import { progressComponents } from "./components/progress.ts";
import { radialProgressComponents } from "./components/radial-progress.ts";
import { radioComponents } from "./components/radio.ts";
import { rangeComponents } from "./components/range.ts";
import { ratingComponents } from "./components/rating.ts";
import { skeletonComponents } from "./components/skeleton.ts";
import { stackComponents } from "./components/stack.ts";
import { statComponents } from "./components/stat.ts";
import { stepsComponents } from "./components/steps.ts";
import { swapComponents } from "./components/swap.ts";
import { tableComponents } from "./components/table.ts";
import { tabsComponents } from "./components/tabs.ts";
import { timelineComponents } from "./components/timeline.ts";
import { toastComponents } from "./components/toast.ts";
import { tooltipComponents } from "./components/tooltip.ts";
import type { PluginConfig } from "./plugin-types.ts";
import { catppuccin } from "./themes/catppuccin.ts";
import { nord } from "./themes/nord.ts";
import { tokyoNight } from "./themes/tokyo-night.ts";
import type { ThemeColors, ThemeVariant } from "./types.ts";

export type { PluginConfig } from "./plugin-types.ts";
export type { SidebarGroup } from "./sidebar.ts";
export { sidebar } from "./sidebar.ts";
export type { ThemeColors, ThemeVariant } from "./types.ts";
export { catppuccin, nord, tokyoNight };

const modernVariant: ThemeVariant = {
  name: "modern",
  borderRadius: "0.25rem",
  shadowSize: "default",
  spacing: "0.25rem",
  transitionDuration: "150ms",
  textScale: "0.90",
};

const classicVariant: ThemeVariant = {
  name: "classic",
  borderRadius: "0px",
  shadowSize: "none",
  spacing: "0.25rem",
  transitionDuration: "0ms",
  textScale: "1",
};

export { classicVariant, modernVariant };

export interface PluginOptions {
  /** Theme to use. Default: "catppuccin". Use "all" to enable runtime theme switching. */
  theme?: "catppuccin" | "tokyo-night" | "nord" | "all" | ThemeColors;
  /** Variant to use. Default: "modern" */
  variant?: "modern" | "classic" | ThemeVariant;
  /** Default color mode. Default: "light" */
  defaultMode?: "light" | "dark";
  /** CSS selector for dark mode. Default: ".dark" */
  darkSelector?: string;
  /** Prefix for CSS variables. Default: "color" */
  prefix?: string;
}

const builtinThemes: Record<string, ThemeColors> = {
  catppuccin,
  "tokyo-night": tokyoNight,
  nord,
};

const builtinVariants: Record<string, ThemeVariant> = {
  modern: modernVariant,
  classic: classicVariant,
};

const themeNames = Object.keys(builtinThemes);

function resolveTheme(theme: PluginOptions["theme"]): ThemeColors {
  if (!theme) return catppuccin;
  if (theme === "all") return catppuccin;
  if (typeof theme === "string") {
    const t = builtinThemes[theme];
    if (!t)
      throw new Error(
        `Unknown theme: ${theme}. Available: ${Object.keys(builtinThemes).join(", ")}`,
      );
    return t;
  }
  return theme;
}

function resolveVariant(variant: PluginOptions["variant"]): ThemeVariant {
  if (!variant) return modernVariant;
  if (typeof variant === "string") {
    const v = builtinVariants[variant];
    if (!v)
      throw new Error(
        `Unknown variant: ${variant}. Available: ${Object.keys(builtinVariants).join(", ")}`,
      );
    return v;
  }
  return variant;
}

function buildCssVariables(colors: Record<string, string>, prefix: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(colors)) {
    vars[`--${prefix}-${key}`] = value;
  }
  return vars;
}

/**
 * Staccato UI — a Tailwind CSS v4 plugin providing DaisyUI-style component
 * classes with Catppuccin, Tokyo Night, and Nord color themes.
 *
 * All colors are exposed as CSS custom properties (`--color-*`) for easy
 * theming and customization.
 *
 * @example
 * ```css
 * @import "tailwindcss";
 * @plugin "@oqa/tailwind-config";
 * ```
 *
 * Or with options:
 * ```ts
 * import { staccatoUI } from "@oqa/tailwind-config";
 * // in tailwind plugin config
 * staccatoUI({ theme: "tokyo-night" })
 * ```
 */
export const staccatoUI: (options?: PluginOptions  ) => PluginConfig =
  createPlugin.withOptions<PluginOptions | undefined>((options) => {
    const opts: Required<PluginOptions> = {
      theme: options?.theme ?? "catppuccin",
      variant: options?.variant ?? "modern",
      defaultMode: options?.defaultMode ?? "light",
      darkSelector: options?.darkSelector ?? ".dark",
      prefix: options?.prefix ?? "color",
    };

    return (api) => {
      const useAllThemes = opts.theme === "all";
      const theme = resolveTheme(opts.theme);
      const variant = resolveVariant(opts.variant);
      const prefix = opts.prefix;
      const lightVars = buildCssVariables(theme.light, prefix);
      const darkVars = buildCssVariables(theme.dark, prefix);

      const noShadow = variant.shadowSize === "none";
      const noTransition = variant.transitionDuration === "0ms";
      const hasRadius = variant.borderRadius !== "0px" && variant.borderRadius !== "0";

      const variantVars = {
        "--variant-radius": variant.borderRadius,
        "--variant-radius-lg": hasRadius ? "0.5rem" : "0px",
        "--variant-radius-sm": hasRadius ? "0.25rem" : "0px",
        // Badges/pills: rounded for modern, square for classic
        "--variant-radius-badge": hasRadius ? "9999px" : "0px",
        "--variant-transition": variant.transitionDuration,
        "--variant-transition-fn": noTransition ? "linear" : "cubic-bezier(0.4, 0, 0.2, 1)",
        "--variant-shadow-sm": noShadow ? "none" : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        "--variant-shadow-md": noShadow
          ? "none"
          : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
        "--variant-shadow-lg": noShadow
          ? "none"
          : "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
        "--variant-shadow-xl": noShadow
          ? "none"
          : "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        // Focus ring: glow for modern, plain outline for classic
        "--variant-focus-ring": noShadow
          ? "none"
          : "0 0 0 3px color-mix(in srgb, var(--color-primary) 30%, transparent)",
        // Active/click transform: scale for modern, none for classic
        "--variant-active-transform": noTransition ? "none" : "scale(0.98)",
        // Skeleton shimmer: play for modern, pause for classic
        "--variant-animation-play-state": noTransition ? "paused" : "running",
        "--variant-spacing": variant.spacing,
        // Text scale: 0.75 for modern (75% of default), 1 for classic
        "--variant-text-scale": variant.textScale ?? "1",
        "--variant-text-scale": variant.textScale ?? "1",
        // Derived semantic aliases — reference other CSS vars so they update on mode change
        "--color-success": "var(--color-green)",
        "--color-info": "var(--color-blue)",
        // Neutral: matches text color for inverted-background surfaces (tooltips, kbd, mockups)
        "--color-neutral": "var(--color-text)",
        // Secondary text: muted blend between text and background
        "--color-text-secondary": "color-mix(in srgb, var(--color-text) 60%, var(--color-bg))",
      };

      // Inject theme CSS variables as base styles
      if (useAllThemes) {
        // "all" mode: every theme is available via [data-color-theme] + [data-mode].
        // :root gets variant vars + semantic aliases only (no color values).
        // The head script sets data-color-theme before paint, so colors always
        // come from the attribute selectors below — no specificity conflicts.
        api.addBase({
          ":root": {
            ...variantVars,
            fontSize: "calc(1rem * var(--variant-text-scale, 1))",
          },
        });

        for (const name of themeNames) {
          const t = builtinThemes[name];
          if (!t) continue;
          // Light mode (default when data-mode is absent or "light")
          api.addBase({
            [`[data-color-theme="${name}"]`]: {
              ...buildCssVariables(t.light, prefix),
              "--theme-name": t.name,
              "--theme-variant": variant.name,
              "--theme-mode": "light",
            },
          });
          // Dark mode via data-mode attribute
          api.addBase({
            [`[data-color-theme="${name}"][data-mode="dark"]`]: {
              ...buildCssVariables(t.dark, prefix),
              "--theme-mode": "dark",
            },
          });
        }
      } else if (opts.defaultMode === "light") {
        api.addBase({
          ":root": {
            ...lightVars,
            ...variantVars,
            "--theme-name": theme.name,
            "--theme-variant": variant.name,
            "--theme-mode": "light",
            fontSize: "calc(1rem * var(--variant-text-scale, 1))",
          },
          [opts.darkSelector]: {
            ...darkVars,
            "--theme-mode": "dark",
          },
          [`@media (prefers-color-scheme: dark)`]: {
            ":root:not(.light)": {
              ...darkVars,
              "--theme-mode": "dark",
            },
          },
        });
      } else {
        api.addBase({
          ":root": {
            ...darkVars,
            ...variantVars,
            "--theme-name": theme.name,
            "--theme-variant": variant.name,
            "--theme-mode": "dark",
            fontSize: "calc(1rem * var(--variant-text-scale, 1))",
          },
          ".light": {
            ...lightVars,
            "--theme-mode": "light",
          },
          [`@media (prefers-color-scheme: light)`]: {
            ":root:not(.dark)": {
              ...lightVars,
              "--theme-mode": "light",
            },
          },
        });
      }

      // Register all component classes
      api.addComponents({
        ...buttonComponents(),
        ...inputComponents(),
        ...cardComponents(),
        ...badgeComponents(),
        ...tableComponents(),
        ...tabsComponents(),
        ...radioComponents(),
        ...fileInputComponents(),
        ...rangeComponents(),
        ...ratingComponents(),
        ...alertComponents(),
        ...loadingComponents(),
        ...progressComponents(),
        ...radialProgressComponents(),
        ...tooltipComponents(),
        ...skeletonComponents(),
        ...toastComponents(),
        ...breadcrumbsComponents(),
        ...menuComponents(),
        ...navbarComponents(),
        ...paginationComponents(),
        ...stepsComponents(),
        ...linkComponents(),
        ...avatarComponents(),
        ...listComponents(),
        ...statComponents(),
        ...timelineComponents(),
        ...carouselComponents(),
        ...collapseComponents(),
        ...kbdComponents(),
        ...dividerComponents(),
        ...footerComponents(),
        ...heroComponents(),
        ...indicatorComponents(),
        ...stackComponents(),
        ...joinComponents(),
        ...maskComponents(),
        ...drawerComponents(),
        ...dropdownComponents(),
        ...modalComponents(),
        ...fabComponents(),
        ...speedDialComponents(),
        ...swapComponents(),
        ...chatComponents(),
        ...countdownComponents(),
        ...dockComponents(),
        ...mockupBrowserComponents(),
        ...mockupCodeComponents(),
        ...mockupPhoneComponents(),
        ...mockupWindowComponents(),
      });

      // Convenience utility for theme-aware background/text
      api.addUtilities({
        ".bg-theme": { backgroundColor: "var(--color-bg)" },
        ".text-theme": { color: "var(--color-text)" },
        ".bg-primary": { backgroundColor: "var(--color-primary)" },
        ".bg-secondary": { backgroundColor: "var(--color-secondary)" },
        ".bg-accent": { backgroundColor: "var(--color-accent)" },
        ".bg-surface-0": {
          backgroundColor: "var(--color-surface0, var(--color-bg))",
        },
        ".bg-surface-1": { backgroundColor: "var(--color-surface1)" },
        ".bg-surface-2": { backgroundColor: "var(--color-surface2)" },
        ".bg-base": { backgroundColor: "var(--color-base, var(--color-bg))" },
        ".bg-mantle": {
          backgroundColor: "var(--color-mantle, var(--color-bg))",
        },
        ".bg-crust": { backgroundColor: "var(--color-crust, var(--color-bg))" },
        ".text-primary": { color: "var(--color-primary)" },
        ".text-secondary": { color: "var(--color-secondary)" },
        ".text-accent": { color: "var(--color-accent)" },
        ".text-warning": { color: "var(--color-warning)" },
        ".text-error": { color: "var(--color-error)" },
        ".text-muted": {
          color: "var(--color-subtext0, var(--color-overlay1, #94a3b8))",
        },
        ".border-theme": { borderColor: "var(--color-surface1)" },
      });

      // Register keyframes for animated components (loading, progress, skeleton)
      api.addBase({
        "@keyframes spin": {
          to: { transform: "rotate(360deg)" },
        },
        "@keyframes bounce": {
          "0%, 80%, 100%": { transform: "scale(0)" },
          "40%": { transform: "scale(1)" },
        },
        "@keyframes bars": {
          "0%, 40%, 100%": { transform: "scaleY(0.4)" },
          "20%": { transform: "scaleY(1)" },
        },
        "@keyframes infinity": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
        "@keyframes progress-indeterminate": {
          "0%": { transform: "translateX(-100%)" },
          "50%": { transform: "translateX(200%)" },
          "100%": { transform: "translateX(200%)" },
        },
        "@keyframes skeleton-shimmer": {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      });
    };
  });

// Default export for `@plugin "@oqa/tailwind-config"`
export default staccatoUI;
