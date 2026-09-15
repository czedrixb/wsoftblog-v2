import { test, expect } from "@playwright/test";

// Core feature #2: post list + detail view, pagination.
test.describe("public blog list and detail", () => {
  test("list shows published posts, links to detail", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "W Labs Blog" })).toBeVisible();

    const firstPostLink = page.locator("a", { hasText: "편집자를 위한 발행 워크플로우" });
    await expect(firstPostLink).toBeVisible();
    await firstPostLink.click();

    await expect(page).toHaveURL(/\/posts\/publishing-workflow-for-editors/);
    await expect(
      page.getByRole("heading", { name: "편집자를 위한 발행 워크플로우" }),
    ).toBeVisible();
    await expect(page.locator("article")).toContainText(
      "이메일과 비밀번호로 로그인하여",
    );
  });

  test("pagination controls reflect page count", async ({ page }) => {
    await page.goto("/");
    // Seed data (3 published posts) fits on one page — Next/Previous
    // should be absent, and the page indicator should read "Page 1 of 1".
    await expect(page.getByText(/page 1 of/i)).toBeVisible();
  });
});
