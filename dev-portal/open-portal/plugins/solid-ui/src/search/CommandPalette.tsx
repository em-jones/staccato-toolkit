import { groupByDomain, type TypeaheadGroup } from "@op/platform/search";
import type { SearchService, TypeaheadResult } from "@op/platform/search/types";
import type { JSX } from "solid-js";
import { createMemo, createSignal, onCleanup, onMount, Show } from "solid-js";
import { Kbd } from "../components/Kbd.tsx";
import { CommandPaletteInput } from "./CommandPaletteInput.tsx";
import { CommandPalettePreview } from "./CommandPalettePreview.tsx";
import { CommandPaletteResults } from "./CommandPaletteResults.tsx";
import { DEFAULT_PILL_KEYS, DOMAIN_LABELS, type PillKeyDef } from "./types.ts";
import { useSearchKeyboard } from "./useSearchKeyboard.ts";

export interface CommandPaletteProps {
	/** The search service to query against. */
	searchService: SearchService;
	/** Whether the palette is currently open. */
	open?: boolean;
	/** Called when the palette is dismissed. */
	onClose?: () => void;
	/** Custom pill key definitions. Falls back to DEFAULT_PILL_KEYS. */
	pillKeys?: PillKeyDef[];
	/** Max typeahead results to fetch per query. */
	maxResults?: number;
	/** Whether to show the detail preview panel. Default: true. */
	showPreview?: boolean;
}

const overlayStyles: JSX.CSSProperties = {
	position: "fixed",
	inset: "0",
	"z-index": "1000",
	display: "flex",
	"align-items": "flex-start",
	"justify-content": "center",
	"padding-top": "10vh",
	"background-color": "rgba(0, 0, 0, 0.5)",
	transition: "opacity 200ms ease, visibility 200ms ease",
};

function paletteStyles(isMobile: boolean): JSX.CSSProperties {
	return {
		width: isMobile ? "calc(100% - 2rem)" : "48rem",
		"max-height": isMobile ? "80vh" : "36rem",
		"border-radius": "0.75rem",
		"background-color": "var(--color-bg)",
		border: "1px solid var(--color-surface1)",
		"box-shadow": "var(--variant-shadow-xl, none)",
		display: "flex",
		"flex-direction": "column",
		overflow: "hidden",
	};
}

const headerStyles: JSX.CSSProperties = {
	display: "flex",
	"align-items": "center",
	"justify-content": "space-between",
	padding: "0.75rem 1rem 0.25rem",
};

const footerStyles: JSX.CSSProperties = {
	display: "flex",
	"align-items": "center",
	gap: "0.75rem",
	padding: "0.5rem 1rem",
	"font-size": "0.75rem",
	color: "var(--color-text-secondary)",
	"border-top": "1px solid var(--color-surface1)",
	"background-color": "var(--color-surface0)",
};

/**
 * CommandPalette — a cmd+k-style search modal.
 *
 * Combines a CodeMirror-based input (with pill-aware autocomplete),
 * a grouped results list, and an optional detail preview panel.
 *
 * The preview panel is shown on the right for desktop widths (>768px)
 * and moves below the results on mobile.
 */
