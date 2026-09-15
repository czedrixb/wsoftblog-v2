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
});
