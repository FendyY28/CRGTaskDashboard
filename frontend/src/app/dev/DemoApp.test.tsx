import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import DemoApp from "./DemoApp";
import { SDLC_PHASES } from "../constants/projectConstants";

const consoleProps: Array<{ phase: string; ns: string }> = [];

vi.mock("../components/features/testing/TestingConsole", () => ({
  TestingConsole: ({ phase, ns }: { phase: string; ns: string }) => {
    consoleProps.push({ phase, ns });
    return <div data-testid="testing-console" />;
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
  it("renders TestingConsole with the SIT phase and sit namespace", () => {
    consoleProps.length = 0;
    window.history.pushState({}, "", "/sit");

    render(<DemoApp />);

    expect(consoleProps).toContainEqual({
      phase: SDLC_PHASES.SIT,
      ns: "sit",
    });
  });
});
