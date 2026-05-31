import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  allCategories,
  categorySlug,
  coverFallback,
  formatDate,
  getAllPosts,
  getFeaturedPost,
  getPostBySlug,
  getPostsByCategory,
  getRelatedPosts,
} from "./blog";

// Runs against the real migrated content (src/content/blog), so assertions stay
// structural / invariant-based rather than pinned to exact counts.

describe("getAllPosts", () => {
  const posts = getAllPosts();

  it("loads a non-trivial number of posts", () => {
    expect(posts.length).toBeGreaterThan(50);
  });

  it("every post has well-formed core fields", () => {
    for (const p of posts) {
      expect(p.slug, p.slug).toBeTruthy();
      expect(p.title, p.slug).toBeTruthy();
      expect(p.excerpt, p.slug).toBeTruthy();
      expect(p.category, p.slug).toBeTruthy();
      expect(p.author, p.slug).toBeTruthy();
      expect(/^\d{4}-\d{2}-\d{2}$/.test(p.date), `${p.slug} date=${p.date}`).toBe(true);
      expect(p.readingMinutes, p.slug).toBeGreaterThan(0);
      expect(p.body.length, p.slug).toBeGreaterThan(0);
    }
  });

  it("slugs are unique", () => {
    const seen = new Set<string>();
    for (const p of posts) {
      expect(seen.has(p.slug), `duplicate ${p.slug}`).toBe(false);
      seen.add(p.slug);
    }
  });

  it("is sorted by date, newest first", () => {
    for (let i = 1; i < posts.length; i++) {
      expect(posts[i - 1]!.date.localeCompare(posts[i]!.date)).toBeGreaterThanOrEqual(0);
    }
  });

  it("every declared cover image exists on disk", () => {
    for (const p of posts) {
      if (!p.cover) continue;
      const file = join(process.cwd(), "public", p.cover);
      expect(existsSync(file), `cover ${p.cover} (${p.slug})`).toBe(true);
    }
  });

  it("bodies carry no leftover migration artifacts", () => {
    for (const p of posts) {
      expect(p.body.includes("<!-- more -->"), p.slug).toBe(false);
      expect(/\]\(\.\.\//.test(p.body), `relative link in ${p.slug}`).toBe(false);
      expect(/^!!!\s/m.test(p.body), `raw admonition in ${p.slug}`).toBe(false);
    }
  });
});

describe("lookups", () => {
  it("getPostBySlug round-trips", () => {
    const p = getAllPosts()[0]!;
    expect(getPostBySlug(p.slug)?.slug).toBe(p.slug);
    expect(getPostBySlug("__nope__")).toBeUndefined();
  });

  it("getFeaturedPost returns the newest", () => {
    expect(getFeaturedPost().slug).toBe(getAllPosts()[0]!.slug);
  });

  it("getPostsByCategory returns only that category", () => {
    const cat = allCategories()[0]!.name;
    const rows = getPostsByCategory(cat);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((p) => p.category === cat)).toBe(true);
  });

  it("getRelatedPosts excludes self and returns n", () => {
    const p = getAllPosts()[0]!;
    const related = getRelatedPosts(p, 3);
    expect(related.length).toBe(3);
    expect(related.every((r) => r.slug !== p.slug)).toBe(true);
  });
});

describe("aggregates", () => {
  it("category counts sum to the total post count", () => {
    const total = allCategories().reduce((n, c) => n + c.count, 0);
    expect(total).toBe(getAllPosts().length);
  });
});

describe("helpers", () => {
  it("formatDate renders 'Mon D, YYYY'", () => {
    expect(formatDate("2024-03-14")).toBe("Mar 14, 2024");
  });
  it("categorySlug kebab-cases", () => {
    expect(categorySlug("Liquidity Mining")).toBe("liquidity-mining");
    expect(categorySlug("Tutorials")).toBe("tutorials");
  });
  it("coverFallback is deterministic and returns a gradient class", () => {
    expect(coverFallback("abc")).toBe(coverFallback("abc"));
    expect(coverFallback("abc")).toMatch(/from-brand-/);
  });
});
