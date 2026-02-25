import { type ParentProps, type JSX } from "solid-js";

export type TableProps = ParentProps<{
  class?: string;
  variant?: "striped" | "bordered" | "hover" | "compact" | "fixed";
  wrapper?: boolean;
}>;

const tableBaseStyles: JSX.CSSProperties = {
  width: "100%",
  "border-collapse": "collapse",
  "font-size": "0.875rem",
  "line-height": "1.25rem",
  color: "var(--color-text)",
};

const tableHeadStyles: JSX.CSSProperties = {
  "border-bottom": "2px solid var(--color-surface1)",
};

const tableHeadThStyles: JSX.CSSProperties = {
  padding: "0.5rem 0.75rem",
  "text-align": "left",
  "font-weight": "600",
  "font-size": "0.75rem",
  "letter-spacing": "0.05em",
  "text-transform": "uppercase",
  "white-space": "nowrap",
  color: "var(--color-subtext0, var(--color-overlay1, #94a3b8))",
  "background-color": "var(--color-surface0, var(--color-bg))",
};

const tableBodyTrStyles: JSX.CSSProperties = {
  "border-bottom": "1px solid var(--color-surface1)",
  transition: "background-color var(--variant-transition, 150ms) ease",
};

const tableBodyTdStyles: JSX.CSSProperties = {
  padding: "0.625rem 0.75rem",
  "vertical-align": "middle",
};

const tableFooterTrStyles: JSX.CSSProperties = {
  "border-top": "2px solid var(--color-surface1)",
};

const tableFooterTdStyles: JSX.CSSProperties = {
  padding: "0.5rem 0.75rem",
  "font-weight": "600",
  color: "var(--color-subtext0, var(--color-overlay1, #94a3b8))",
  "background-color": "var(--color-surface0, var(--color-bg))",
};

const tableWrapperStyles: JSX.CSSProperties = {
  width: "100%",
  "overflow-x": "auto",
  "border-radius": "var(--variant-radius, 0.5rem)",
  border: "1px solid var(--color-surface1)",
};

const variantStyles: Record<string, JSX.CSSProperties> = {
  striped: {
    "& tbody tr:nth-child(even)": {
      "background-color": "var(--color-surface0, var(--color-bg))",
    },
  },
  bordered: {
    border: "1px solid var(--color-surface1)",
    "& th, & td": {
      border: "1px solid var(--color-surface1)",
    },
  },
  hover: {
    "& tbody tr:hover": {
      "background-color": "color-mix(in srgb, var(--color-primary) 8%, transparent)",
    },
  },
  compact: {
    "& th, & td": {
      padding: "0.25rem 0.5rem",
    },
  },
  fixed: {
    "table-layout": "fixed",
  },
};

export const Table = (props: TableProps) => {
  const tableClass = () =>
    `table ${props.variant ? `table-${props.variant}` : ""} ${props.class || ""}`.trim();

  return (
    <>
      {props.wrapper ? (
        <div style={tableWrapperStyles}>
          <table style={tableBaseStyles} class={tableClass()}>
            {props.children}
          </table>
        </div>
      ) : (
        <table style={tableBaseStyles} class={tableClass()}>
          {props.children}
        </table>
      )}
    </>
  );
};

export type TableHeadProps = ParentProps<{
  class?: string;
}>;

export const TableHead = (props: TableHeadProps) => (
  <thead style={tableHeadStyles} class={props.class}>
    {props.children}
  </thead>
);

export type TableBodyProps = ParentProps<{
  class?: string;
}>;

export const TableBody = (props: TableBodyProps) => (
  <tbody class={props.class}>{props.children}</tbody>
);

export type TableFootProps = ParentProps<{
  class?: string;
}>;

export const TableFoot = (props: TableFootProps) => (
  <tfoot class={props.class}>{props.children}</tfoot>
);

export type TableRowProps = ParentProps<{
  class?: string;
  variant?: "header" | "body" | "footer";
}>;

export const TableRow = (props: TableRowProps) => {
  const getRowStyles = () => {
    switch (props.variant) {
      case "header":
        return tableHeadThStyles;
      case "footer":
        return tableFooterTrStyles;
      default:
        return tableBodyTrStyles;
    }
  };

  return (
    <tr style={getRowStyles()} class={props.class}>
      {props.children}
    </tr>
  );
};

export type TableCellProps = ParentProps<{
  class?: string;
  as?: "th" | "td";
  variant?: "header" | "body" | "footer";
}>;

export const TableCell = (props: TableCellProps) => {
  const tag = () => props.as || (props.variant === "header" ? "th" : "td");
  const getStyles = () => {
    switch (props.variant) {
      case "header":
        return tableHeadThStyles;
      case "footer":
        return tableFooterTdStyles;
      default:
        return tableBodyTdStyles;
    }
  };

  return (
    <>
      {tag() === "th" ? (
        <th style={getStyles()} class={props.class}>
          {props.children}
        </th>
      ) : tag() === "td" ? (
        <td style={getStyles()} class={props.class}>
          {props.children}
        </td>
      ) : null}
    </>
  );
};
