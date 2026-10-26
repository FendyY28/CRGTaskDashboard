import { useEffect, useRef, type RefObject } from "react";

/**
 * Run `handler` when a mousedown lands outside `ref`.
 *
 * The handler is stored in a ref so callers can pass an inline closure
 * without re-subscribing the document listener on every render.
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: () => void,
  enabled = true
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;

    const listener = (event: MouseEvent) => {
      const el = ref.current;
      if (el && !el.contains(event.target as Node)) handlerRef.current();
    };

    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, enabled]);
}
