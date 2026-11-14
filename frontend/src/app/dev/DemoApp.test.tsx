import { describe, expect, it, vi } from "vitest";
import { render, act } from "@testing-library/react";

// jsdom under this Node version exposes no storage implementation; DemoApp
// writes auth tokens to localStorage on import, so stub it BEFORE DemoApp
// loads. `vi.hoisted` lifts this above the static imports; DemoApp itself is
// imported dynamically afterwards.
const { localStorageStub } = vi.hoisted(() => {
  const store = new Map<string, string>();
  return {
    localStorageStub: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => void store.clear(),
    },
  };
});
vi.stubGlobal("localStorage", localStorageStub);

const { default: DemoApp } = await import("./DemoApp");

let sitRendered = false;

vi.mock("../components/features/sit/SitProcessConsole", () => ({
  SitProcessConsole: () => {
    sitRendered = true;
    return <div data-testid="sit-process-console" />;
  },
}));

vi.mock("../components/modals/PasswordWarningModal", () => ({
  PasswordWarningModal: () => null,
}));

vi.mock("sonner", () => ({
  Toaster: () => null,
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("DemoApp /sit route", () => {
  it("renders the dedicated SitProcessConsole", async () => {
    window.history.pushState({}, "", "/sit");

    render(<DemoApp />);
    // SitProcessConsole is lazy-loaded; flush the suspense resolution.
    await act(async () => {});

    expect(sitRendered).toBe(true);
  });
});
