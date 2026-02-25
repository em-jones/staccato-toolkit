export interface SidebarGroup {
  label: string;
  items?: Array<{
    label: string;
    slug: string;
  }>;
  autogenerate?: {
    directory: string;
  };
}

export const sidebar: SidebarGroup[] = [
  {
    label: "Getting Started",
    items: [
      { label: "Overview", slug: "getting-started/overview" },
      { label: "Themes", slug: "getting-started/themes" },
    ],
  },
  {
    label: "Components",
    autogenerate: { directory: "components" },
  },
];