export function CommandPalette(props: CommandPaletteProps) {
	const isOpen = () => props.open ?? false;
	const [_query, setQuery] = createSignal("");
	const [loading, setLoading] = createSignal(false);
	const [results, setResults] = createSignal<TypeaheadResult[]>([]);
	const [selectedResult, setSelectedResult] =
		createSignal<TypeaheadResult | null>(null);
	const [isMobile, setIsMobile] = createSignal(false);
	const [showPreviewMobile, setShowPreviewMobile] = createSignal(false);

	const pillKeys = () => props.pillKeys ?? DEFAULT_PILL_KEYS;

	const groups = createMemo<TypeaheadGroup[]>(() => {
		const items = results();
		if (items.length === 0) return [];
		return groupByDomain(items, DOMAIN_LABELS);
	});

	const totalItems = createMemo(() => results().length);

	const { selectedIndex, setSelectedIndex, handleKeyDown } = useSearchKeyboard({
		itemCount: totalItems,
		onSelect: (index) => {
			const result = results()[index];
			if (result) handleResultAction(result);
		},
		onClose: () => props.onClose?.(),
		isOpen,
	});

	function handleResultAction(result: TypeaheadResult) {
		setSelectedResult(result);
		switch (result.action.type) {
			case "navigate":
				window.location.hash = result.action.path;
				props.onClose?.();
				break;
			case "refine":
				setQuery(result.action.query);
				break;
			case "execute":
				result.action.handler?.();
				props.onClose?.();
				break;
			case "custom":
				result.action.handler();
				props.onClose?.();
				break;
		}
	}

	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	async function performSearch(term: string) {
		if (!term.trim()) {
			setResults([]);
			return;
		}

		setLoading(true);
		try {
			const typeaheadResults = await props.searchService.typeahead({
				term,
				maxResults: props.maxResults ?? 20,
			});
			setResults(typeaheadResults);
		} catch (e) {
			console.error("CommandPalette search failed:", e);
			setResults([]);
		} finally {
			setLoading(false);
		}
	}

	function onQueryChange(newQuery: string) {
		setQuery(newQuery);
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => performSearch(newQuery), 150);
	}

	function handlePaletteKeyDown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			e.preventDefault();
			props.onClose?.();
		} else {
			handleKeyDown(e);
		}
	}

	function handleResultHover(index: number) {
		setSelectedIndex(index);
		const result = results()[index];
		if (result) setSelectedResult(result);
	}

	// Mobile detection
	let resizeHandler: () => void;
	onMount(() => {
		resizeHandler = () => {
			const mobile = window.innerWidth < 768;
			setIsMobile(mobile);
			if (!mobile) setShowPreviewMobile(false);
		};
		resizeHandler();
		window.addEventListener("resize", resizeHandler);
	});

	onCleanup(() => {
		window.removeEventListener("resize", resizeHandler!);
		clearTimeout(debounceTimer);
	});

	// Global Cmd+K listener
	onMount(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				// Toggle is handled by the consumer via open prop
			}
		};
		window.addEventListener("keydown", handler);
		onCleanup(() => window.removeEventListener("keydown", handler));
	});

	return (
		<Show when={isOpen()}>
			<div style={overlayStyles} onClick={() => props.onClose?.()}>
				<div
					style={paletteStyles(isMobile())}
					onClick={(e) => e.stopPropagation()}
					onKeyDown={handlePaletteKeyDown}
					role="dialog"
					aria-modal="true"
					aria-label="Command palette"
				>
					{/* Header */}
					<div style={headerStyles}>
						<span
							style={{
								"font-size": "0.75rem",
								color: "var(--color-text-secondary)",
							}}
						>
							Search
						</span>
						<Kbd size="sm" variant="default">
							ESC
						</Kbd>
					</div>

					{/* Input */}
					<CommandPaletteInput
						searchService={props.searchService}
						pillKeys={pillKeys()}
						onQueryChange={onQueryChange}
						placeholder="Type to search... (use service:, env:, level: for filters)"
					/>

					{/* Mobile: toggle for preview */}
					<Show when={isMobile() && selectedResult()}>
						<div
							style={{
								display: "flex",
								"justify-content": "flex-end",
								padding: "0.25rem 0.75rem",
								"border-bottom": "1px solid var(--color-surface1)",
							}}
						>
							<button
								type="button"
								onClick={() => setShowPreviewMobile((p) => !p)}
								style={{
									background: "none",
									border: "none",
									color: "var(--color-primary)",
									"font-size": "0.75rem",
									cursor: "pointer",
									padding: "0.25rem 0.5rem",
								}}
							>
								{showPreviewMobile() ? "Hide preview" : "Show preview"}
							</button>
						</div>
					</Show>

					{/* Results */}
					<Show when={!isMobile() || !showPreviewMobile()}>
						<CommandPaletteResults
							groups={groups()}
							selectedIndex={selectedIndex}
							onSelect={(result) => {
								setSelectedResult(result);
								handleResultAction(result);
							}}
							onHover={handleResultHover}
							loading={loading()}
						/>
					</Show>

					{/* Preview panel */}
					<Show
						when={
							props.showPreview !== false &&
							selectedResult() &&
							(!isMobile() || showPreviewMobile())
						}
					>
						<CommandPalettePreview result={selectedResult()} />
					</Show>

					{/* Footer */}
					<div style={footerStyles}>
						<span>
							<Kbd size="xs">↑</Kbd> <Kbd size="xs">↓</Kbd> navigate
						</span>
						<span>
							<Kbd size="xs">↵</Kbd> select
						</span>
						<span>
							<Kbd size="xs">esc</Kbd> close
						</span>
					</div>
				</div>
			</div>
		</Show>
	);
}
