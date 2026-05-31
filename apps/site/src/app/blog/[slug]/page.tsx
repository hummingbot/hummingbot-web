import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import { Badge } from "@hummingbot/ui";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { PostCard } from "@/components/blog/post-card";
import {
  coverFallback,
  formatDate,
  getAllPosts,
  getPostBySlug,
  getRelatedPosts,
  toMeta,
} from "@/lib/blog";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      images: post.cover ? [post.cover] : undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const related = getRelatedPosts(post, 3).map(toMeta);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> All posts
        </Link>

        <header className="mt-6">
          <Badge variant="brand" className="w-fit">{post.category}</Badge>
          <h1 className="mt-4 text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {post.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-500">
            <span>{post.author}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span aria-hidden="true">·</span>
            <span>{post.readingMinutes} min read</span>
          </div>
        </header>

        {post.cover ? (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl border border-ink-800">
            <Image
              src={post.cover}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              priority
              className="object-cover"
            />
          </div>
        ) : (
          <div
            className={`mt-8 aspect-[16/9] rounded-2xl border border-ink-800 bg-gradient-to-br ${coverFallback(post.slug)}`}
          />
        )}

        <article className="prose-hb mt-10">
          <Markdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, rehypeSlug]}
            components={{
              a: ({ href, children, ...rest }) => {
                const external = !!href && /^https?:\/\//.test(href);
                return (
                  <a
                    href={href}
                    {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                    {...rest}
                  >
                    {children}
                  </a>
                );
              },
              // eslint-disable-next-line @next/next/no-img-element
              img: ({ src, alt }) =>
                typeof src === "string" ? (
                  <img src={src} alt={alt ?? ""} loading="lazy" className="rounded-lg" />
                ) : null,
            }}
          >
            {post.body}
          </Markdown>
        </article>
      </main>

      {related.length > 0 && (
        <section className="border-t border-ink-800 bg-ink-999/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <h2 className="mb-8 text-2xl font-bold tracking-tight">Related posts</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <PostCard key={p.slug} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
    </>
  );
}
