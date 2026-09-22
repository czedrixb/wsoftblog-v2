import { unstable_cache } from "next/cache";
import { getPayload } from "@/lib/getPayload";

export const POSTS_PAGE_SIZE = 10;

// Both pages await searchParams, so route-segment `revalidate` can't cache
// them — the data layer has to. unstable_cache serves the stored entry and
// refreshes in the background, so a Postgres outage degrades to ≤60s-stale
// pages instead of a site-wide 500 (WOS-329). Post content is bilingual via
// explicit ko/en fields, not Payload locales, so `locale` is not part of
// either cache key.

export const getPostsPage = unstable_cache(
  async (page: number) => {
    const payload = await getPayload();
    return payload.find({
      collection: "posts",
      overrideAccess: false,
      sort: "-publishedAt",
      limit: POSTS_PAGE_SIZE,
      page,
      depth: 1,
    });
  },
  ["posts-list"],
  { tags: ["posts"], revalidate: 60 },
);

export const getPostBySlug = unstable_cache(
  async (slug: string) => {
    const payload = await getPayload();
    const { docs } = await payload.find({
      collection: "posts",
      overrideAccess: false,
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 2,
    });
    return docs[0] ?? null;
  },
  ["post-by-slug"],
  { tags: ["posts"], revalidate: 60 },
);
