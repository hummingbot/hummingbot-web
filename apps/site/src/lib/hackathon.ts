/**
 * Botcamp hackathon results, from Botcamp's public endpoints:
 * `GET /api/hackathons/[slug]/leaderboard` (standings) and `/teams` (squads).
 */
import { BOTCAMP_URL, stripEmoji } from "./hub";

export const FEATURED_HACKATHON = {
  slug: "agent-builders-cup-1",
  title: "Agent Builders Cup",
};

const REVALIDATE_SECONDS = 300;

export type RaceEntry = {
  rank: number;
  slug: string;
  title: string;
  /** The title before its tagline ("MIDAS - Market Maker w/ …" → "MIDAS"). */
  shortTitle: string;
  driver: string;
  squad: string;
  volume: number;
  pnlPercent: number | null;
  score: number;
};

export type RaceSquad = {
  name: string;
  description: string;
  rank: number | null;
  score: number | null;
  agents: number;
};

export type RaceStandings = {
  entries: RaceEntry[];
  /** Sponsor squads, best-ranked first. */
  squadList: RaceSquad[];
  /** The squad that ranked first. */
  winningSquad: string | null;
  squads: number;
  totalVolume: number;
  /** When the standings were last computed. */
  generatedAt: string | null;
};

type Leaderboard = {
  generatedAt?: string;
  teams?: {
    teamId: string;
    rank: number;
    score?: number;
    agentIds?: string[];
  }[];
  agents?: {
    rank: number;
    slug: string;
    strategyTitle: string;
    teamId: string;
    score: number;
    pnlPercent?: number | null;
    driver?: { name?: string };
    metrics?: { volumeQuote?: number };
  }[];
};

type Teams = {
  teams?: { id: string; name: string; description?: string | null }[];
};

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BOTCAMP_URL}${path}`, {
    next: { revalidate: REVALIDATE_SECONDS },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return ((await res.json()) as { data: T }).data;
}

/** Agent titles carry taglines after a dash; standings show the name. */
export function shortTitle(title: string): string {
  return title.split(/\s+[-–—:|]\s+/)[0].trim() || title;
}

export async function getRaceStandings(
  slug = FEATURED_HACKATHON.slug,
): Promise<RaceStandings> {
  const [board, teams] = await Promise.all([
    getJson<Leaderboard>(`/api/hackathons/${slug}/leaderboard`),
    getJson<Teams>(`/api/hackathons/${slug}/teams`),
  ]);
  const squadName = new Map((teams.teams ?? []).map((t) => [t.id, t.name]));
  const entries = (board.agents ?? [])
    .map((a) => ({
      rank: a.rank,
      slug: a.slug,
      title: stripEmoji(a.strategyTitle),
      shortTitle: shortTitle(stripEmoji(a.strategyTitle)),
      driver: a.driver?.name ?? "",
      squad: squadName.get(a.teamId) ?? "",
      volume: a.metrics?.volumeQuote ?? 0,
      pnlPercent: a.pnlPercent ?? null,
      score: a.score,
    }))
    .sort((a, b) => a.rank - b.rank);
  const winner = (board.teams ?? []).find((t) => t.rank === 1);

  const ranked = new Map((board.teams ?? []).map((t) => [t.teamId, t]));
  const squadList: RaceSquad[] = (teams.teams ?? [])
    .map((t) => {
      const r = ranked.get(t.id);
      return {
        name: t.name,
        description: (t.description ?? "").trim(),
        rank: r?.rank ?? null,
        score: r?.score ?? null,
        agents: r?.agentIds?.length ?? 0,
      };
    })
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));

  return {
    entries,
    squadList,
    winningSquad: winner ? (squadName.get(winner.teamId) ?? null) : null,
    squads: board.teams?.length ?? squadName.size,
    totalVolume: entries.reduce((sum, e) => sum + e.volume, 0),
    generatedAt: board.generatedAt ?? null,
  };
}

/** Anchor of a squad's card on /hackathons ("XRPL" → "squad-xrpl"). */
export function squadAnchor(name: string): string {
  return `squad-${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

export function formatCompactUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}
