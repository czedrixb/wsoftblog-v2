import { test, expect } from "@playwright/test";

// WOS-320 follow-up: authors used to write Korean, then have to find and
// flip the sticky per-user locale switcher to write English — that read as
// "my English text vanished" (the same class of bug as the earlier
// "published but empty" issue). Posts.title/content/excerpt are no longer
// Payload-localized; ko and en now live side by side as two tabs on one
// screen, so there is nothing to switch.
test.describe("Korean/English tabs replace the locale switcher", () => {
  const koTitle = `E2E 탭 테스트 ${Date.now()}`;
  const enTitle = `E2E tab test ${Date.now()}`;

  test("both language tabs are editable on one screen, with no locale switcher", async ({
    page,
  }) => {
    await page.goto("/admin/collections/posts/create");

    // The locale switcher this replaces is gone entirely.
    await expect(page.locator(".localizer")).toHaveCount(0);

    // Scoped by Payload's tabs-field class — the admin header now also has
    // a 한국어/English language toggle (payload.config.ts admin.components
    // .actions), which shares these accessible names.
    const koTab = page.locator("button.tabs-field__tab-button", { hasText: "한국어" });
    const enTab = page.locator("button.tabs-field__tab-button", { hasText: "English" });
    await expect(koTab).toBeVisible();
    await expect(enTab).toBeVisible();

    // Korean tab is active by default; fill it without switching anything.
    await page.locator("#field-title").fill(koTitle);
    await page.waitForTimeout(400);

    // Switch to the English tab on the SAME screen and fill it too.
    await enTab.click();
    await page.locator("#field-titleEn").fill(enTitle);
    await page.waitForTimeout(400);

    await page.locator("#action-save-draft").click();
    await expect(page).toHaveURL(/\/admin\/collections\/posts\/\d+$/, { timeout: 15_000 });

    // Reload to prove both values persisted server-side, not just in the form.
    await page.reload();
    await koTab.click();
    await expect(page.locator("#field-title")).toHaveValue(koTitle);
    await enTab.click();
    await expect(page.locator("#field-titleEn")).toHaveValue(enTitle);

    // Clean up via the "..." document actions menu.
    await page.locator(".doc-controls__popup").getByRole("button").click();
    await page.locator("#action-delete").click();
    await page.locator("#confirm-action").click();
    await expect(page).toHaveURL(/\/admin\/collections\/posts(\?|$)/, { timeout: 15_000 });
  });
});
