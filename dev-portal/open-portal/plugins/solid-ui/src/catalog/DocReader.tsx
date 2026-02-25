import type { JSX } from "solid-js";
import { Show } from "solid-js";

export interface DocReaderProps {
	/** Pre-rendered HTML string. Use a markdown parser (e.g. remark/unified) before passing here. */
	html: string;
	title?: string;
	class?: string;
	/** Table of contents headings for sidebar navigation */
	headings?: Array<{ level: number; text: string; id: string }>;
	/** Enable the table of contents sidebar (default: false for backward compatibility) */
	enableToc?: boolean;
}

export function DocReader(props: DocReaderProps): JSX.Element {
	const hasSidebar =
		props.enableToc === true && props.headings && props.headings.length > 0;

	return (
		<div class={`flex gap-8 ${props.class ?? ""}`}>
			<div
				class={`rounded-xl border border-(--color-surface1,rgba(0,0,0,0.1)) bg-(--color-bg,#fff) p-6 ${hasSidebar ? "flex-1" : ""}`}
			>
				<Show when={props.title}>
					<h2 class="mb-4 text-lg font-semibold text-(--color-text,#111)">
						{props.title}
					</h2>
				</Show>
				{/* eslint-disable-next-line solid/no-innerhtml */}
				<div
					class="prose prose-sm max-w-none text-(--color-text,#111)"
					innerHTML={props.html}
				/>
			</div>

			<Show when={hasSidebar}>
				<aside class="w-64 shrink-0">
					<h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-(--color-text-muted,#6b7280)">
						On this page
					</h3>
					<nav class="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto border-l border-(--color-border,rgba(0,0,0,0.1)) py-2">
						<ul>
							{props.headings!.map((heading) => (
								<li
									class={
										heading.level === 1
											? "pl-2"
											: heading.level === 2
												? "pl-4"
												: "pl-6"
									}
								>
									<a
										href={`#${heading.id}`}
										class="block px-3 py-1 text-sm text-(--color-text-muted,#6b7280) transition-colors hover:bg-(--color-surface1,rgba(0,0,0,0.05)) hover:text-(--color-primary,#3b82f6)"
									>
										{heading.text}
									</a>
								</li>
							))}
						</ul>
					</nav>
				</aside>
			</Show>
		</div>
	);
}
