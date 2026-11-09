import { fileURLToPath } from "node:url";
import { probe, scrollTo } from "./qa/flows/testing-view.js";

/** Clicks the Testing nav link and measures the sticky header while scrolling. */
export default async function run(page) {
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.getByRole("link", { name: "Testing" }).click();
  await page.waitForSelector("text=UAT Execution Console", { timeout: 15000 });
  await page.waitForTimeout(1200);

  const atTop = await probe(page);
  const scrolled = await scrollTo(page, 700);

  await scrollTo(page, 0, 300);
  await page.screenshot({ path: fileURLToPath(new URL("./testing-scrolled.png", import.meta.url)) });

  return { atTop, scrolled };
}
