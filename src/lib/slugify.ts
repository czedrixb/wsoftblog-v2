/**
 * Minimal slugify. Keeps Hangul (and other non-Latin scripts) intact rather
 * than stripping them, since post titles are often written in Korean first.
 */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}
