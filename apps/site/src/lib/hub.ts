/**
 * The Hub's catalogue: agents Condor can clone.
 *
 * Reads Botcamp's public catalogue (`GET /api/agents?query=&page=`, the same
 * one Condor's Hub › Pull agents browses). It is anonymous and metadata only:
 * agents with an approved version whose page isn't private. Cloning itself
 * happens in Condor, by slug, under Botcamp's access rules.
 */

export const BOTCAMP_URL = (
  process.env.BOTCAMP_URL ?? "https://www.botcamp.xyz"
).replace(/\/$/, "");

const PAGE_SIZE = 20; // Botcamp's catalogue page size
const MAX_PAGES = 10;
const REVALIDATE_SECONDS = 60;

export type HubAgent = {
  slug: string;
  name: string;
  description: string;
  /** Latest approved version — the one Condor pulls. */
  version: number;
  author: { name: string; handle: string };
  digest: string;
  bytes: number;
  publishedAt: string;
  /** Pulling it needs no Botcamp membership. */
  free: boolean;
};

type Listing = {
  slug: string;
  name: string;
  description?: string;
  version: number;
  author?: { name?: string; handle?: string };
  digest: string;
  bytes: number;
  published_at: string;
  free: boolean;
};

/** Drop emoji authors add to titles ("Quad Threat 🔥"); the site uses none. */
export function stripEmoji(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function toAgent(l: Listing): HubAgent {
  return {
    slug: l.slug,
    name: stripEmoji(l.name),
    description: l.description ?? "",
    version: l.version,
    author: {
      name: l.author?.name || l.author?.handle || "Unknown",
      handle: l.author?.handle ?? "",
    },
    digest: l.digest,
    bytes: l.bytes,
    publishedAt: l.published_at,
    free: l.free,
  };
}

async function fetchPage(page: number, query: string): Promise<HubAgent[]> {
  const params = new URLSearchParams({ page: String(page) });
  if (query) params.set("query", query);
  const res = await fetch(`${BOTCAMP_URL}/api/agents?${params}`, {
    next: { revalidate: REVALIDATE_SECONDS },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Catalogue request failed: ${res.status}`);
  const body = (await res.json()) as { listings?: Listing[] };
  return (body.listings ?? []).map(toAgent);
}

/** Every listed agent (newest first), optionally matching `query`. */
export async function getHubAgents(query = ""): Promise<HubAgent[]> {
  const agents: HubAgent[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await fetchPage(page, query.trim().slice(0, 100));
    agents.push(...batch);
    if (batch.length < PAGE_SIZE) break; // a short page is the last
  }
  return agents;
}

export async function getHubAgent(slug: string): Promise<HubAgent | null> {
  const matches = await getHubAgents(slug);
  return matches.find((a) => a.slug === slug) ?? null;
}

/** Where Condor's device login is approved — Botcamp's accounts, until they move here. */
export const condorConnectUrl = `${BOTCAMP_URL}/connect`;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

/* ------------------------------------------------------------------ */
/* Library: the catalogue joined with hackathon results                 */
/* ------------------------------------------------------------------ */

/** A Hub listing as the library shows it (Botcamp's /strategies cards). */
export type HubLibraryItem = HubAgent & {
  /** Where it trades, when known (its hackathon squad's venue). */
  exchanges: string[];
  /** Its finish in a Botcamp hackathon, if it raced. */
  showcase: { rank: number; hackathon: string } | null;
};

// Squads that aren't an exchange: their agents trade wherever they like.
const NON_VENUE_SQUADS = new Set(["botcamp"]);

/** The catalogue with each agent's race finish: racers first, by rank. */
export async function getHubLibrary(): Promise<HubLibraryItem[]> {
  const { FEATURED_HACKATHON, getRaceStandings } = await import("./hackathon");
  const [agents, standings] = await Promise.all([
    getHubAgents(),
    getRaceStandings().catch(() => null),
  ]);
  const raced = new Map((standings?.entries ?? []).map((e) => [e.slug, e]));

  return agents
    .map((agent) => {
      const entry = raced.get(agent.slug);
      const venue =
        entry?.squad && !NON_VENUE_SQUADS.has(entry.squad.toLowerCase())
          ? [entry.squad]
          : [];
      return {
        ...agent,
        exchanges: venue,
        showcase: entry
          ? { rank: entry.rank, hackathon: FEATURED_HACKATHON.title }
          : null,
      };
    })
    .sort((a, b) => (a.showcase?.rank ?? 999) - (b.showcase?.rank ?? 999));
}
