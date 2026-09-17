import Link from "next/link";
import Image from "next/image";
import { getPayload } from "@/lib/getPayload";
import { resolveLocale, withLocale } from "@/lib/locale";
import { mediaPath } from "@/lib/mediaPath";
import { SiteHeader } from "@/components/frontend/SiteHeader";
import { t } from "@/lib/strings";

// Force dynamic rendering — otherwise Next 16's production build can
// statically prerender this list at build time and never see new/updated/
// deleted posts again without a full rebuild.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

type Props = {
  searchParams: Promise<{ page?: string; locale?: string }>;
};

export default async function BlogListPage({ searchParams }: Props) {
  const params = await searchParams;
  const locale = resolveLocale(params.locale);
  const page = Math.max(1, Number(params.page) || 1);

  const payload = await getPayload();
  const { docs, totalPages, hasNextPage, hasPrevPage } = await payload.find({
    collection: "posts",
    overrideAccess: false,
    sort: "-publishedAt",
    limit: PAGE_SIZE,
    page,
    depth: 1,
  });

  const strings = t(locale);

  return (
    <>
      <SiteHeader locale={locale} path={page > 1 ? `/?page=${page}` : "/"} />
      <main className="mx-auto max-w-3xl px-6 pb-16">
        {docs.length === 0 && <p className="text-gray-500">{strings.noPosts}</p>}

        <ul className="space-y-8">
          {docs.map((post) => {
            const banner =
              typeof post.banner === "object" && post.banner ? post.banner : null;
            const author =
              typeof post.author === "object" && post.author ? post.author : null;

            return (
              <li key={post.id} className="border-b pb-8">
                <Link href={withLocale(`/posts/${post.slug}`, locale)} className="group block">
                  {banner?.url && (
                    <Image
                      src={mediaPath(banner.url)}
                      alt={banner.alt ?? ""}
                      width={800}
                      height={450}
                      className="mb-4 aspect-video w-full rounded-lg object-cover"
                    />
                  )}
                  <h2 className="text-xl font-semibold group-hover:underline">
                    {post.title}
                  </h2>
                </Link>
                {post.excerpt && <p className="mt-2 text-gray-600">{post.excerpt}</p>}
                <p className="mt-2 text-sm text-gray-400">
                  {author?.name ?? strings.unknownAuthor}
                  {post.publishedAt &&
                    ` · ${new Date(post.publishedAt).toLocaleDateString(locale)}`}
                </p>
              </li>
            );
          })}
        </ul>

        <nav className="mt-10 flex justify-between text-sm">
          {hasPrevPage ? (
            <Link href={withLocale(`/?page=${page - 1}`, locale)} className="underline">
              &larr; {strings.previous}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-gray-400">{strings.pageIndicator(page, totalPages || 1)}</span>
          {hasNextPage ? (
            <Link href={withLocale(`/?page=${page + 1}`, locale)} className="underline">
              {strings.next} &rarr;
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </main>
    </>
  );
}
