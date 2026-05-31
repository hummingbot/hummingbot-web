import Image from "next/image";
import Link from "next/link";
import { Badge } from "@hummingbot/ui";
import { coverFallback, formatDate, type PostMeta } from "@/lib/blog-format";

/** Cover image (or a deterministic brand-gradient fallback) in a 16:9 box. */
function Cover({ post, sizes }: { post: PostMeta; sizes: string }) {
  if (post.cover) {
    return (
      <Image
        src={post.cover}
        alt=""
        fill
        sizes={sizes}
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />
    );
  }
  return (
    <div
      className={`size-full bg-gradient-to-br ${coverFallback(post.slug)} flex items-center justify-center`}
    >
      <span className="px-4 text-center font-semibold text-ink-300">{post.category}</span>
    </div>
  );
}

function Meta({ post }: { post: PostMeta }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
      <span>{post.author}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={post.date}>{formatDate(post.date)}</time>
      <span aria-hidden="true">·</span>
      <span>{post.readingMinutes} min read</span>
    </div>
  );
}

/** Standard card for the index/category grids and related lists. */
export function PostCard({ post }: { post: PostMeta }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-ink-800 bg-card transition-colors hover:border-ink-700">
      <Link href={`/blog/${post.slug}`} className="relative block aspect-[16/9] overflow-hidden">
        <Cover post={post} sizes="(max-width: 768px) 100vw, 400px" />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <Badge variant="brand" className="w-fit">{post.category}</Badge>
        <h3 className="mt-3 text-lg font-semibold leading-snug tracking-tight">
          <Link
            href={`/blog/${post.slug}`}
            className="rounded-sm hover:text-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {post.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 flex-1 text-pretty text-sm text-ink-400">{post.excerpt}</p>
        <div className="mt-4">
          <Meta post={post} />
        </div>
      </div>
    </article>
  );
}

/** Large editorial card for the featured (latest) post. */
export function FeaturedCard({ post }: { post: PostMeta }) {
  return (
    <article className="group grid overflow-hidden rounded-2xl border border-ink-800 bg-card transition-colors hover:border-ink-700 md:grid-cols-2">
      <Link
        href={`/blog/${post.slug}`}
        className="relative block aspect-[16/9] overflow-hidden md:aspect-auto"
      >
        <Cover post={post} sizes="(max-width: 768px) 100vw, 600px" />
      </Link>
      <div className="flex flex-col justify-center p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <Badge variant="brand" className="w-fit">{post.category}</Badge>
          <span className="text-xs font-medium uppercase tracking-wider text-ink-500">Latest</span>
        </div>
        <h2 className="mt-3 text-balance text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
          <Link
            href={`/blog/${post.slug}`}
            className="rounded-sm hover:text-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {post.title}
          </Link>
        </h2>
        <p className="mt-3 line-clamp-3 text-pretty text-ink-400">{post.excerpt}</p>
        <div className="mt-5">
          <Meta post={post} />
        </div>
      </div>
    </article>
  );
}
