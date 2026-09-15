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

// Cross-locale fallback for public reads. Payload's admin writes localized
// fields into whichever content locale the editor had selected (a sticky
// per-user preference), so a post authored only in one locale must still
// render on the other locale's surfaces — otherwise it shows up published
// but blank, which is exactly how the old "fields persisted empty" symptom
// looked. Falling back to the *same* locale (the old `fallbackLocale: "ko"`
// on a ko read) is a no-op.
export function fallbackFor(locale: Locale): Locale {
  return locale === "ko" ? "en" : "ko";
}
