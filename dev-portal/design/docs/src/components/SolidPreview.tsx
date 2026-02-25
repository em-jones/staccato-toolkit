import { ErrorBoundary, type ParentProps } from "solid-js";

/**
 * Wrapper for live JSX previews in design docs.
 *
 * Provides an ErrorBoundary so a broken preview never crashes the
 * entire Starlight page, and applies the `.component-preview` class
 * that the existing CSS already targets for preview styling.
 *
 * Usage in MDX (injected automatically by remark-html-preview):
 *   <SolidPreview client:load>
 *     <Button color="primary">Click me</Button>
 *   </SolidPreview>
 */
export default function SolidPreview(props: ParentProps) {
  return (
    <ErrorBoundary
      fallback={(err) => (
        <div
          class="component-preview not-content"
          style={{
            "border-color": "var(--color-error, #ef4444)",
            color: "var(--color-error, #ef4444)",
            padding: "1rem",
          }}
        >
          <strong>Preview Error: </strong>
          <code>{err?.message ?? "Unknown error"}</code>
        </div>
      )}
    >
      <div class="component-preview not-content">{props.children}</div>
    </ErrorBoundary>
  );
}
