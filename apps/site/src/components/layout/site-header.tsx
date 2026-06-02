import { urls } from "@/config/site";
import { getRepoStats } from "@/lib/github";
import { GithubRepoWidget } from "./github-repo-widget";
import { SiteHeaderClient } from "./site-header-client";

/**
 * Server wrapper: fetches the flagship repo's star count (ISR-cached) and passes
 * a rendered GitHub repo widget into the interactive client shell. Async server
 * component — every page already awaits server components, so importers don't
 * change.
 */
export async function SiteHeader() {
  const stats = await getRepoStats("hummingbot");

  const widget = (
    <GithubRepoWidget
      repo="hummingbot/hummingbot"
      href={`${urls.github}/hummingbot`}
      stars={stats?.stars ?? null}
    />
  );

  return <SiteHeaderClient githubWidget={widget} />;
}
