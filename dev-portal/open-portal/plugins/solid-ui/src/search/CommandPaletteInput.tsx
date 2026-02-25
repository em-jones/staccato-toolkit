import {
	autocompletion,
	type Completion,
	type CompletionContext,
} from "@codemirror/autocomplete";
import { EditorState } from "@codemirror/state";
import {
	placeholder as cmPlaceholder,
	EditorView,
	keymap,
} from "@codemirror/view";
import type { SearchService, TypeaheadResult } from "@op/platform/search/types";
import type { JSX } from "solid-js";
import { onCleanup, onMount } from "solid-js";
import { createCodeMirrorTheme, syntaxTheme } from "./codemirror-theme.ts";
import { SearchPill as SearchPillComponent } from "./SearchPill.tsx";
import type { PillKeyDef } from "./types.ts";
import { useSearchPills } from "./useSearchPills.ts";

export interface CommandPaletteInputProps {
	searchService: SearchService;
	pillKeys?: PillKeyDef[];
	onQueryChange?: (query: string) => void;
	onSelect?: (result: TypeaheadResult) => void;
	placeholder?: string;
}

const containerStyles: JSX.CSSProperties = {
	display: "flex",
	"flex-direction": "column",
	"border-bottom": "1px solid var(--color-surface1)",
};

const editorContainerStyles: JSX.CSSProperties = {
	display: "flex",
	"align-items": "center",
	padding: "0.5rem 0.75rem",
	"font-size": "0.875rem",
	"font-family": "inherit",
	background: "transparent",
};

const pillsContainerStyles: JSX.CSSProperties = {
	display: "flex",
	"flex-wrap": "wrap",
	gap: "0.25rem",
	padding: "0.375rem 0.75rem 0.25rem",
	"min-height": "1.75rem",
};

export function CommandPaletteInput(props: CommandPaletteInputProps) {
	const { parsed, setRawValue, removePill } = useSearchPills();
	const pillKeys = () => props.pillKeys ?? [];
	// eslint-disable-next-line no-unassigned-vars
	// eslint-disable-next-line no-unassigned-vars
	let editorRef: HTMLDivElement | undefined;
	let view: EditorView | undefined;
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	const completionSource = async (context: CompletionContext) => {
		const word = context.matchBefore(/\w*:?\w*$/);
		if (!word) return null;

		const term = word.text;

		// If user typed a key followed by colon (e.g. "service:"), offer values
		const pillKeyMatch = term.match(/^(\w+):(\w*)$/);
		if (pillKeyMatch) {
			const key = pillKeyMatch[1];
			const partial = pillKeyMatch[2];
			const def = pillKeys().find((k) => k.key === key);
			if (def?.values) {
				const filtered = partial
					? def.values.filter((v: string) => v.startsWith(partial))
					: def.values;
				const completions: Completion[] = filtered.map((v: string) => ({
					label: `${key}:${v}`,
					type: "keyword",
					detail: def.label,
				}));
				return {
					from: word.from,
					options: completions,
					validFor: /^\w+:\w*$/,
				};
			}
		}

		// If typing a bare word, query the search service typeahead
		if (term.length >= 2 && !term.includes(":")) {
			try {
				const results = await props.searchService.typeahead({
					term,
					maxResults: 10,
				});
				const completions: Completion[] = results.map((r) => ({
					label: r.label,
					type: "text",
					detail: r.description,
				}));
				return { from: word.from, options: completions, validFor: /^\w+$/ };
			} catch {
				// fall through to pill key completions
			}
		}

		// Offer pill keys as completions
		const pillCompletions: Completion[] = pillKeys().map((k) => ({
			label: `${k.key}:`,
			type: "keyword",
			detail: k.description,
		}));

		return {
			from: word.from,
			options: pillCompletions,
			validFor: /^\w*:?\w*$/,
		};
	};

	onMount(() => {
		const state = EditorState.create({
			doc: "",
			extensions: [
				EditorView.lineWrapping,
				cmPlaceholder(props.placeholder ?? "Search..."),
				keymap.of([
					{
						key: "Escape",
						run: () => false, // let parent handle Escape
					},
				]),
				autocompletion({
					override: [completionSource],
					activateOnTyping: true,
					selectOnOpen: false,
				}),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						const doc = update.state.doc.toString();
						setRawValue(doc);
						clearTimeout(debounceTimer);
						debounceTimer = setTimeout(() => {
							props.onQueryChange?.(doc);
						}, 150);
					}
				}),
				createCodeMirrorTheme(),
				syntaxTheme,
			],
		});

		view = new EditorView({ state, parent: editorRef });
	});

	onCleanup(() => {
		view?.destroy();
		clearTimeout(debounceTimer);
	});

	return (
		<div style={containerStyles}>
			<div style={pillsContainerStyles}>
				{parsed().pills.map((pill) => (
					<SearchPillComponent onRemove={() => removePill(pill)}>
						{pill.raw}
					</SearchPillComponent>
				))}
			</div>
			<div style={editorContainerStyles}>
				<div ref={editorRef} />
			</div>
		</div>
	);
}
