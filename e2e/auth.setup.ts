import { test as setup, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@wsoftlabs.dev";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "changeme-admin-123";
const authFile = "e2e/.auth/admin.json";

setup("authenticate as seeded admin", async ({ page }) => {
  await page.goto("/admin/login");
  await page.locator("#field-email").fill(ADMIN_EMAIL);
  await page.locator("#field-password").fill(ADMIN_PASSWORD);
  await page.locator("form.login__form").getByRole("button").click();
  await expect(page).toHaveURL(/\/admin(\/collections\/posts)?$/, { timeout: 15_000 });
  await page.goto("/admin/collections/posts");
  await expect(page.getByRole("heading", { name: "포스트" })).toBeVisible({ timeout: 15_000 });
  await page.context().storageState({ path: authFile });
});
