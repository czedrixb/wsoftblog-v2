import { NextResponse, type NextRequest } from "next/server";
import { getPayload } from "@/lib/getPayload";
import { resolveLocale } from "@/lib/locale";
import { toWirePost } from "@/lib/wireContract";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// Wire-compat with the old `BlogController@getPosts` — routed as
// GET /api/getPost/{id}, accepting either a numeric id (legacy) or a slug.
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const locale = resolveLocale(request.nextUrl.searchParams.get("locale") ?? undefined);

  const payload = await getPayload();
  const isNumeric = /^\d+$/.test(id);

  const { docs } = await payload.find({
    collection: "posts",
    overrideAccess: false,
    where: isNumeric ? { id: { equals: Number(id) } } : { slug: { equals: id } },
    limit: 1,
    depth: 1,
  });

  const post = docs[0];
  if (!post) {
    return NextResponse.json({ message: "Post not found." }, { status: 404 });
  }

  return NextResponse.json(toWirePost(post, locale));
}
