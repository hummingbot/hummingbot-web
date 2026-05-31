import { GitFork, Github, Star, Tag } from "lucide-react";
import { formatStars } from "@/lib/github";

/**
 * GitHub repo widget for the navbar — mirrors the Material-for-MkDocs repo card
 * the old hummingbot.org site showed: org/repo on top, then latest tag · stars ·
 * forks. Presentational; the parent fetches data (lib/github getRepoStats +
 * getLatestRelease) and passes it in. Stats hide gracefully when unavailable
 * (offline build / API rate-limit).
 */
export function GithubRepoWidget({
  repo,
  href,
  tag,
  stars,
  forks,
}: {
  repo: string;
  href: string;
  tag: string | null;
  stars: number | null;
  forks: number | null;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`${repo} on GitHub`}
      className="group inline-flex items-center gap-2.5 rounded-lg border border-ink-800 bg-ink-950/60 px-3 py-1.5 transition-colors hover:border-ink-700 hover:bg-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Github className="size-5 shrink-0 text-ink-300 group-hover:text-foreground" aria-hidden="true" />
      <span className="flex flex-col leading-tight">
        <span className="font-mono text-xs font-medium text-foreground" translate="no">
          {repo}
        </span>
        <span className="flex items-center gap-2 text-[11px] tabular-nums text-ink-500">
          {tag && (
            <span className="inline-flex items-center gap-0.5">
              <Tag className="size-3" aria-hidden="true" />
              {tag}
            </span>
          )}
          {stars != null && (
            <span className="inline-flex items-center gap-0.5">
              <Star className="size-3" aria-hidden="true" />
              {formatStars(stars)}
            </span>
          )}
          {forks != null && (
            <span className="inline-flex items-center gap-0.5">
              <GitFork className="size-3" aria-hidden="true" />
              {formatStars(forks)}
            </span>
          )}
        </span>
      </span>
    </a>
  );
}
