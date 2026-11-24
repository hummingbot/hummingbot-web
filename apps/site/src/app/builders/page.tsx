import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import BuildersDirectoryClient from "@/botcamp/app/builders/BuildersDirectoryClient"
import { getDirectoryBuilders } from "@/botcamp/lib/builders"

// Botcamp's public builders directory (botcamp.xyz/builders), read from its
// database. Dynamic so the client child's useSearchParams() doesn't hit the
// static-prerender path without a Suspense boundary.
export const dynamic = "force-dynamic"

const BUILDERS_DESCRIPTION =
  "Browse Botcamp builders — everyone who's authored a trading strategy."

export const metadata = {
  title: "Builders Directory",
  description: BUILDERS_DESCRIPTION,
  openGraph: {
    type: "website",
    title: "Builders Directory",
    description: BUILDERS_DESCRIPTION,
    url: "/builders",
  },
  twitter: {
    card: "summary_large_image",
    title: "Builders Directory",
    description: BUILDERS_DESCRIPTION,
  },
}

export default async function BuildersPage() {
  const builders = await getDirectoryBuilders()
  return (
    <BuildersDirectoryClient
      initialBuilders={builders}
      header={<SiteHeader />}
      footer={<SiteFooter />}
    />
  )
}
