import { createSignal, createEffect } from "solid-js";

export interface UseSearchKeyboardProps {
  itemCount: () => number;
  onSelect: (index: number) => void;
  onClose: () => void;
  isOpen: () => boolean;
}

/**
 * Hook for keyboard navigation within the command palette results.
 * Handles ArrowUp/Down, Enter, Escape, and Tab keys.
 */
export function useSearchKeyboard(props: UseSearchKeyboardProps) {
  const [selectedIndex, setSelectedIndex] = createSignal(-1);

  function handleKeyDown(e: KeyboardEvent) {
    if (!props.isOpen()) return;

    const count = props.itemCount();

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < count - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, count - 1)));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex() >= 0) {
          props.onSelect(selectedIndex());
        }
        break;
      case "Escape":
        e.preventDefault();
        props.onClose();
        break;
      case "Tab":
        if (selectedIndex() >= 0) {
          e.preventDefault();
          props.onSelect(selectedIndex());
        }
        break;
    }
  }

  createEffect(() => {
    if (props.itemCount() === 0) {
      setSelectedIndex(-1);
    } else if (selectedIndex() >= props.itemCount()) {
      setSelectedIndex(props.itemCount() - 1);
    }
  });

  return { selectedIndex, setSelectedIndex, handleKeyDown };
}
