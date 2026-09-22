import sharp from "sharp";
import { test, expect } from "@playwright/test";

// WOS-329: /admin/collections/media/create 500'd in production. Root cause
// was a deploy mismatch, not a code bug — Vercel's Production Branch was
// still pre-merge `main` (plugins: [] in src/payload.config.ts, no
// s3Storage), so Payload's upload handler always attempted a local-disk
// write (Media.ts's staticDir), which throws ENOENT on Vercel's read-only
// filesystem. The failing request is the admin's create submit, POST
// /api/media?depth=0&fallback-locale=null — the browser console prints the
// URL without the method, which read like the list GET was failing when it
// was actually always 200.
//
// This spec proves the full upload round trip through whichever storage
// backend is actually configured for the target server: local disk when
// S3_BUCKET is unset (the VM), Supabase S3 when it is set (Vercel). A real
// 2000x1200 source (generated here, not a checked-in fixture) is required to
// make Payload actually generate the `thumbnail` (400x300) and `banner`
// (1600x900) imageSizes — banner-image.spec.ts's 1x1 fixture skips size
// generation entirely and would leave the cloud-storage adapter's extra
// putObject calls untested.

test("media upload succeeds and the admin media views render", async ({ page, baseURL }) => {
  const api = page.context().request;
  const origin = { Origin: baseURL! };
  const alt = `wos-329 업로드 확인 ${Date.now()}`;
  const bannerPng = await sharp({
    create: { width: 2000, height: 1200, channels: 3, background: { r: 90, g: 130, b: 200 } },
  })
    .png()
    .toBuffer();

  // The create screen itself 500'd for the user — assert the status, not
  // just that something rendered.
  const createNav = await page.goto("/admin/collections/media/create");
  expect(createNav?.status()).toBe(200);
  await expect(page.locator("#field-alt")).toBeVisible();

  // The exact request shape the admin submits, query string included.
  const res = await api.post("/api/media?depth=0&fallback-locale=null", {
    headers: origin,
    multipart: {
      file: { name: "wos-329.png", mimeType: "image/png", buffer: bannerPng },
      _payload: JSON.stringify({ alt }),
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  const doc = (await res.json()).doc;

  try {
    expect(typeof doc.alt).toBe("string");
    expect(doc.filename).toBeTruthy();
    // Each size is a separate write (a separate putObject on the S3
    // adapter) — confirms the 2000x1200 source actually triggered both.
    expect(doc.sizes?.thumbnail?.filename).toBeTruthy();
    expect(doc.sizes?.banner?.filename).toBeTruthy();

    // Confirms bytes are actually retrievable, whichever storage backend the
    // target server uses (local disk or the cloud-storage adapter).
    for (const filename of [doc.filename, doc.sizes.thumbnail.filename, doc.sizes.banner.filename]) {
      const file = await api.get(`/api/media/file/${encodeURIComponent(filename)}`);
      expect(file.status(), `GET /api/media/file/${filename}`).toBe(200);
      expect(Number(file.headers()["content-length"] ?? 0)).toBeGreaterThan(0);
    }

    const list = await api.get("/api/media?depth=0&fallback-locale=null", { headers: origin });
    expect(list.status()).toBe(200);
    expect((await list.json()).totalDocs).toBeGreaterThan(0);

    const listNav = await page.goto("/admin/collections/media");
    expect(listNav?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "미디어" })).toBeVisible();
    await expect(page.getByText(alt)).toBeVisible({ timeout: 15_000 });

    // playwright.config.ts sets screenshot: "only-on-failure", so the
    // passing "after" evidence has to be captured explicitly.
    await page.screenshot({ path: "test-results/wos-329-after-media-list.png", fullPage: true });
  } finally {
    await api.delete(`/api/media/${doc.id}`, { headers: origin });
  }
});
