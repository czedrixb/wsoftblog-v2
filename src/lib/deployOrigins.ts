/**
 * Payload's CSRF origin allowlist (`csrf`) is in serverOnlyConfigProperties —
 * it never reaches the client — and `serverURL` is sent to the client as part
 * of the per-request config, not inlined at build time. Only NEXT_PUBLIC_*
 * values are baked in by `next build`. That means both `serverURL` and
 * `csrf` can safely be driven by plain VERCEL_* runtime vars, which is
 * exactly what's needed: a build-inlined value can never match a Vercel
 * preview's random *.vercel.app hostname (WOS-324).
 *
 * Requires Vercel → Project Settings → Environment Variables →
 * "Enable access to System Environment Variables".
 */
const https = (host?: string) => (host ? `https://${host}` : undefined);

const explicit = process.env.NEXT_PUBLIC_SERVER_URL || undefined;

/**
 * Production: the stable project production domain (or the explicit
 * NEXT_PUBLIC_SERVER_URL, if set — the ticket asks for it as a build-time
 * var, so an explicit value always wins).
 *
 * Preview: intentionally left undefined. Payload then emits RELATIVE media
 * URLs (/api/media/file/**), exactly what mediaPath() and next.config.ts's
 * images.localPatterns expect, and derives the request origin from the Host
 * header — permitted only because that origin is present in csrfOrigins
 * below, so this doesn't reopen the CSRF hole it's meant to close.
 */
export const serverURL =
  explicit ??
  (process.env.VERCEL_ENV === "production"
    ? https(process.env.VERCEL_PROJECT_PRODUCTION_URL)
    : undefined);

export const csrfOrigins = [
  explicit,
  https(process.env.VERCEL_PROJECT_PRODUCTION_URL), // stable prod domain
  https(process.env.VERCEL_BRANCH_URL), // stable per-branch preview domain
  https(process.env.VERCEL_URL), // this exact deployment
  // Local dev spellings — Payload's Origin check is an exact string match.
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].filter((origin): origin is string => Boolean(origin));
