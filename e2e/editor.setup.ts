import { test as setup, expect } from "@playwright/test";

const EDITOR_EMAIL = process.env.SEED_EDITOR_EMAIL || "editor@wsoftlabs.dev";
const EDITOR_PASSWORD = process.env.SEED_EDITOR_PASSWORD || "changeme-editor-123";
const authFile = "e2e/.auth/editor.json";

setup("authenticate as seeded editor", async ({ page }) => {
  await page.goto("/admin/login");
  await page.locator("#field-email").fill(EDITOR_EMAIL);
  await page.locator("#field-password").fill(EDITOR_PASSWORD);
  await page.locator("form.login__form").getByRole("button").click();
  await expect(page).toHaveURL(/\/admin(\/collections\/posts)?$/, { timeout: 15_000 });
  await page.goto("/admin/collections/posts");
  await expect(page.getByRole("heading", { name: "포스트" })).toBeVisible({ timeout: 15_000 });
  await page.context().storageState({ path: authFile });
});
