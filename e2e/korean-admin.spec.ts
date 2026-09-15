import { test, expect } from "@playwright/test";

// WOS-312 §5/§6 — non-devs publish unaided, in Korean, from day one.
test("admin UI renders in Korean by default", async ({ page }) => {
  await page.goto("/admin/collections/posts");
  await expect(page.getByRole("heading", { name: "포스트" })).toBeVisible();
  await expect(page.getByRole("link", { name: "미디어" })).toBeVisible();
  await expect(page.getByRole("link", { name: "사용자" })).toBeVisible();
});
