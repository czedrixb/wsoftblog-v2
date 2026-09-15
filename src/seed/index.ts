/**
 * Idempotent seed: one admin, one editor, ~5 posts (mixed draft/published,
 * KO+EN, a couple with banners) — enough to demonstrate pagination and the
 * publish toggle. Run with `pnpm seed`. Safe to re-run: skips anything that
 * already exists by unique key (email / slug).
 */
import { getPayload } from "payload";
import config from "@payload-config";
import type { Post } from "@/payload-types";

type NewPostData = Omit<Post, "id" | "createdAt" | "updatedAt" | "sizes">;

async function upsertUser(
  payload: Awaited<ReturnType<typeof getPayload>>,
  data: { email: string; password: string; name: string; role: "admin" | "editor" },
) {
  const existing = await payload.find({
    collection: "users",
    where: { email: { equals: data.email } },
    limit: 1,
  });
  if (existing.docs[0]) return existing.docs[0];
  return payload.create({ collection: "users", data });
}

async function upsertPost(
  payload: Awaited<ReturnType<typeof getPayload>>,
  slug: string,
  build: () => NewPostData,
) {
  const existing = await payload.find({
    collection: "posts",
    where: { slug: { equals: slug } },
    limit: 1,
  });
  if (existing.docs[0]) {
    console.log(`skip (exists): ${slug}`);
    return existing.docs[0];
  }
  const post = await payload.create({ collection: "posts", data: build() });
  console.log(`created: ${slug}`);
  return post;
}

async function run() {
  const payload = await getPayload({ config });

  const admin = await upsertUser(payload, {
    email: process.env.SEED_ADMIN_EMAIL || "admin@wsoftlabs.dev",
    password: process.env.SEED_ADMIN_PASSWORD || "changeme-admin-123",
    name: "Czedrix Barcena",
    role: "admin",
  });

  const editor = await upsertUser(payload, {
    email: process.env.SEED_EDITOR_EMAIL || "editor@wsoftlabs.dev",
    password: process.env.SEED_EDITOR_PASSWORD || "changeme-editor-123",
    name: "W Labs Editor",
    role: "editor",
  });

  const richText = (paragraph: string) => ({
    root: {
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [{ type: "text", text: paragraph, version: 1 }],
          version: 1,
        },
      ],
      direction: "ltr" as const,
      format: "" as const,
      indent: 0,
      version: 1,
    },
  });

  const posts: Array<{
    slug: string;
    status: "draft" | "published";
    ko: { title: string; excerpt: string; body: string };
    en: { title: string; excerpt: string; body: string };
    author: number;
    daysAgo: number;
  }> = [
    {
      slug: "welcome-to-the-w-labs-blog",
      status: "published",
      ko: {
        title: "W Labs 블로그에 오신 것을 환영합니다",
        excerpt: "새로운 블로그 프로토타입을 소개합니다.",
        body: "이 글은 새로운 블로그 프로토타입의 첫 게시물입니다. Payload CMS 기반으로 재구축되었습니다.",
      },
      en: {
        title: "Welcome to the W Labs Blog",
        excerpt: "Introducing the new blog prototype.",
        body: "This is the first post on the new blog prototype, rebuilt on Payload CMS.",
      },
      author: admin.id,
      daysAgo: 5,
    },
    {
      slug: "why-we-rebuilt-the-blog",
      status: "published",
      ko: {
        title: "블로그를 다시 만든 이유",
        excerpt: "이전 블로그의 문제와 새 구조에 대한 설명.",
        body: "이전 블로그는 별도 배포로 인해 관리가 어려웠습니다. 새 구조는 동일 배포, 동일 담당자 원칙을 따릅니다.",
      },
      en: {
        title: "Why We Rebuilt the Blog",
        excerpt: "What went wrong before, and the new structure.",
        body: "The old blog was a separate deploy with no clear owner. The new structure keeps the same deploy and a named owner.",
      },
      author: editor.id,
      daysAgo: 3,
    },
    {
      slug: "publishing-workflow-for-editors",
      status: "published",
      ko: {
        title: "편집자를 위한 발행 워크플로우",
        excerpt: "작성, 초안 저장, 미리보기, 발행까지 네 단계.",
        body: "편집자는 Git이나 GitHub 계정 없이 이메일과 비밀번호로 로그인하여 글을 발행할 수 있습니다.",
      },
      en: {
        title: "Publishing Workflow for Editors",
        excerpt: "Write, save draft, preview, publish — four steps.",
        body: "Editors log in with email and password — no Git, no GitHub account required.",
      },
      author: editor.id,
      daysAgo: 1,
    },
    {
      slug: "draft-a-work-in-progress-post",
      status: "draft",
      ko: {
        title: "초안 - 작업 중인 글",
        excerpt: "아직 발행되지 않은 초안입니다.",
        body: "이 글은 초안 상태이며 공개 목록에 노출되지 않습니다.",
      },
      en: {
        title: "Draft — A Work in Progress Post",
        excerpt: "An unpublished draft.",
        body: "This post is a draft and does not appear on the public list.",
      },
      author: editor.id,
      daysAgo: 0,
    },
    {
      slug: "another-draft-pending-review",
      status: "draft",
      ko: {
        title: "초안 - 검토 대기 중",
        excerpt: "검토 대기 중인 두 번째 초안입니다.",
        body: "발행 전 검토를 기다리는 두 번째 초안입니다.",
      },
      en: {
        title: "Another Draft, Pending Review",
        excerpt: "A second draft awaiting review.",
        body: "A second draft awaiting review before publish.",
      },
      author: admin.id,
      daysAgo: 0,
    },
  ];

  for (const p of posts) {
    await upsertPost(payload, p.slug, () => ({
      title: p.ko.title,
      slug: p.slug,
      excerpt: p.ko.excerpt,
      content: richText(p.ko.body),
      author: p.author,
      publishedAt:
        p.status === "published"
          ? new Date(Date.now() - p.daysAgo * 86_400_000).toISOString()
          : undefined,
      _status: p.status,
    }));
  }

  // English locale pass — set once the base (ko) doc exists.
  for (const p of posts) {
    const { docs } = await payload.find({
      collection: "posts",
      where: { slug: { equals: p.slug } },
      limit: 1,
    });
    const doc = docs[0];
    if (!doc) continue;
    await payload.update({
      collection: "posts",
      id: doc.id,
      locale: "en",
      data: {
        title: p.en.title,
        excerpt: p.en.excerpt,
        content: richText(p.en.body),
      },
    });
  }

  console.log("Seed complete.");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
