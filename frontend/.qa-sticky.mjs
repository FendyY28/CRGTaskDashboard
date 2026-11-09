import { probe, scrollTo } from "./qa/flows/testing-view.js";

/** Checks the Testing page header stays pinned while the list scrolls. */
export default async function run(page) {
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.evaluate(() => {
    history.pushState({}, "", "/testing");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await page.waitForSelector("text=UAT Execution Console", { timeout: 15000 });
  await page.waitForTimeout(800);

  const atTop = await probe(page);
  const scrolled = await scrollTo(page, 1200);

  return { atTop, scrolled };
}
