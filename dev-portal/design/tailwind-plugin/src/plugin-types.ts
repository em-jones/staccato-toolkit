/** CSS-in-JS type matching Tailwind's plugin API. */
export type CssInJs = {
  [key: string]: string | string[] | CssInJs | CssInJs[];
};

export type PluginConfig = (api: {
  addUtilities: (utilities: CssInJs) => void;
  addComponents: (components: CssInJs) => void;
  addVariant: (name: string, fn: (args: any) => string) => void;
  theme: (path: string) => any;
  e: (className: string) => string;
}) => void;
