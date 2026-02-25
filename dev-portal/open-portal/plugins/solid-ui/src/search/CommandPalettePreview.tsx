import type { JSX } from "solid-js";
import { Show } from "solid-js";
import type { TypeaheadResult } from "@op/platform/search";
import { Badge } from "../components/Badge";

export interface CommandPalettePreviewProps {
  result: TypeaheadResult | null;
}

const containerStyles: JSX.CSSProperties = {
  "border-top": "1px solid var(--color-surface1)",
  padding: "1rem",
  "max-height": "16rem",
  "overflow-y": "auto",
  "background-color": "var(--color-surface0)",
};

const titleStyles: JSX.CSSProperties = {
  "font-size": "1rem",
  "font-weight": "600",
  color: "var(--color-text)",
  "margin-bottom": "0.5rem",
};

const metaStyles: JSX.CSSProperties = {
  display: "flex",
  gap: "0.5rem",
  "align-items": "center",
  "margin-bottom": "0.75rem",
  "flex-wrap": "wrap",
};

const snippetStyles: JSX.CSSProperties = {
  "font-size": "0.8125rem",
  color: "var(--color-text-secondary)",
  "line-height": "1.5",
  padding: "0.75rem",
  "background-color": "var(--color-bg)",
  "border-radius": "0.375rem",
  border: "1px solid var(--color-surface1)",
  "white-space": "pre-wrap",
  "word-break": "break-word",
};

const queryStyles: JSX.CSSProperties = {
  "font-family": "monospace",
  "font-size": "0.8125rem",
  padding: "0.75rem",
  "background-color": "var(--color-bg)",
  "border-radius": "0.375rem",
  border: "1px solid var(--color-surface1)",
  "white-space": "pre-wrap",
  "word-break": "break-all",
  overflow: "auto",
};

const emptyStyles: JSX.CSSProperties = {
  padding: "1.5rem",
  "text-align": "center",
  color: "var(--color-text-secondary)",
  "font-size": "0.8125rem",
};

/**
 * Preview panel that renders domain-specific detail for the selected result.
 * - documentation: title, source badge, path, highlighted snippet
 * - catalog: name, kind badge, owner, system, description, tags
 * - query_language: dialect badge, query string, row count
 * - fallback: label + description
 */
export function CommandPalettePreview(props: CommandPalettePreviewProps) {
  return (
    <div style={containerStyles}>
      <Show
        when={props.result}
        fallback={<div style={emptyStyles}>Select a result to preview</div>}
      >
        {(result) => {
          const r = result();
          return (
            <>
              {/* Documentation preview */}
              <Show when={"title" in r && "path" in r}>
                <div style={titleStyles}>{(r as any).title}</div>
                <div style={metaStyles}>
                  <Badge size="sm" color="primary">
                    {(r as any).source}
                  </Badge>
                  <span style={{ "font-size": "0.75rem", color: "var(--color-text-secondary)" }}>
                    {(r as any).path}
                  </span>
                </div>
                <Show when={(r as any).snippet}>
                  <div style={snippetStyles}>{(r as any).snippet}</div>
                </Show>
              </Show>

              {/* Catalog preview */}
              <Show when={"kind" in r && "entityRef" in r}>
                <div style={titleStyles}>{(r as any).title ?? (r as any).name}</div>
                <div style={metaStyles}>
                  <Badge size="sm" color="secondary">
                    {(r as any).kind}
                  </Badge>
                  <Show when={(r as any).owner}>
                    <span style={{ "font-size": "0.75rem", color: "var(--color-text-secondary)" }}>
                      Owner: {(r as any).owner}
                    </span>
                  </Show>
                  <Show when={(r as any).system}>
                    <span style={{ "font-size": "0.75rem", color: "var(--color-text-secondary)" }}>
                      System: {(r as any).system}
                    </span>
                  </Show>
                </div>
                <Show when={(r as any).description}>
                  <div style={snippetStyles}>{(r as any).description}</div>
                </Show>
                <Show when={(r as any).tags && (r as any).tags.length > 0}>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.25rem",
                      "margin-top": "0.5rem",
                      "flex-wrap": "wrap",
                    }}
                  >
                    {(r as any).tags.map((tag: string) => (
                      <Badge size="xs">{tag}</Badge>
                    ))}
                  </div>
                </Show>
              </Show>

              {/* Query language preview */}
              <Show when={"query" in r && "dialect" in r}>
                <div style={metaStyles}>
                  <Badge size="sm" color="accent">
                    {(r as any).dialect}
                  </Badge>
                  <Show when={(r as any).totalRows}>
                    <span style={{ "font-size": "0.75rem", color: "var(--color-text-secondary)" }}>
                      {(r as any).totalRows} rows
                    </span>
                  </Show>
                </div>
                <div style={queryStyles}>{(r as any).query}</div>
                <Show when={(r as any).previewRows && (r as any).previewRows.length > 0}>
                  <div
                    style={{
                      "margin-top": "0.75rem",
                      "font-size": "0.75rem",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    Preview: {(r as any).previewRows.length} rows
                  </div>
                </Show>
              </Show>

              {/* Generic fallback */}
              <Show when={!("title" in r) && !("kind" in r) && !("query" in r)}>
                <div style={titleStyles}>{r.label}</div>
                <Show when={r.description}>
                  <div style={snippetStyles}>{r.description}</div>
                </Show>
              </Show>
            </>
          );
        }}
      </Show>
    </div>
  );
}
