import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { PostCard } from "@/components/blog/post-card";
import { allCategories, categorySlug, getAllPostMeta } from "@/lib/blog";

export function generateStaticParams() {
  return allCategories().map((c) => ({ category: categorySlug(c.name) }));
}

function resolveCategory(slug: string): string | undefined {
  return allCategories().find((c) => categorySlug(c.name) === slug)?.name;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const name = resolveCategory(category);
  if (!name) return {};
  return {
    title: `${name} — Blog`,
    description: `${name} posts from the Hummingbot blog.`,
  };
}

export default async function BlogCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const name = resolveCategory(category);
  if (!name) notFound();

  const posts = getAllPostMeta().filter((p) => p.category === name);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> All posts
        </Link>
        <header className="mb-12 mt-6">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">{name}</h1>
          <p className="mt-3 text-ink-500">
            {posts.length} {posts.length === 1 ? "post" : "posts"}
          </p>
        </header>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <PostCard key={p.slug} post={p} />
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
