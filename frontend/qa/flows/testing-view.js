/** Reusable, page-agnostic steps for inspecting the Testing monitor view. */

/** Stable selectors owned by the tests, not by Tailwind classes. */
export const TESTING = {
  stickyHeader: '[data-testid="testing-sticky-header"]',
  row: '[data-testid^="test-case-row"]',
};

/** Runs in the browser: snapshots the sticky header, first row and action buttons. */
function snapshotInPage({ stickyHeader, row }) {
  const stickyEl = document.querySelector(stickyHeader);
  const rect = stickyEl?.getBoundingClientRect();
  const rowEl = document.querySelector(row);
  const rowStyle = rowEl ? getComputedStyle(rowEl) : null;
  const labels = [...document.querySelectorAll("button")].map((b) => b.textContent?.trim());

  return {
    stickyFound: Boolean(stickyEl),
    rowFound: Boolean(rowEl),
    scrollY: Math.round(window.scrollY),
    docHeight: Math.round(document.documentElement.scrollHeight),
    stickyTop: rect ? Math.round(rect.top) : null,
    stickyHeight: rect ? Math.round(rect.height) : null,
    rowPadding: rowStyle ? `${rowStyle.paddingTop}/${rowStyle.paddingBottom}` : null,
    passButtons: labels.filter((t) => t === "Pass").length,
    failButtons: labels.filter((t) => t === "Fail").length,
    addButton: labels.some((t) => t === "Add Test Case"),
  };
}

/** Measures the Testing page and throws when the expected elements are missing. */
export async function probe(page) {
  const state = await page.evaluate(snapshotInPage, TESTING);

  if (!state.stickyFound) throw new Error(`Sticky header not found (${TESTING.stickyHeader})`);
  if (!state.rowFound) throw new Error(`Test case row not found (${TESTING.row})`);
  return state;
}

/** Runs an interaction, lets the UI settle, then measures. */
export async function measureAfter(page, action, settleMs = 500) {
  await action();
  await page.waitForTimeout(settleMs);
  return probe(page);
}

/** Scrolls to a document offset and measures the resulting page state. */
export function scrollTo(page, y, settleMs = 500) {
  return measureAfter(page, () => page.evaluate((top) => window.scrollTo(0, top), y), settleMs);
}


