import { urls } from "@/config/site";
import { getLatestRelease, getRepoStats } from "@/lib/github";
import { GithubRepoWidget } from "./github-repo-widget";
import { SiteHeaderClient } from "./site-header-client";

/**
 * Server wrapper: fetches the flagship repo's tag/stars/forks (ISR-cached) and
 * passes a rendered GitHub repo widget into the interactive client shell. Async
 * server component — every page already awaits server components, so importers
 * don't change.
 */
export async function SiteHeader() {
  const [tag, stats] = await Promise.all([
    getLatestRelease("hummingbot"),
    getRepoStats("hummingbot"),
  ]);

  const widget = (
    <GithubRepoWidget
      repo="hummingbot/hummingbot"
      href={`${urls.github}/hummingbot`}
      tag={tag}
      stars={stats?.stars ?? null}
      forks={stats?.forks ?? null}
    />
  );

  return <SiteHeaderClient githubWidget={widget} />;
}
