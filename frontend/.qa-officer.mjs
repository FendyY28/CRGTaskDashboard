import { probe, scrollTo } from "./qa/flows/testing-view.js";

/** Verifies the sticky header and row layout on the Testing page as an OFFICER. */
export default async function run(page) {
  await page.setViewportSize({ width: 1440, height: 800 });

  await page.evaluate(() => {
    localStorage.setItem(
      "auth_token",
      "demo." +
        btoa(
          JSON.stringify({
            sub: "u-officer",
            role: "OFFICER",
            exp: Math.floor(Date.now() / 1000) + 86400,
          }),
        ) +
        ".sig",
    );
    localStorage.setItem("user_role", "OFFICER");
    localStorage.setItem("user_name", "Rizky Pratama");
    localStorage.setItem("user_email", "officer@crg.demo");
    localStorage.setItem("password_changed_at", new Date().toISOString());
  });

  await page.goto("http://localhost:5199/demo.html/testing", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector("text=UAT Execution Console", { timeout: 15000 });
  await page.waitForTimeout(1200);

  const atTop = await probe(page);
  const scrolled = await scrollTo(page, 900, 600);

  return { atTop, scrolled };
}
