import { probe, scrollTo } from "./qa/flows/testing-view.js";

/** Injects a long test-case list via the demo API, then checks the sticky header. */
export default async function run(page) {
  await page.setViewportSize({ width: 1440, height: 800 });

  const seed = await page.evaluate(async () => {
    let created = 0;
    for (let i = 0; i < 40; i++) {
      const res = await fetch("/project/test-cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + (localStorage.getItem("auth_token") || ""),
        },
        body: JSON.stringify({
          projectId: "PRJ-003",
          title: "Bulk scenario " + (i + 1) + " — reconciliation export check",
          type: i % 2 ? "negative" : "positive",
        }),
      });
      if (res.ok) created++;
    }
    return { created };
  });

  await page.getByRole("link", { name: "Testing" }).click();
  await page.waitForSelector("text=UAT Execution Console", { timeout: 15000 });
  await page.waitForTimeout(1500);

  const atTop = await probe(page);
  const scrolled = await scrollTo(page, 1500, 600);

  return { seed, atTop, scrolled };
}
