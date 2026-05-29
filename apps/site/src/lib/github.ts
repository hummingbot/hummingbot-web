import { githubOrg } from "@/config/site";

export type RepoMeta = {
  name: string;
  description: string | null;
  stars: number;
  url: string;
};

const headers: HeadersInit = {
  Accept: "application/vnd.github+json",
  "User-Agent": "hummingbot-web",
  ...(process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {}),
};

// Cap each GitHub call so a slow API can't stall first render / the build.
const TIMEOUT_MS = 5000;

/** Fetch all org repos once (stars + descriptions). Cached for a day (ISR). */
export async function getOrgRepos(): Promise<Map<string, RepoMeta>> {
  const map = new Map<string, RepoMeta>();
  try {
    const res = await fetch(
      `https://api.github.com/orgs/${githubOrg}/repos?per_page=100&type=public`,
      { headers, next: { revalidate: 86400 }, signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (!res.ok) return map;
    const repos = (await res.json()) as {
      name: string;
      description: string | null;
      stargazers_count: number;
      html_url: string;
    }[];
    for (const r of repos) {
      map.set(r.name, {
        name: r.name,
        description: r.description,
        stars: r.stargazers_count,
        url: r.html_url,
      });
    }
  } catch (err) {
    // Network/timeout at build — render names without live stars, but log it.
    console.warn(`[github] getOrgRepos failed: ${(err as Error).message}`);
  }
  return map;
}

/** Latest published release tag for a repo (for the install version pill). */
export async function getLatestRelease(repo: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${githubOrg}/${repo}/releases/latest`,
      { headers, next: { revalidate: 3600 }, signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { tag_name?: string };
    return data.tag_name ?? null;
  } catch (err) {
    console.warn(`[github] getLatestRelease(${repo}) failed: ${(err as Error).message}`);
    return null;
  }
}

/** Total stars across the org's flagship repo (for the GitHub stars button). */
export async function getRepoStars(repo: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${githubOrg}/${repo}`, {
      headers,
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { stargazers_count?: number };
    return data.stargazers_count ?? null;
  } catch (err) {
    console.warn(`[github] getRepoStars(${repo}) failed: ${(err as Error).message}`);
    return null;
  }
}

export function formatStars(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
