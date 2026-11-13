import { notFound } from "next/navigation"
import { ReadOnlyFetchGuard } from "@/botcamp/components/layout/ReadOnlyFetchGuard"
import { pageBackgrounds } from "@/botcamp/lib/design-constants"
import { auth, isDashboardPreviewEnabled } from "@/botcamp/lib/preview-session"
import { PreviewSessionProvider } from "@/botcamp/lib/preview-session-client"
import { SiteHeader } from "@/components/layout/site-header"

/**
 * Wrapper for Botcamp's course/cohort pages (/courses/*, /cohorts/*), the
 * READ-ONLY preview behind the dashboard's Start/Continue links. Same rules
 * as src/app/dashboard/layout.tsx: it shows a real user's progress without a
 * login, so it 404s in production and whenever the preview is off or
 * DASHBOARD_PREVIEW_USER isn't a Botcamp user. Writes are refused by the
 * Prisma client, the pages skip them, and ReadOnlyFetchGuard answers any
 * write request from the browser.
 */
export async function PreviewChrome({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production" || !isDashboardPreviewEnabled()) notFound()
  const session = await auth()
  if (!session) notFound()

  return (
    <PreviewSessionProvider session={session}>
      <ReadOnlyFetchGuard />
      <div className={`fixed inset-0 ${pageBackgrounds.default} -z-10`} />
      <SiteHeader
        account={{
          name: session.user.name,
          // Botcamp-relative avatars aren't served here; those fall back to initials.
          image: session.user.image?.startsWith("http") ? session.user.image : null,
          isAdmin: session.user.role === "ADMIN",
        }}
      />
      {children}
    </PreviewSessionProvider>
  )
}
