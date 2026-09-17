import type { ServerProps } from "payload";
import Link from "next/link";
import React from "react";

// Admin-chrome strings live here, keyed by the viewer's admin language
// (i18n.language, user-selectable at /admin/account). This dashboard always
// lists posts by their Korean title (the base field) regardless of admin
// language — Posts has no content-locale axis anymore (see Posts.ts).
const translations = {
  ko: {
    welcome: "W Labs 블로그 관리",
    greeting: (name: string) => `${name}님, 안녕하세요.`,
    newPost: "새 글 쓰기",
    recent: "최근 글",
    draft: "초안",
    published: "게시됨",
    untitled: "(제목 없음)",
    empty: "아직 작성된 글이 없습니다.",
  },
  en: {
    welcome: "W Labs Blog Admin",
    greeting: (name: string) => `Hello, ${name}.`,
    newPost: "New post",
    recent: "Recent posts",
    draft: "Draft",
    published: "Published",
    untitled: "(Untitled)",
    empty: "No posts yet.",
  },
} as const;

// Rendered above the stock collection cards (admin.components.beforeDashboard).
// Every e2e setup project lands on /admin right after login, so this component
// must render for any authenticated user and any DB state without throwing.
export const BeforeDashboard = async ({ payload, user, i18n }: ServerProps) => {
  const lang = i18n?.language === "en" ? "en" : "ko";
  const t = translations[lang];
  const adminRoute = payload.config.routes.admin;

  const { docs: rawDocs } = await payload.find({
    collection: "posts",
    draft: true,
    limit: 5,
    sort: "-updatedAt",
    depth: 0,
    select: { title: true, _status: true, updatedAt: true },
  });

  // draft:true merges in rows from the versions table, and a version whose
  // parent post was deleted out-of-band surfaces as a doc with id: null
  // (posts_v.parent_id is ON DELETE SET NULL). Rendering those gives every
  // <li> below the same "null" key — React then warns and may drop or
  // duplicate rows — and their edit links would 404 anyway. Skip them.
  const docs = rawDocs.filter((doc) => doc.id != null);

  const displayName =
    user && "name" in user && typeof user.name === "string" && user.name
      ? user.name
      : user?.email;

  return (
    <section className="wlabs-dashboard">
      <header className="wlabs-dashboard__header">
        <h2>{t.welcome}</h2>
        {displayName ? <p>{t.greeting(displayName)}</p> : null}
      </header>
      <div className="wlabs-dashboard__actions">
        <Link
          className="btn btn--style-primary btn--size-medium wlabs-dashboard__action"
          href={`${adminRoute}/collections/posts/create`}
        >
          {t.newPost}
        </Link>
      </div>
      <div className="wlabs-dashboard__recent">
        <h3>{t.recent}</h3>
        {docs.length === 0 ? (
          <p>{t.empty}</p>
        ) : (
          <ul>
            {docs.map((post) => (
              <li key={post.id}>
                <Link href={`${adminRoute}/collections/posts/${post.id}`}>
                  {post.title || t.untitled}
                </Link>
                <span
                  className={`wlabs-status wlabs-status--${post._status === "published" ? "published" : "draft"}`}
                >
                  {post._status === "published" ? t.published : t.draft}
                </span>
                <time dateTime={post.updatedAt}>
                  {new Date(post.updatedAt).toLocaleDateString(
                    lang === "ko" ? "ko-KR" : "en-US",
                    { month: "short", day: "numeric" },
                  )}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
