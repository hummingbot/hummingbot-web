import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import type { CategoryCount, PostMeta } from "./blog-format";

/**
 * Build-time blog data layer. Reads the migrated markdown in src/content/blog
 * (see scripts/migrate-blog.mjs) and exposes typed, sorted posts + bodies.
 * Server-side only; memoized like lib/volumes.ts. Pure helpers + client-safe
 * types live in blog-format.ts; raw markdown is rendered by the post viewer.
 */

export type { PostMeta, CategoryCount } from "./blog-format";
export { formatDate, coverFallback, categorySlug } from "./blog-format";

const dir = join(process.cwd(), "src", "content", "blog");

export type Post = PostMeta & { body: string };

let cache: Post[] | null = null;

function load(): Post[] {
  if (cache) return cache;
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  const posts = files.map((file) => {
    const slug = file.replace(/\.md$/, "");
    const { data, content } = matter(readFileSync(join(dir, file), "utf8"));
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    return {
      slug,
      title: String(data.title ?? slug),
      description: String(data.description ?? ""),
      excerpt: String(data.excerpt ?? data.description ?? ""),
      date: String(data.date ?? "2020-01-01").slice(0, 10),
      author: String(data.author ?? "Hummingbot Foundation"),
      category: String(data.category ?? "News"),
      cover: String(data.cover ?? ""),
      readingMinutes: Math.max(1, Math.ceil(words / 200)),
      body: content,
    } satisfies Post;
  });
  posts.sort((a, b) => b.date.localeCompare(a.date));
  cache = posts;
  return posts;
}

/** Strip the markdown body for passing to client components. */
export function toMeta(p: Post): PostMeta {
  const { body: _body, ...meta } = p;
  return meta;
}

export function getAllPosts(): Post[] {
  return load();
}

export function getAllPostMeta(): PostMeta[] {
  return load().map(toMeta);
}

export function getPostBySlug(slug: string): Post | undefined {
  return load().find((p) => p.slug === slug);
}

export function getPostsByCategory(category: string): Post[] {
  return load().filter((p) => p.category.toLowerCase() === category.toLowerCase());
}

export function allCategories(): CategoryCount[] {
  const counts = new Map<string, number>();
  for (const p of load()) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function getFeaturedPost(): Post {
  return load()[0]!;
}

export function getRelatedPosts(post: Post, n = 3): Post[] {
  const sameCat = load().filter((p) => p.slug !== post.slug && p.category === post.category);
  if (sameCat.length >= n) return sameCat.slice(0, n);
  const others = load().filter((p) => p.slug !== post.slug && p.category !== post.category);
  return [...sameCat, ...others].slice(0, n);
}
