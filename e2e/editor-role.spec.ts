import { test, expect } from "@playwright/test";

// WOS-320 — the admin is trimmed to what an author needs. These tests run
// with the EDITOR storage state (chromium-editor project), not the admin one.

test("editor sees authoring collections only — no 사용자, no API tab", async ({ page }) => {
  await page.goto("/admin/collections/posts");
  await expect(page.getByRole("heading", { name: "포스트" })).toBeVisible();
  // Media stays: authors upload banner images themselves.
  await expect(page.getByRole("link", { name: "미디어" })).toBeVisible();
  // Users is admin.hidden for editors — gone from the nav entirely.
  await expect(page.getByRole("link", { name: "사용자" })).toHaveCount(0);
});

test("post edit screen: content sits directly under title with a fixed toolbar", async ({
  page,
  baseURL,
}) => {
  await page.goto("/admin/collections/posts/create");
  await expect(page.locator("#field-title")).toBeVisible();

  // The rich text editor is field #2, right below the title.
  const titleBox = await page.locator("#field-title").boundingBox();
  const contentBox = await page.locator(".rich-text-lexical").first().boundingBox();
  expect(titleBox).not.toBeNull();
  expect(contentBox).not.toBeNull();
  expect(contentBox!.y).toBeGreaterThan(titleBox!.y);

  // Persistent (fixed) toolbar is visible without selecting any text.
  await expect(page.locator(".fixed-toolbar")).toBeVisible();

  // Extras are tucked into a collapsed 추가 정보 section below the editor.
  const collapsible = page.getByText("추가 정보").first();
  await expect(collapsible).toBeVisible();
  const collapsibleBox = await collapsible.boundingBox();
  expect(collapsibleBox!.y).toBeGreaterThan(contentBox!.y);

  // The dev-only API tab is hidden on posts.
  await expect(page.getByRole("link", { name: "API" })).toHaveCount(0);

  // Visiting /create with autosave enabled leaves an empty draft behind (the
  // create view becomes a real doc after ~2s; navigating away doesn't remove
  // it). Close the page first so autosave can't re-create anything, then
  // sweep every untitled empty draft — including the ones the older admin
  // specs leak on their own /create visits. The Origin header satisfies
  // Payload's CSRF check for cookie-authed writes.
  await page.close();
  const ctx = page.context().request;
  const origin = { Origin: baseURL! };
  const found = await (
    await ctx.get(
      "/api/posts?where[title][exists]=false&where[_status][equals]=draft&limit=100&depth=0",
      { headers: origin },
    )
  ).json();
  for (const doc of found.docs ?? []) {
    await ctx.delete(`/api/posts/${doc.id}`, { headers: origin });
  }
});
