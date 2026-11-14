import "@testing-library/jest-dom/vitest";

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
