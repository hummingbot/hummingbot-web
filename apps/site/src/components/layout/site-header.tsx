import { auth, isDashboardPreviewEnabled } from "@/botcamp/lib/preview-session";
import { SiteHeaderClient, type HeaderAccount } from "./site-header-client";

/**
 * Site header. Kept as a server entry point so pages can keep awaiting it.
 * There's no sign-in on this site yet: with the dashboard preview on (local
 * development only), every page shows the preview user's avatar menu, so the
 * dashboard is reachable from anywhere. Otherwise it shows Sign in.
 */
export async function SiteHeader({ account }: { account?: HeaderAccount } = {}) {
  let resolved = account;
  if (!resolved && isDashboardPreviewEnabled()) {
    const session = await auth().catch(() => null);
    if (session) {
      resolved = {
        name: session.user.name,
        // Botcamp-relative avatars aren't served here; those fall back to initials.
        image: session.user.image?.startsWith("http") ? session.user.image : null,
        isAdmin: session.user.role === "ADMIN",
      };
    }
  }
  return <SiteHeaderClient account={resolved} />;
}
