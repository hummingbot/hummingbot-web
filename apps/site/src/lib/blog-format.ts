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

/** Deterministic Botcamp-palette gradient for posts without a cover image. */
export function coverFallback(slug: string): string {
  const palettes = [
    "from-primary/30 via-secondary/20 to-accent/30",
    "from-accent/30 via-primary/20 to-secondary/30",
    "from-secondary/30 via-accent/20 to-primary/30",
  ];
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % palettes.length;
  return palettes[h]!;
}

/** "Liquidity Mining" -> "liquidity-mining" */
export function categorySlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}
