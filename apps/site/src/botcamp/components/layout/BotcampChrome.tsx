import { pageBackgrounds } from "@/botcamp/lib/design-constants"
import { auth } from "@/botcamp/lib/auth"
import { SiteHeader, headerAccount } from "@/components/layout/site-header"

/**
 * Wrapper for Botcamp's course/cohort pages (/courses and the cohort learn pages),
 * which signed-out visitors can browse too: the pages decide access, as on
 * Botcamp.
 */
export async function BotcampChrome({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <>
      <div className={`fixed inset-0 ${pageBackgrounds.default} -z-10`} />
      <SiteHeader account={session?.user ? headerAccount(session) : undefined} />
      {children}
    </>
  )
}
