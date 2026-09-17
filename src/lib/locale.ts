export type Locale = "ko" | "en";

// Wire-compat aliases the old Laravel API accepted (BlogController's
// SetLocale middleware): kr/ko-kr -> ko.
const ALIASES: Record<string, Locale> = {
  ko: "ko",
  kr: "ko",
  "ko-kr": "ko",
  en: "en",
};

export function resolveLocale(input: string | string[] | undefined): Locale {
  const raw = Array.isArray(input) ? input[0] : input;
  if (!raw) return "ko";
  return ALIASES[raw.toLowerCase()] ?? "ko";
}

// Posts store Korean in the base fields (title/content/excerpt) and English
// in optional `*En` fields — there is no Payload-level locale/fallbackLocale
// anymore (see src/collections/Posts.ts). `pick` chooses which value a
// reader sees: English falls back to Korean when the `*En` field is empty,
// so an untranslated post still renders instead of showing up blank; Korean
// never falls back since `title` is required and always present.
export function pick<T>(locale: Locale, ko: T, en: T | null | undefined): T {
  if (locale === "en" && en != null && en !== "") return en;
  return ko;
}

// Locale rides on ?locale= and nothing else (no cookie, no middleware) — a
// sticky per-user locale is the exact "my English text vanished" bug class
// this branch just removed from the admin. That means every internal link
// has to carry it forward explicitly or the reader silently falls back to
// ko mid-session.
export function withLocale(path: string, locale: Locale): string {
  const [base, qs] = path.split("?");
  const params = new URLSearchParams(qs);
  params.set("locale", locale);
  return `${base}?${params.toString()}`;
}
