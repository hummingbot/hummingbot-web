import type { Session } from "next-auth";
import { servableAvatarUrl } from "@/botcamp/lib/botcamp-assets";
import { getRepoStars } from "@/lib/github";
import { SiteHeaderClient, type HeaderAccount } from "./site-header-client";

/** The header's account menu for a signed-in session. */
export function headerAccount(session: Session): HeaderAccount {
  return {
    name: session.user.name || session.user.email || null,
    image: servableAvatarUrl(session.user.image),
    isAdmin: session.user.role === "ADMIN",
  };
}

/**
 * Site header. Kept as a server entry point so pages can keep awaiting it.
 * Pages that already read the session (the dashboard) pass the account; on
 * every other page the client reads it (useSession), so reading cookies
 * doesn't make static pages (home, blog, docs) dynamic.
 */
export async function SiteHeader({ account }: { account?: HeaderAccount } = {}) {
  // Hummingbot's star count for the GitHub link (cached for an hour, so static
  // pages stay static).
  const githubStars = await getRepoStars("hummingbot");
  return <SiteHeaderClient account={account} githubStars={githubStars} />;
}
