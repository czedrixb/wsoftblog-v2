import { test, expect } from "@playwright/test";
import path from "path";

// WOS-329 DB resilience: posts are served through unstable_cache
// (src/lib/cachedPosts.ts) and (frontend)/error.tsx replaces Next's raw
// production 500 when Postgres is unreachable.

const SCREENSHOT_DIR = process.env.E2E_SCREENSHOT_DIR || "e2e/screenshots";
// A second `next start` of the same build, pointed at an unreachable
// DATABASE_URI — set by the runner; the boundary test is skipped without it.
const DB_DOWN_URL = process.env.E2E_DB_DOWN_URL;

test.describe("posts served through the data cache", () => {
  test("homepage renders the posts list", async ({ page }) => {
    await page.goto("/");
    const items = page.locator("main ul > li");
    await expect(items.first()).toBeVisible({ timeout: 20_000 });
    expect(await items.count()).toBeGreaterThan(0);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "after-homepage.png"),
      fullPage: false,
    });
  });

  test("post detail renders through getPostBySlug", async ({ page }) => {
    await page.goto("/");
    const firstPost = page.locator("main ul > li a").first();
    await expect(firstPost).toBeVisible({ timeout: 20_000 });
    await firstPost.click();
    await expect(page).toHaveURL(/\/posts\//);
    await expect(page.locator("article")).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("when Postgres is down", () => {
  test.skip(!DB_DOWN_URL, "E2E_DB_DOWN_URL not set");

  test("a previously cached page still renders", async ({ page }) => {
    // The DB-down server shares .next (and so the data cache) with the
    // healthy one — a page cached before the outage keeps working through it.
    await page.goto(DB_DOWN_URL!, { timeout: 60_000 });
    await expect(page.locator("main ul > li").first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("an uncached page shows the friendly retry page instead of a raw 500", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    // page=97 has never been requested, so the data cache misses and the
    // query hits the unreachable DB.
    await page.goto(`${DB_DOWN_URL}?page=97`, { timeout: 90_000 });
    await expect(
      page.getByRole("heading", { name: "일시적인 오류가 발생했습니다" }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(
      page.getByRole("button", { name: /다시 시도/ }),
    ).toBeVisible();
    // Next's default production error page must NOT be what renders.
    await expect(page.getByText("A server error occurred")).toHaveCount(0);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "after-error-boundary.png"),
      fullPage: false,
    });
  });
});
