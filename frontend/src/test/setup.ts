import "@testing-library/jest-dom/vitest";
// `vi` is a Vitest runtime global (not in tsconfig types), so import it explicitly.
import { vi } from "vitest";

// Node >= 22 runs jsdom without a storage backend ("ExperimentalWarning:
// localStorage is not available"), so every touch of localStorage throws.
// Provide a simple in-memory implementation before any test or component runs.
if (typeof globalThis.localStorage === "undefined" || globalThis.localStorage == null) {
  const store = new Map<string, string>();
  const storageStub = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(String(key), String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => void store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
  vi.stubGlobal("localStorage", storageStub);
  vi.stubGlobal("sessionStorage", { ...storageStub });
}

// React 18 (the version this frontend runs) only treats updates as "act"ed
// when this flag is set. Without it, every render scheduled by React Testing
// Library logs an "An update to X inside a test was not wrapped in act(...)"
// warning.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
