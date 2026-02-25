/**
 * Registry of Solid UI components available for JSX live previews.
 *
 * Maps component names to their import source. When the remark plugin
 * encounters a JSX code block, it checks component names against this
 * registry and auto-injects the necessary import statements.
 */

/** All component names exported from @op-plugin/solid-ui */
export const SOLID_UI_COMPONENTS = new Set([
  // Layout
  "Stack",
  "Join",
  "JoinItem",
  "Divider",
  "Mask",
  "Indicator",
  "IndicatorItem",

  // Actions
  "Button",
  "Dropdown",
  "DropdownContent",
  "DropdownItem",
  "Fab",
  "SpeedDial",
  "Modal",
  "Swap",

  // Navigation
  "Navbar",
  "NavbarSection",
  "NavbarItem",
  "NavbarTitle",
  "NavbarDropdown",
  "AuthNavbar",
  "Breadcrumbs",
  "BreadcrumbsItem",
  "BreadcrumbsLink",
  "BreadcrumbsList",
  "Menu",
  "Pagination",
  "PaginationNext",
  "PaginationPrev",
  "PageItem",
  "Paginator",
  "Link",
  "LinkPrimary",
  "LinkSecondary",
  "LinkAccent",
  "LinkSuccess",
  "LinkWarning",
  "LinkError",
  "LinkHover",
  "Tabs",
  "Hero",
  "HeroContent",
  "HeroTitle",
  "HeroSubtitle",
  "Footer",
  "FooterSection",
  "Dock",

  // Data Display
  "Avatar",
  "Badge",
  "Card",
  "CardBody",
  "CardActions",
  "Carousel",
  "CarouselItem",
  "CarouselNext",
  "CarouselPrev",
  "Collapse",
  "CollapseTitle",
  "CollapseContent",
  "Accordion",
  "Kbd",
  "List",
  "ListItem",
  "ListRow",
  "ListIcon",
  "ListContent",
  "ListTitle",
  "ListSubtitle",
  "ListEnd",
  "Stat",
  "StatTitle",
  "StatValue",
  "StatDesc",
  "StatFigure",
  "StatActions",
  "Table",
  "TableHead",
  "TableBody",
  "TableRow",
  "TableCell",
  "TableFoot",
  "Timeline",
  "TimelineItem",
  "TimelineStart",
  "TimelineMiddle",
  "TimelineEnd",
  "TimelineLine",
  "TimelineDot",
  "TimelineRing",
  "TimelineBox",
  "TimelineTitle",
  "TimelineText",
  "TimelineDate",
  "Skeleton",
  "SkeletonText",
  "SkeletonAvatar",
  "SkeletonButton",
  "SkeletonCard",
  "SkeletonImage",

  // Feedback
  "Alert",
  "Loading",
  "Progress",
  "RadialProgress",
  "Toast",
  "ToastContent",
  "ToastIcon",
  "ToastClose",
  "Tooltip",
  "TooltipContent",

  // Forms
  "Input",
  "FileInput",
  "Radio",
  "Range",
  "Rating",
  "RatingHalf",

  // Mockups
  "MockupBrowser",
  "MockupBrowserToolbar",
  "MockupCode",
  "MockupCodeLine",
  "MockupPhone",
  "MockupWindow",

  // Drawer
  "Drawer",
  "DrawerContent",
  "DrawerHeader",
  "DrawerOverlay",
  "DrawerSide",
  "DrawerToggle",

  // Steps
  "Steps",
]);

/**
 * Build an mdxjsEsm import node for the given component names.
 *
 * @param {string[]} names — component names to import
 * @returns {object} mdxjsEsm AST node with the import declaration
 */
export function buildComponentImportNode(names) {
  const source = "@op-plugin/solid-ui";
  const specifiers = names.map((name) => ({
    type: "ImportSpecifier",
    imported: { type: "Identifier", name },
    local: { type: "Identifier", name },
  }));

  const importText = `import { ${names.join(", ")} } from '${source}'`;

  return {
    type: "mdxjsEsm",
    value: importText,
    data: {
      estree: {
        type: "Program",
        sourceType: "module",
        body: [
          {
            type: "ImportDeclaration",
            source: { type: "Literal", value: source },
            specifiers,
          },
        ],
      },
    },
  };
}
