import data from "@/content/registry.json";

/**
 * Registry data-access layer. v1 reads a seed JSON (real registry content) and
 * does in-memory search/filter/sort. Production target: swap this module's
 * internals for Prisma/Neon queries (see prisma/schema.prisma) + Postgres
 * full-text search, seeded from the Botcamp DB. The page/component API stays
 * the same.
 */

export type PrimitiveType = "strategy" | "routine" | "agent";

export type Primitive = {
  type: PrimitiveType;
  namespace: string;
  name: string;
  summary: string;
  description: string;
  tags: string[];
  exchanges: string[];
  categories: string[];
  license: string;
  runtime: "hummingbot" | "condor";
  latest: string;
  versions: string[];
  updated: string;
  certified: boolean;
  hasSource: boolean;
  hasVideo: boolean;
  // optional — Botcamp-sourced rows don't carry install/star metrics yet
  installs?: number;
  stars?: number;
  downloads?: number;
  videoURL?: string | null;
  cohort?: number | null;
  authorName?: string;
  // first-party (Hummingbot/Condor) extras — see scripts/import-sources.mjs
  subtype?: "script" | "v1" | "routine";
  continuous?: boolean;
  repoURL?: string;
  reportURL?: string;
  files?: SourceFile[];
};

/** Bundled source file manifest. Contents live on disk under
 *  src/content/sources/<plural>/<namespace>/<name>/<name>; read via lib/sources.ts. */
export type SourceFile = {
  name: string;
  lang: "python" | "cython" | "text";
  lines: number;
};

export type Publisher = {
  handle: string;
  name: string;
  bio: string;
  joined: string;
};

const primitives = data.primitives as Primitive[];
const publishers = data.publishers as Publisher[];

export const slugOf = (p: Pick<Primitive, "namespace" | "name">) =>
  `@${p.namespace}/${p.name}`;

export const installCommand = (p: Primitive) =>
  `${p.runtime} install @${p.namespace}/${p.name}`;

export type Sort =
  | "featured"
  | "installs"
  | "stars"
  | "updated"
  | "newest"
  | "name";

export type BrowseFilters = {
  type?: PrimitiveType;
  q?: string;
  category?: string;
  exchanges?: string[];
  capabilities?: ("hasVideo" | "hasSource" | "certified")[];
  sort?: Sort;
};

function score(p: Primitive, q: string): number {
  const hay = `${p.namespace} ${p.name} ${p.summary} ${p.description} ${p.tags.join(" ")}`.toLowerCase();
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  return terms.reduce((s, t) => s + (hay.includes(t) ? 1 : 0), 0);
}

export function browse(filters: BrowseFilters = {}): Primitive[] {
  let rows = [...primitives];
  if (filters.type) rows = rows.filter((p) => p.type === filters.type);
  if (filters.category && filters.category !== "All")
    rows = rows.filter((p) => p.categories.includes(filters.category!));
  if (filters.exchanges?.length)
    rows = rows.filter((p) => filters.exchanges!.every((e) => p.exchanges.includes(e)));
  for (const cap of filters.capabilities ?? []) rows = rows.filter((p) => p[cap]);

  if (filters.q?.trim()) {
    const q = filters.q.trim();
    rows = rows
      .map((p) => ({ p, s: score(p, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || (b.p.installs ?? 0) - (a.p.installs ?? 0))
      .map((x) => x.p);
    return rows;
  }

  const sort = filters.sort ?? "featured";
  const inst = (p: Primitive) => p.installs ?? 0;
  const star = (p: Primitive) => p.stars ?? 0;
  const cmp: Record<Sort, (a: Primitive, b: Primitive) => number> = {
    featured: (a, b) =>
      Number(b.certified) - Number(a.certified) ||
      inst(b) - inst(a) ||
      b.updated.localeCompare(a.updated),
    installs: (a, b) => inst(b) - inst(a),
    stars: (a, b) => star(b) - star(a),
    updated: (a, b) => b.updated.localeCompare(a.updated),
    newest: (a, b) => b.updated.localeCompare(a.updated),
    name: (a, b) => a.name.localeCompare(b.name),
  };
  return rows.sort(cmp[sort]);
}

export function getPrimitive(
  type: PrimitiveType,
  namespace: string,
  name: string,
): Primitive | undefined {
  return primitives.find(
    (p) => p.type === type && p.namespace === namespace && p.name === name,
  );
}

export function getPublisher(handle: string): Publisher | undefined {
  return publishers.find((p) => p.handle === handle);
}

export function primitivesByPublisher(handle: string): Primitive[] {
  return primitives.filter((p) => p.namespace === handle);
}

export function allPublishers(): (Publisher & { count: number })[] {
  return publishers
    .map((pub) => {
      const items = primitivesByPublisher(pub.handle);
      return { ...pub, count: items.length };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function stats() {
  return {
    primitives: primitives.length,
    publishers: publishers.length,
    certified: primitives.filter((p) => p.certified).length,
    exchanges: new Set(primitives.flatMap((p) => p.exchanges)).size,
  };
}

export function allCategories(): string[] {
  return [...new Set(primitives.flatMap((p) => p.categories))].sort();
}

export function allExchanges(): string[] {
  return [...new Set(primitives.flatMap((p) => p.exchanges))].sort();
}

export function featured(): Primitive[] {
  return browse({ sort: "featured" }).slice(0, 6);
}

export function trending(): Primitive[] {
  return browse({ sort: "newest" }).slice(0, 6);
}

export function countByType(type: PrimitiveType): number {
  return primitives.filter((p) => p.type === type).length;
}
