import { convertLexicalToHTML } from "@payloadcms/richtext-lexical/html";
import type { Media, Post } from "@/payload-types";

/**
 * Mirrors the old Laravel `PostResource` wire shape so the Nuxt site's
 * `server/api/getBlogs.get.js` / `getPost/[id].get.js` proxies can point at
 * this app by only changing `NUXT_BLOG_API_BASE` (WOS-314) — no template
 * changes. Field names and casing are intentionally snake_case to match.
 */
export type WirePost = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  banner_url: string | null;
  published_at: string | null;
  author: { name: string; twitter: string | null } | null;
};

export type WirePostSummary = Omit<WirePost, "content">;

function bannerUrl(banner: Post["banner"]): string | null {
  if (!banner || typeof banner === "number") return null;
  return (banner as Media).url ?? null;
}

function authorOf(author: Post["author"]): WirePost["author"] {
  if (!author || typeof author === "number") return null;
  // The users collection no longer has a twitter field; the key stays in the
  // wire shape (always null) so old Nuxt consumers keep parsing unchanged.
  return { name: author.name, twitter: null };
}

export function toWirePostSummary(post: Post): WirePostSummary {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? null,
    banner_url: bannerUrl(post.banner),
    published_at: post.publishedAt ?? null,
    author: authorOf(post.author),
  };
}

export function toWirePost(post: Post): WirePost {
  return {
    ...toWirePostSummary(post),
    content: post.content ? convertLexicalToHTML({ data: post.content }) : null,
  };
}
