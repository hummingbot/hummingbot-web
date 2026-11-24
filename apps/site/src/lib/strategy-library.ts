import { urls } from "@/config/site";

/** One listing from Botcamp's public agent catalogue (GET /api/agents). */
export type LibraryStrategy = {
  slug: string;
  name: string;
  description: string;
  author: string;
  free: boolean;
  url: string;
};

type RawListing = {
  slug?: unknown;
  name?: unknown;
  description?: unknown;
  author?: { name?: unknown } | null;
  free?: unknown;
};

/** Keeps the listings that have what a card shows, in the catalogue's order. */
export function parseLibrary(data: unknown): LibraryStrategy[] {
  const listings = (data as { listings?: unknown } | null)?.listings;
  if (!Array.isArray(listings)) return [];
  return (listings as RawListing[]).flatMap((l) => {
    if (typeof l.slug !== "string" || typeof l.name !== "string") return [];
    return [
      {
        slug: l.slug,
        name: l.name,
        description: typeof l.description === "string" ? l.description : "",
        author: typeof l.author?.name === "string" ? l.author.name : "",
        free: l.free === true,
        url: `${urls.strategyLibrary}/${encodeURIComponent(l.slug)}`,
      },
    ];
  });
}

/**
 * The Strategy Library's first strategies, from Botcamp's public catalogue
 * (anonymous, metadata only: what's in it is validated and clonable into
 * Condor). Cached for an hour; [] when Botcamp can't be reached.
 */
export async function getLibraryStrategies(limit = 3): Promise<LibraryStrategy[]> {
  try {
    const res = await fetch(`${urls.education}/api/agents`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return parseLibrary(await res.json()).slice(0, limit);
  } catch {
    return [];
  }
}
