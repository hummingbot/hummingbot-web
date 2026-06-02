import { Github, Star } from "lucide-react";
import { formatStars } from "@/lib/github";

/**
 * Minimal GitHub link for the navbar — logo · star count. Presentational; the
 * parent fetches the star count (lib/github getRepoStats) and passes it in. The
 * count hides gracefully when unavailable (offline build / API rate-limit).
 */
export function GithubRepoWidget({
  repo,
  href,
  stars,
}: {
  repo: string;
  href: string;
  stars: number | null;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`${repo} on GitHub`}
      className="inline-flex items-center gap-2 text-sm text-ink-300 transition-colors hover:text-foreground"
    >
      <Github className="size-5 shrink-0" aria-hidden="true" />
      {stars != null && (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Star className="size-4" aria-hidden="true" />
          {formatStars(stars)}
        </span>
      )}
    </a>
  );
}
