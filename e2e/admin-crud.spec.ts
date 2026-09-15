import { test, expect } from "@playwright/test";

// Core feature #1: create / edit / delete posts from the admin UI.
//
// Selectors use Payload's own stable element ids (field-<path>,
// action-save-draft, action-save, action-delete, confirm-action) rather
// than button text or aria labels — the admin renders in Korean by default
// (WOS-312 §5), so English text/label matching would never find anything.
//
// Historical note: this spec was `test.fixme()` for a while because admin
// saves 403'd under a production build. Root cause was never Payload/Next —
// Payload pushes `serverURL` into its CSRF origin allowlist, and the prod
// server ran on a port that didn't match NEXT_PUBLIC_SERVER_URL, so the
// PATCH's Origin header got the auth cookie discarded. Fixed by aligning
// NEXT_PUBLIC_SERVER_URL with the served origin (playwright.config.ts
// webServer env) and adding an explicit `csrf` list in payload.config.ts.
test.describe("admin post CRUD", () => {
  const title = `E2E Test Post ${Date.now()}`;
  const updatedTitle = `${title} (edited)`;

  test("create, edit, then delete a post", async ({ page }) => {
    await page.goto("/admin/collections/posts/create");

    await page.locator("#field-title").fill(title);
    await page.waitForTimeout(400); // let Form's 250ms debounced state sync land before saving
    await page.locator("#action-save-draft").click();
    await expect(page).toHaveURL(/\/admin\/collections\/posts\/\d+$/, { timeout: 15_000 });
    await expect(page.locator(".status__value")).toHaveText("초안");

    // Reload before editing: a fresh page load settles any in-flight
    // autosave/save-state from the create step (this is also closer to
    // real editor behaviour — nobody edits mid-keystroke of their own save).
    await page.reload();
    await expect(page.locator("#field-title")).toHaveValue(title);

    // Edit, then reload again to prove it actually persisted server-side.
    await page.locator("#field-title").fill(updatedTitle);
    await page.waitForTimeout(400);
    await page.locator("#action-save-draft").click();
    await page.waitForTimeout(1500);
    await page.reload();
    await expect(page.locator("#field-title")).toHaveValue(updatedTitle);

    // Delete, via the "..." document actions menu.
    await page.locator(".doc-controls__popup").getByRole("button").click();
    await page.locator("#action-delete").click();
    await page.locator("#confirm-action").click();
    await expect(page).toHaveURL(/\/admin\/collections\/posts(\?|$)/, { timeout: 15_000 });
    await expect(page.getByText(updatedTitle)).toHaveCount(0);
  });
});
