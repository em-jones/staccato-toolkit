import { type JSX, Show, createSignal, createEffect, onCleanup } from "solid-js";
import { Button } from "./Button";
import { Input } from "./Input";

export interface PaginatorProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  size?: "xs" | "sm" | "md" | "lg";
  class?: string;
}

const baseStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  gap: "0.25rem",
  "list-style": "none",
  padding: "0",
  margin: "0",
};

const sizeStyles: Record<
  string,
  {
    itemMinWidth: string;
    itemHeight: string;
    fontSize: string;
    padding: string;
  }
> = {
  xs: {
    itemMinWidth: "1.5rem",
    itemHeight: "1.5rem",
    fontSize: "0.75rem",
    padding: "0 0.5rem",
  },
  sm: {
    itemMinWidth: "2rem",
    itemHeight: "2rem",
    fontSize: "0.8125rem",
    padding: "0 0.625rem",
  },
  md: {
    itemMinWidth: "2.5rem",
    itemHeight: "2.5rem",
    fontSize: "0.875rem",
    padding: "0 0.75rem",
  },
  lg: {
    itemMinWidth: "3rem",
    itemHeight: "3rem",
    fontSize: "1rem",
    padding: "0 1rem",
  },
};

const pageItemBaseStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  "justify-content": "center",
  "min-width": "2.5rem",
  height: "2.5rem",
  padding: "0 0.75rem",
  "border-radius": "0.5rem",
  "font-size": "0.875rem",
  "font-weight": "500",
  color: "var(--color-text)",
  cursor: "pointer",
  transition: "background-color 150ms ease, color 150ms ease",
  border: "none",
  background: "transparent",
};

const activePageStyles: JSX.CSSProperties = {
  "border-bottom": "2px solid var(--color-primary)",
  color: "var(--color-primary)",
};

const ellipsisStyles: JSX.CSSProperties = {
  cursor: "pointer",
  "user-select": "none",
  "min-width": "2rem",
  height: "2rem",
  display: "flex",
  "align-items": "center",
  "justify-content": "center",
};

const popoverStyles: JSX.CSSProperties = {
  position: "absolute",
  "z-index": "50",
  display: "flex",
  "align-items": "center",
  gap: "0.5rem",
  padding: "0.75rem",
  "margin-top": "0.5rem",
  "border-radius": "0.5rem",
  "background-color": "var(--color-bg)",
  border: "1px solid var(--color-surface1)",
  "box-shadow": "var(--variant-shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1))",
};

const ellipsisButtonStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  "justify-content": "center",
  "min-width": "2rem",
  height: "2rem",
  "font-size": "0.875rem",
  "font-weight": "500",
  color: "var(--color-text)",
  cursor: "pointer",
  transition: "background-color 150ms ease, color 150ms ease",
  border: "none",
  background: "transparent",
  "border-radius": "0.5rem",
};

export const Paginator = (props: PaginatorProps) => {
  const [showPopover, setShowPopover] = createSignal(false);
  const [gotoPage, setGotoPage] = createSignal("");
  let popoverRef: HTMLDivElement | undefined;

  const size = () => props.size ?? "md";
  const sizeStyle = sizeStyles[size()];

  createEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef && !popoverRef.contains(event.target as Node)) {
        setShowPopover(false);
      }
    };

    if (showPopover()) {
      document.addEventListener("click", handleClickOutside);
      onCleanup(() => document.removeEventListener("click", handleClickOutside));
    }
  });

  const handleGotoPage = () => {
    const page = parseInt(gotoPage(), 10);
    if (!isNaN(page) && page >= 1 && page <= props.totalPages) {
      props.onPageChange(page);
      setShowPopover(false);
      setGotoPage("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      handleGotoPage();
    } else if (e.key === "Escape") {
      setShowPopover(false);
      setGotoPage("");
    }
  };

  const getPageNumbers = (): (number | "ellipsis")[] => {
    const total = props.totalPages;
    const current = props.currentPage;

    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (current <= 3) {
      return [1, 2, 3, 4, "ellipsis", total];
    }

    if (current >= total - 2) {
      return [1, "ellipsis", total - 3, total - 2, total - 1, total];
    }

    return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
  };

  const renderPageItem = (page: number | "ellipsis", index: number) => {
    if (page === "ellipsis") {
      return (
        <li key={`ellipsis-${index}`} style={{ position: "relative" }}>
          <div style={ellipsisStyles}>
            <button
              style={ellipsisButtonStyles}
              onClick={() => setShowPopover(!showPopover())}
              aria-label="Go to page"
            >
              ...
            </button>
          </div>
          <Show when={showPopover()}>
            <div ref={popoverRef} style={popoverStyles}>
              <Input
                type="number"
                min={1}
                max={props.totalPages}
                value={gotoPage()}
                onInput={(e) => setGotoPage(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                size="sm"
                style={{ width: "4rem" }}
              />
              <Button size="sm" onClick={handleGotoPage}>
                Go
              </Button>
            </div>
          </Show>
        </li>
      );
    }

    const isActive = page === props.currentPage;

    const itemStyles: JSX.CSSProperties = {
      ...pageItemBaseStyles,
      "min-width": sizeStyle.itemMinWidth,
      height: sizeStyle.itemHeight,
      "font-size": sizeStyle.fontSize,
      padding: sizeStyle.padding,
    };

    if (isActive) {
      Object.assign(itemStyles, activePageStyles);
    }

    return (
      <li key={page}>
        <button
          style={itemStyles}
          onClick={() => props.onPageChange(page)}
          aria-current={isActive ? "page" : undefined}
        >
          {page}
        </button>
      </li>
    );
  };

  return (
    <ul class={props.class} style={baseStyles}>
      <li>
        <button
          style={{
            ...pageItemBaseStyles,
            "min-width": sizeStyle.itemMinWidth,
            height: sizeStyle.itemHeight,
            "font-size": sizeStyle.fontSize,
            padding: sizeStyle.padding,
            opacity: props.currentPage === 1 ? "0.5" : "1",
            cursor: props.currentPage === 1 ? "not-allowed" : "pointer",
          }}
          onClick={() => props.currentPage > 1 && props.onPageChange(props.currentPage - 1)}
          disabled={props.currentPage === 1}
          aria-label="Previous page"
        >
          ←
        </button>
      </li>
      {getPageNumbers().map((page, index) => renderPageItem(page, index))}
      <li>
        <button
          style={{
            ...pageItemBaseStyles,
            "min-width": sizeStyle.itemMinWidth,
            height: sizeStyle.itemHeight,
            "font-size": sizeStyle.fontSize,
            padding: sizeStyle.padding,
            opacity: props.currentPage === props.totalPages ? "0.5" : "1",
            cursor: props.currentPage === props.totalPages ? "not-allowed" : "pointer",
          }}
          onClick={() =>
            props.currentPage < props.totalPages && props.onPageChange(props.currentPage + 1)
          }
          disabled={props.currentPage === props.totalPages}
          aria-label="Next page"
        >
          →
        </button>
      </li>
    </ul>
  );
};
