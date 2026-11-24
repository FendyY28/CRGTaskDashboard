import { describe, it, expect } from "vitest";

import { toDisplay, toPayload } from "./SitProcessConsole";
import type { SitProcessRecord } from "./SitProcessConsole";

const fixedRow: SitProcessRecord = {
  id: "fixed:envSetup",
  key: "envSetup",
  name: "envSetup",
  status: "done",
  order: 0,
  createdBy: "System",
  updatedBy: "alice@bsi.co.id",
};

const dynamicRow: SitProcessRecord = {
  id: "dyn-1718000000000-abc12",
  key: null,
  name: "Smoke Test Vendor",
  status: "failed",
  order: 3,
  createdBy: "bob@bsi.co.id",
  updatedBy: null,
};

describe("toDisplay", () => {
  it("keeps the locale key for fixed steps so the label can be translated", () => {
    const display = toDisplay(fixedRow);
    expect(display).toMatchObject({
      id: "fixed:envSetup",
      key: "envSetup",
      name: "envSetup",
      dynamic: false,
      status: "done",
      order: 0,
      updatedBy: "alice@bsi.co.id",
    });
  });

  it("uses the stored name for dynamic steps and flags them as dynamic", () => {
    const display = toDisplay(dynamicRow);
    expect(display.dynamic).toBe(true);
    expect(display.name).toBe("Smoke Test Vendor");
    expect(display.key).toBeNull();
    expect(display.status).toBe("failed");
  });
});

describe("toPayload", () => {
  it("sends the process key as name for fixed steps", () => {
    expect(toPayload(toDisplay(fixedRow), 2)).toEqual({
      id: "fixed:envSetup",
      key: "envSetup",
      name: "envSetup",
      status: "done",
      order: 2,
    });
  });

  it("sends the custom label as name for dynamic steps", () => {
    expect(toPayload(toDisplay(dynamicRow), 0)).toEqual({
      id: "dyn-1718000000000-abc12",
      key: null,
      name: "Smoke Test Vendor",
      status: "failed",
      order: 0,
    });
  });

  it("round-trips a record through display and payload", () => {
    const display = toDisplay(dynamicRow);
    const payload = toPayload(display, display.order);
    expect(payload).toMatchObject({
      id: dynamicRow.id,
      name: dynamicRow.name,
      status: dynamicRow.status,
      order: dynamicRow.order,
    });
  });
});
