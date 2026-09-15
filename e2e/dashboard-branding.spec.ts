import { test, expect } from "@playwright/test";

// W Labs admin branding + custom dashboard (beforeDashboard). Read-only spec:
// never visits /create (no autosave-draft leakage) and mutates nothing.
test("dashboard shows W Labs welcome, quick actions, recent posts (ko)", async ({
  page,
}) => {
  await page.goto("/admin");

  await expect(
    page.getByRole("heading", { name: "W Labs 블로그 관리" }),
  ).toBeVisible();

  const newPost = page.getByRole("link", { name: "새 글 쓰기" });
  await expect(newPost).toHaveAttribute(
    "href",
    "/admin/collections/posts/create",
  );

  await expect(page.getByRole("heading", { name: "최근 글" })).toBeVisible();
  const items = page.locator(".wlabs-dashboard__recent li");
  await expect(items.first()).toBeVisible(); // seed guarantees posts exist
  expect(await items.count()).toBeLessThanOrEqual(5);
  await expect(items.first().locator("a")).toHaveAttribute(
    "href",
    /\/admin\/collections\/posts\/\d+/,
  );
  await expect(page.locator(".wlabs-status").first()).toBeVisible();

  // The stock collection cards still render below (augment, not replace).
  await expect(page.locator(".dashboard")).toBeVisible();

  // admin.meta.titleSuffix — "대시보드 - W Labs"
  await expect(page).toHaveTitle(/W Labs$/);
});

test.describe("login branding (unauthenticated)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("login page keeps form contract and W Labs title suffix", async ({
    page,
  }) => {
    await page.goto("/admin/login");
    // auth.setup.ts contract must stay intact
    await expect(page.locator("form.login__form")).toBeVisible();
    // graphics are stock Payload again; only meta branding remains
    await expect(page).toHaveTitle(/W Labs$/);
  });
});
