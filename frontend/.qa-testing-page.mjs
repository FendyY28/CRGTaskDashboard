/** Opens the Testing page in the demo build and reports what rendered. */
export default async function run(page, ui) {
  // Client-side navigation: the demo app redirects unknown paths to /dashboard,
  // so pushing the route and re-dispatching popstate is the reliable way in.
  await page.evaluate(() => {
    history.pushState({}, "", "/testing");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await page.waitForSelector("text=UAT Execution Console", { timeout: 15000 });
  await page.waitForTimeout(600);

  const probe = async () =>
    page.evaluate(() => {
      const buttons = [...document.querySelectorAll("button")].map((b) =>
        (b.getAttribute("aria-label") || b.textContent || "").trim(),
      );
      return {
        path: location.pathname,
        rows: document.querySelectorAll('[data-testid^="test-case-row"]').length,
        filters: buttons.filter((t) =>
          [
            "All",
            "Semua",
            "Pending",
            "Tertunda",
            "Passed",
            "Lulus",
            "Failed",
            "Gagal",
          ].some((f) => t.startsWith(f)),
        ),
        densityToggle: buttons.find((t) => t.startsWith("Switch to")) ?? null,
        search:
          document.querySelector("input[placeholder]")?.placeholder ?? null,
        bodyChars: document.body.innerText.length,
      };
    });

  const initial = await probe();

  // Filter to Pending via its chip, then report row counts.
  const pendingChip = page
    .getByRole("button", { name: /^(Pending|Tertunda)\s/ })
    .first();
  await pendingChip.click();
  await page.waitForTimeout(400);
  const afterFilter = await probe();

  // Search for something that cannot match, expect the empty state.
  const search = page.locator("input[placeholder]").first();
  await search.fill("zzz-no-such-test-case");
  await page.waitForTimeout(400);
  const noResults = await page.evaluate(
    () =>
      document.body.innerText.includes(
        "No test cases match your search or filter.",
      ) || document.body.innerText.includes("Tidak ada kasus uji yang cocok"),
  );

  await search.fill("");
  await page.waitForTimeout(300);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await page.screenshot({ path: "testing-page-after.png", fullPage: false });

  return {
    initial,
    afterFilter,
    noResults,
  };
}
