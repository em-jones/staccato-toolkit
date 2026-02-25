import { type ParentProps, type JSX, For } from "solid-js";

export type BreadcrumbSize = "xs" | "sm" | "md" | "lg";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type BreadcrumbsProps = ParentProps<{
  class?: string;
  size?: BreadcrumbSize;
  items?: BreadcrumbItem[];
  separator?: JSX.Element;
}>;

export type BreadcrumbsListProps = ParentProps<{
  class?: string;
  size?: BreadcrumbSize;
}>;

export type BreadcrumbsItemProps = ParentProps<{
  class?: string;
  href?: string;
  active?: boolean;
}>;

const breadcrumbsBaseStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  gap: "0.5rem",
  "font-size": "0.875rem",
  "list-style": "none",
  padding: "0",
  margin: "0",
};

const breadcrumbsLiStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  gap: "0.5rem",
};

const breadcrumbsAStyles: JSX.CSSProperties = {
  color: "var(--color-primary)",
  "text-decoration": "none",
  transition: "opacity 150ms ease",
  cursor: "pointer",
};

const breadcrumbsLastChildStyles: JSX.CSSProperties = {
  color: "var(--color-text)",
  "font-weight": "500",
};

const sizeStyles: Record<BreadcrumbSize, JSX.CSSProperties> = {
  xs: {
    "font-size": "0.75rem",
  },
  sm: {
    "font-size": "0.8125rem",
  },
  md: {
    "font-size": "0.875rem",
  },
  lg: {
    "font-size": "1rem",
  },
};

const defaultSeparator = (
  <span
    style={{
      display: "block",
      width: "0.25rem",
      height: "0.25rem",
      "border-radius": "9999px",
      "background-color": "var(--color-surface2, #cbd5e1)",
    }}
  />
);

export type BreadcrumbsLinkProps = ParentProps<{
  class?: string;
  href?: string;
}>;

export const BreadcrumbsLink = (props: BreadcrumbsLinkProps) => (
  <a
    href={props.href}
    style={breadcrumbsAStyles}
    class={`breadcrumbs-a ${props.class || ""}`.trim()}
    onMouseEnter={(e) => {
      const target = e.currentTarget as HTMLAnchorElement;
      target.style.opacity = "0.8";
      target.style.textDecoration = "underline";
    }}
    onMouseLeave={(e) => {
      const target = e.currentTarget as HTMLAnchorElement;
      target.style.opacity = "1";
      target.style.textDecoration = "none";
    }}
  >
    {props.children}
  </a>
);

export const BreadcrumbsItem = (props: BreadcrumbsItemProps) => {
  const isLast = () => props.active;

  const itemStyles = (): JSX.CSSProperties => ({
    ...breadcrumbsLiStyles,
    ...(isLast() && breadcrumbsLastChildStyles),
  });

  return (
    <li style={itemStyles()} class={`breadcrumbs-li ${props.class || ""}`.trim()}>
      {props.href ? (
        <BreadcrumbsLink href={props.href}>{props.children}</BreadcrumbsLink>
      ) : (
        props.children
      )}
    </li>
  );
};

export const BreadcrumbsList = (props: BreadcrumbsListProps) => {
  const size = () => props.size || "md";

  const listStyles = (): JSX.CSSProperties => ({
    ...breadcrumbsBaseStyles,
    ...sizeStyles[size()],
  });

  const listClass = () =>
    `breadcrumbs breadcrumbs-${size()} breadcrumbs-ul ${props.class || ""}`.trim();

  return (
    <ul style={listStyles()} class={listClass()}>
      {props.children}
    </ul>
  );
};

export const Breadcrumbs = (props: BreadcrumbsProps) => {
  const size = () => props.size || "md";
  const separator = () => props.separator || defaultSeparator;

  const breadcrumbsStyles = (): JSX.CSSProperties => ({
    ...breadcrumbsBaseStyles,
    ...sizeStyles[size()],
  });

  const breadcrumbsClass = () => `breadcrumbs breadcrumbs-${size()} ${props.class || ""}`.trim();

  return (
    <nav style={breadcrumbsStyles()} class={breadcrumbsClass()} aria-label="breadcrumbs">
      {props.items && props.items.length > 0 ? (
        <ol style={{ ...breadcrumbsBaseStyles, ...sizeStyles[size()] }} class={breadcrumbsClass()}>
          <For each={props.items}>
            {(item, index) => (
              <>
                <BreadcrumbsItem href={item.href} active={index() === props.items!.length - 1}>
                  {item.label}
                </BreadcrumbsItem>
                {index() < props.items!.length - 1 && (
                  <li
                    style={{
                      display: "flex",
                      "align-items": "center",
                    }}
                    aria-hidden="true"
                  >
                    {separator()}
                  </li>
                )}
              </>
            )}
          </For>
        </ol>
      ) : (
        props.children
      )}
    </nav>
  );
};
