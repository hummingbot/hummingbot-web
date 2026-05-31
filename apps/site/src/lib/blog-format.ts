/**
 * Client-safe blog types + pure helpers (no node:fs). Imported by both the
 * server data layer (blog.ts) and client components (category-filter) so the
 * latter never pull the filesystem loader into the browser bundle.
 */

/** Post metadata without the markdown body — safe to pass to client components. */
export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  date: string;
  author: string;
  category: string;
  cover: string;
  readingMinutes: number;
};

export type CategoryCount = { name: string; count: number };

/** "Mar 14, 2024" */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${iso}T00:00:00`));
}

/** Deterministic brand gradient for posts without a cover image. */
export function coverFallback(slug: string): string {
  const palettes = [
    "from-brand-teal/30 via-brand-cyan/20 to-brand-magenta/30",
    "from-brand-magenta/30 via-brand-teal/20 to-brand-cyan/30",
    "from-brand-cyan/30 via-brand-magenta/20 to-brand-teal/30",
  ];
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % palettes.length;
  return palettes[h]!;
}

/** "Liquidity Mining" -> "liquidity-mining" */
export function categorySlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}
