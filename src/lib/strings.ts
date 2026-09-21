import type { Locale } from "@/lib/locale";

// UI chrome strings only — post content (title/excerpt/body) is not part of
// this table and always renders in Korean regardless of locale. See
// src/lib/locale.ts `pick` for the (separate) API-side content switch.
const STRINGS = {
  ko: {
    noPosts: "아직 게시글이 없습니다.",
    previous: "이전",
    next: "다음",
    pageIndicator: (page: number, total: number) => `${total}페이지 중 ${page}페이지`,
    unknownAuthor: "작성자 미상",
    languageNav: "언어",
  },
  en: {
    noPosts: "No posts yet.",
    previous: "Previous",
    next: "Next",
    pageIndicator: (page: number, total: number) => `Page ${page} of ${total}`,
    unknownAuthor: "Unknown Author",
    languageNav: "Language",
  },
} satisfies Record<Locale, Record<string, unknown>>;

export function t(locale: Locale) {
  return STRINGS[locale];
}
