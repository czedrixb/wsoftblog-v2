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
