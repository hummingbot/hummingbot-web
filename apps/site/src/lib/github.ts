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

/** Fetch all org repos once (stars + descriptions). Cached for a day (ISR). */
export async function getOrgRepos(): Promise<Map<string, RepoMeta>> {
  const map = new Map<string, RepoMeta>();
  try {
    const res = await fetch(
      `https://api.github.com/orgs/${githubOrg}/repos?per_page=100&type=public`,
      { headers, next: { revalidate: 86400 } },
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
  } catch {
    // Network unavailable at build — render names without live stars.
  }
  return map;
}

/** Latest published release tag for a repo (for the install version pill). */
export async function getLatestRelease(repo: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${githubOrg}/${repo}/releases/latest`,
      { headers, next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { tag_name?: string };
    return data.tag_name ?? null;
  } catch {
    return null;
  }
}

/** Total stars across the org's flagship repo (for the GitHub stars button). */
export async function getRepoStars(repo: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${githubOrg}/${repo}`, {
      headers,
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { stargazers_count?: number };
    return data.stargazers_count ?? null;
  } catch {
    return null;
  }
}

export type RepoStats = { stars: number; forks: number };

/** Stars + forks for a repo (for the navbar repo widget). */
export async function getRepoStats(repo: string): Promise<RepoStats | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${githubOrg}/${repo}`, {
      headers,
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      stargazers_count?: number;
      forks_count?: number;
    };
    return { stars: data.stargazers_count ?? 0, forks: data.forks_count ?? 0 };
  } catch {
    return null;
  }
}

export function formatStars(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
