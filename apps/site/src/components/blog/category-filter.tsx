"use client";

import { useState } from "react";
import { PostCard } from "./post-card";
import type { CategoryCount, PostMeta } from "@/lib/blog-format";

/**
 * Client-side category filter over the (small) in-memory post list. Renders the
 * chip row + the filtered card grid. "All" shows everything; selecting a chip
 * narrows the grid without a navigation.
 */
export function CategoryFilter({
  posts,
  categories,
}: {
  posts: PostMeta[];
  categories: CategoryCount[];
}) {
  const [active, setActive] = useState<string>("All");
  const shown = active === "All" ? posts : posts.filter((p) => p.category === active);

  const chip = (label: string, count: number, isActive: boolean) => (
    <button
      key={label}
      type="button"
      onClick={() => setActive(label)}
      aria-pressed={isActive}
      className={
        "rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
        (isActive
          ? "border-brand-teal/40 bg-brand-teal/10 text-brand-teal"
          : "border-ink-800 bg-ink-900 text-ink-400 hover:border-ink-700 hover:text-foreground")
      }
    >
      {label}
      <span className="ml-1.5 tabular-nums text-ink-600">{count}</span>
    </button>
  );

  return (
    <>
      <div className="mb-8 flex flex-wrap gap-2">
        {chip("All", posts.length, active === "All")}
        {categories.map((c) => chip(c.name, c.count, active === c.name))}
      </div>

      {shown.length === 0 ? (
        <p className="text-ink-500">No posts in this category yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => (
            <PostCard key={p.slug} post={p} />
          ))}
        </div>
      )}
    </>
  );
}
