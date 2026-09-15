import { test, expect } from "@playwright/test";

// Core feature #3: published / unpublished toggle — a draft must be
// invisible on every public surface, and visible the moment it's published.
// Self-contained: creates and cleans up its own post so it never perturbs
// the seeded-data assumptions other specs make (e.g. "3 published posts").
//
// (Previously test.fixme() due to the prod-only save failure — a CSRF origin
// mismatch, see the note in admin-crud.spec.ts. Fixed in payload.config.ts /
// playwright.config.ts.)
test("draft is hidden everywhere, publishing makes it appear", async ({ page }) => {
  const title = `E2E Publish Toggle ${Date.now()}`;

  await page.goto("/admin/collections/posts/create");
  await page.locator("#field-title").fill(title);
  await page.waitForTimeout(400); // let Form's 250ms debounced state sync land before saving
  await page.locator("#action-save-draft").click();
  await expect(page).toHaveURL(/\/admin\/collections\/posts\/\d+$/, { timeout: 15_000 });
  await expect(page.locator(".status__value")).toHaveText("초안");

  // The slug is computed server-side (beforeValidate hook); reload so the
  // form shows persisted state rather than racing the save response.
  await page.reload();
  await expect(page.locator("#field-slug")).not.toHaveValue("");
  const slug = await page.locator("#field-slug").inputValue();
  expect(slug).toBeTruthy();
  const docId = page.url().match(/posts\/(\d+)/)?.[1];
  expect(docId).toBeTruthy();

  // Still a draft: absent from the wire list, 404 on wire detail and the
  // public detail page.
  const listWhileDraft = await page.request.get("/api/getPosts");
  expect((await listWhileDraft.json()).some((p: { slug: string }) => p.slug === slug)).toBe(
    false,
  );
  expect((await page.request.get(`/api/getPost/${slug}`)).status()).toBe(404);
  expect((await page.request.get(`/posts/${slug}`)).status()).toBe(404);

  // Publish.
  await page.locator("#action-save").click();
  await expect(page.locator(".status__value")).toHaveText("게시됨", { timeout: 15_000 });

  const listWhilePublished = await page.request.get("/api/getPosts");
  expect(
    (await listWhilePublished.json()).some((p: { slug: string }) => p.slug === slug),
  ).toBe(true);
  expect((await page.request.get(`/api/getPost/${slug}`)).status()).toBe(200);
  await page.goto(`/posts/${slug}`);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  // Cleanup.
  await page.goto(`/admin/collections/posts/${docId}`);
  await page.locator(".doc-controls__popup").getByRole("button").click();
  await page.locator("#action-delete").click();
  await page.locator("#confirm-action").click();
});
