import type { JSX } from "solid-js";
import { createMemo, onCleanup, onMount, Show } from "solid-js";
import { DocSidebar } from "./DocSidebar.tsx";

export interface DocRendererProps {
  html: string;
  title?: string;
  headings?: Array<{ level: number; text: string; id: string }>;
  class?: string;
  enableToc?: boolean;
  proseSize?: "sm" | "base" | "lg" | "xl";
}

export function DocRenderer(props: DocRendererProps): JSX.Element {
  const proseSize = createMemo(
    () => `prose-${props.proseSize ?? "base"}`,
  );

  let contentRef: HTMLDivElement | undefined;

  onMount(() => {
    if (!contentRef) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".docs-heading-anchor")) {
        e.preventDefault();
        const anchor = target.closest(".docs-heading-anchor") as HTMLAnchorElement;
        const href = anchor?.getAttribute("href");
        if (href) {
          const id = href.replace("#", "");
          document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
        }
      }
    };

    contentRef.addEventListener("click", handleClick);

    onCleanup(() => {
      contentRef?.removeEventListener("click", handleClick);
    });
  });

  return (
    <div class={`flex gap-8 ${props.class ?? ""}`}>
      <article
        class={`flex-1 rounded-xl border border-[var(--color-surface1,rgba(0,0,0,0.1))] bg-[var(--color-bg,#fff)] p-6 prose ${proseSize()} max-w-none text-[var(--color-text,#111)]`}
        ref={contentRef}
        innerHTML={props.html}
      />

      <Show when={props.enableToc !== false && props.headings && props.headings.length > 0}>
        <aside class="w-64 shrink-0">
          <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted,#6b7280)]">
            On this page
          </h3>
          <DocSidebar headings={props.headings ?? []} />
        </aside>
      </Show>
    </div>
  );
}

export function DocViewer(props: { content: string; class?: string }): JSX.Element {
  return (
    <div
      class={`prose prose-sm max-w-none rounded-xl border border-[var(--color-surface1,rgba(0,0,0,0.1))] bg-[var(--color-bg,#fff)] p-6 ${props.class ?? ""}`}
      innerHTML={props.content}
    />
  );
}
