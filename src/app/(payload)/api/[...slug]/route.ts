/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import config from "@payload-config";
import "@payloadcms/next/css";
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
  REST_PUT,
} from "@payloadcms/next/routes";

// Added (not part of the generated template): without this, Next.js 16's
// production build can statically optimize/cache these GET/PATCH handlers
// at build time — before any request or cookie exists — so every request
// afterwards sees an anonymous snapshot regardless of the caller's session.
// `next dev` never exhibits this (everything renders dynamically there),
// which is why it only surfaces under `next build && next start`.
export const dynamic = "force-dynamic";

export const GET = REST_GET(config);
export const POST = REST_POST(config);
export const DELETE = REST_DELETE(config);
export const PATCH = REST_PATCH(config);
export const PUT = REST_PUT(config);
export const OPTIONS = REST_OPTIONS(config);
