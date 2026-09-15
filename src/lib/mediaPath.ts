// Payload prefixes media URLs with `serverURL`, but next/image only allows
// same-app media via `images.localPatterns` (next.config.ts), which matches
// LOCAL paths — an absolute URL is treated as an unconfigured remote host and
// throws. Media is always served by this app, so strip the origin.
export function mediaPath(url: string): string {
  if (url.startsWith("/")) return url;
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search;
  } catch {
    return url;
  }
}
