import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { FeaturedCard } from "@/components/blog/post-card";
import { CategoryFilter } from "@/components/blog/category-filter";
import { GradientText } from "@hummingbot/ui";
import { allCategories, getAllPostMeta, getFeaturedPost, toMeta } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Releases, tutorials, strategy deep-dives, governance, and community stories from Hummingbot.",
};

export default function BlogIndexPage() {
  const featured = toMeta(getFeaturedPost());
  const posts = getAllPostMeta();
  const categories = allCategories();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16">
        <header className="mb-12">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            The Hummingbot <GradientText>Blog</GradientText>
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-lg text-ink-400">
            Product releases, strategy deep-dives, market-making tutorials,
            governance updates, and stories from the community.
          </p>
        </header>

        <section className="mb-16" aria-label="Featured post">
          <FeaturedCard post={featured} />
        </section>

        <section aria-label="All posts">
          <h2 className="sr-only">All posts</h2>
          <CategoryFilter posts={posts} categories={categories} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
