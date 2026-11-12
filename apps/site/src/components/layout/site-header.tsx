import { SiteHeaderClient, type HeaderAccount } from "./site-header-client";

/**
 * Site header. Kept as a server entry point so pages can keep awaiting it.
 * With an `account` (the dashboard's preview user) it shows the avatar menu
 * in place of Sign in.
 */
export async function SiteHeader({ account }: { account?: HeaderAccount } = {}) {
  return <SiteHeaderClient account={account} />;
}
