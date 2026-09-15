import Image from "next/image";
import { notFound } from "next/navigation";
import { RichText } from "@payloadcms/richtext-lexical/react";
import { getPayload } from "@/lib/getPayload";
import { fallbackFor, resolveLocale } from "@/lib/locale";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ locale?: string }>;
};

export default async function PostDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { locale: localeParam } = await searchParams;
  const locale = resolveLocale(localeParam);

  const payload = await getPayload();
  const { docs } = await payload.find({
    collection: "posts",
    locale,
    fallbackLocale: fallbackFor(locale),
    overrideAccess: false,
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
  });

  const post = docs[0];
  if (!post) notFound();

  const banner = typeof post.banner === "object" && post.banner ? post.banner : null;
  const author = typeof post.author === "object" && post.author ? post.author : null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      {banner?.url && (
        <Image
          src={banner.url}
          alt={banner.alt ?? ""}
          width={1600}
          height={900}
          className="mb-8 aspect-video w-full rounded-lg object-cover"
          priority
        />
      )}
      <h1 className="text-3xl font-bold">{post.title}</h1>
      <p className="mt-2 text-sm text-gray-400">
        {author?.name ?? "Unknown Author"}
        {post.publishedAt &&
          ` · ${new Date(post.publishedAt).toLocaleDateString(locale)}`}
      </p>
      <article className="prose mt-8 max-w-none">
        {post.content && <RichText data={post.content} />}
      </article>
    </main>
  );
}
