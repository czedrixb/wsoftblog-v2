import { NextResponse, type NextRequest } from "next/server";
import { getPayload } from "@/lib/getPayload";
import { resolveLocale } from "@/lib/locale";
import { toWirePostSummary } from "@/lib/wireContract";

// Wire-compat with the old Laravel `BlogController@index` contract, so
// wsoftlabs-website-v2's `server/api/getBlogs.get.js` proxy can point here
// by only flipping NUXT_BLOG_API_BASE (WOS-314) — no Nuxt template changes.
//
// Unlike the old endpoint (which returned every published post, full HTML
// bodies included, unpaginated — a latent scaling problem), this caps the
// result and omits `content` from the list payload.
export const dynamic = "force-dynamic";

const LIST_LIMIT = 50;

export async function GET(request: NextRequest) {
  const locale = resolveLocale(request.nextUrl.searchParams.get("locale") ?? undefined);

  const payload = await getPayload();
  const { docs } = await payload.find({
    collection: "posts",
    overrideAccess: false,
    sort: "-publishedAt",
    limit: LIST_LIMIT,
    depth: 1,
  });

  return NextResponse.json(docs.map((doc) => toWirePostSummary(doc, locale)));
}
