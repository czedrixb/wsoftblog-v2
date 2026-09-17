import { test, expect } from "@playwright/test";

// WOS-320 follow-up: the ?locale=ko|en param has been wired end-to-end
// through the data layer and the wire-compat API for a while, but until now
// there was no visible control on the public site to set it. This toggle
// switches interface chrome only (nav labels, pagination, empty state,
// byline fallback) — post title/excerpt/body always render the Korean
// base fields, never the `*En` admin fields. See src/lib/locale.ts `pick`
// for the API's (separate, content-switching) use of the same *En fields.
test.describe("reader-facing language toggle", () => {
  test("defaults to Korean chrome with no ?locale param", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("1페이지 중 1페이지")).toBeVisible();
    await expect(page.getByRole("link", { name: "이전" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "다음" })).toHaveCount(0);

    const koLink = page.getByRole("link", { name: "한국어" });
    await expect(koLink).toHaveAttribute("aria-current", "true");
  });

  test("switching to English changes chrome but not post content", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "English" }).click();
    await expect(page).toHaveURL(/\?locale=en/);

    // Chrome switched.
    await expect(page.getByText("Page 1 of 1")).toBeVisible();
    await expect(page.getByRole("link", { name: "English" })).toHaveAttribute(
      "aria-current",
      "true",
    );

    // Content did not: the seeded post title stays Korean under ?locale=en.
    await expect(
      page.getByRole("heading", { name: "편집자를 위한 발행 워크플로우" }),
    ).toBeVisible();
  });

  test("locale survives clicking through to a post, content stays Korean", async ({ page }) => {
    await page.goto("/?locale=en");

    await page
      .locator("a", { hasText: "편집자를 위한 발행 워크플로우" })
      .click();

    await expect(page).toHaveURL(/\/posts\/publishing-workflow-for-editors\?locale=en/);

    // Chrome (the header toggle) reflects English on the detail page too.
    await expect(page.getByRole("link", { name: "English" })).toHaveAttribute(
      "aria-current",
      "true",
    );

    // Post heading and body remain Korean.
    await expect(
      page.getByRole("heading", { name: "편집자를 위한 발행 워크플로우" }),
    ).toBeVisible();
    await expect(page.locator("article")).toContainText("이메일과 비밀번호로 로그인하여");
  });

  test.describe("locale aliases and unknown values resolve to Korean", () => {
    // "kr" is a wire-compat alias for "ko" (resolveLocale's ALIASES map,
    // matching the old Laravel SetLocale middleware); "garbage" is simply
    // unrecognized and falls through to the default.
    for (const value of ["kr", "garbage"]) {
      test(`?locale=${value}`, async ({ page }) => {
        await page.goto(`/?locale=${value}`);
        await expect(page.getByText("1페이지 중 1페이지")).toBeVisible();
        await expect(page.getByRole("link", { name: "한국어" })).toHaveAttribute(
          "aria-current",
          "true",
        );
      });
    }
  });
});
