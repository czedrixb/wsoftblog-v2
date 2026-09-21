import { test, expect } from "@playwright/test";

// Admin chrome language used to only be changeable from Account > Payload
// Settings > Language — no quick control in the header. This adds a
// 한국어 | English toggle to the top-right actions slot (payload.config.ts
// admin.components.actions), using the same useTranslation().switchLanguage
// Payload's own LanguageSelector uses.
//
// Runs before korean-admin.spec.ts alphabetically and shares its storage
// state, so it must leave the account language back on Korean when done —
// otherwise that spec's "Korean by default" assumption breaks.
test("admin header language toggle switches chrome without visiting Account", async ({
  page,
}) => {
  await page.goto("/admin");

  const koToggle = page.getByRole("button", { name: "한국어" });
  const enToggle = page.getByRole("button", { name: "English" });
  await expect(koToggle).toBeVisible();
  await expect(enToggle).toBeVisible();

  // Scoped by Payload's own #nav-* ids — the dashboard also renders "Media"/
  // "Users" as collection-card links, which makes name-only role queries
  // ambiguous here (unlike korean-admin.spec.ts, which checks the list view).
  try {
    await enToggle.click();
    await expect(page.locator("#nav-media")).toHaveText("Media");
    await expect(page.locator("#nav-users")).toHaveText("Users");
    await expect(enToggle).toHaveAttribute("aria-current", "true");

    await koToggle.click();
    await expect(page.locator("#nav-media")).toHaveText("미디어");
    await expect(page.locator("#nav-users")).toHaveText("사용자");
    await expect(koToggle).toHaveAttribute("aria-current", "true");
  } finally {
    // Always land back on Korean, pass or fail, for korean-admin.spec.ts.
    if ((await koToggle.getAttribute("aria-current")) !== "true") {
      await koToggle.click();
    }
  }
});
