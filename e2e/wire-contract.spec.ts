import { test, expect } from "@playwright/test";

// Core feature #4: data fetching -> frontend display, independent of the
// news component. Asserts the wire-compat contract WOS-314 depends on:
// same field names/casing the old Laravel `PostResource` used, so
// wsoftlabs-website-v2's Nuxt proxies can point here by only flipping
// NUXT_BLOG_API_BASE.
test.describe("wire-compat API (/api/getPosts, /api/getPost/:id)", () => {
  test("getPosts returns a flat, snake_case, paginated-safe list", async ({ request }) => {
    const res = await request.get("/api/getPosts");
    expect(res.status()).toBe(200);
    const posts = await res.json();
    expect(Array.isArray(posts)).toBe(true);
    expect(posts.length).toBeGreaterThan(0);

    const post = posts[0];
    expect(typeof post.id).toBe("number");
    expect(typeof post.title).toBe("string"); // never {"en":..,"ko":..}
    expect(typeof post.slug).toBe("string");
    expect("published_at" in post).toBe(true);
    expect("banner_url" in post).toBe(true);
    expect("content" in post).toBe(false); // list omits full bodies
  });

  test("getPost/:slug and getPost/:id resolve the same post", async ({ request }) => {
    const list = await (await request.get("/api/getPosts")).json();
    const target = list[0];

    const bySlug = await (await request.get(`/api/getPost/${target.slug}`)).json();
    expect(bySlug.id).toBe(target.id);
    expect(typeof bySlug.content).toBe("string"); // detail includes HTML content

    const byId = await (await request.get(`/api/getPost/${target.id}`)).json();
    expect(byId.slug).toBe(target.slug);
  });

  test("getPost/:id 404s for an unknown post", async ({ request }) => {
    const res = await request.get("/api/getPost/not-a-real-slug-xyz");
    expect(res.status()).toBe(404);
  });

  test("?locale=en switches the title language", async ({ request }) => {
    const list = await (
      await request.get("/api/getPosts?locale=en")
    ).json();
    const enTitles = list.map((p: { title: string }) => p.title);
    expect(enTitles).toContain("Publishing Workflow for Editors");
  });

  test("?locale=ko returns the Korean title", async ({ request }) => {
    const list = await (
      await request.get("/api/getPosts?locale=ko")
    ).json();
    const koTitles = list.map((p: { title: string }) => p.title);
    expect(koTitles).toContain("편집자를 위한 발행 워크플로우");
  });

  test("a post with no English translation still returns its Korean title under ?locale=en", async ({
    request,
    baseURL,
  }) => {
    const origin = { Origin: baseURL! };
    const slug = "e2e-ko-only-fallback";

    // Clean any leftovers from a previous aborted run.
    const stale = await (
      await request.get(`/api/posts?where[slug][equals]=${slug}&depth=0`, { headers: origin })
    ).json();
    for (const doc of stale.docs ?? []) {
      await request.delete(`/api/posts/${doc.id}`, { headers: origin });
    }

    const createRes = await request.post("/api/posts", {
      headers: origin,
      data: { title: "영어 번역이 없는 글", slug, _status: "published" },
    });
    expect(createRes.ok()).toBe(true);
    const postId = (await createRes.json()).doc.id;

    try {
      const post = await (await request.get(`/api/getPost/${slug}?locale=en`)).json();
      expect(post.title).toBe("영어 번역이 없는 글");
    } finally {
      await request.delete(`/api/posts/${postId}`, { headers: origin });
    }
  });
});
