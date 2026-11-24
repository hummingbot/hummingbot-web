import { MarkdownContent } from "@/botcamp/components/lessons/MarkdownContent"
import { TERMS_OF_SERVICE } from "@/botcamp/content/terms-of-service"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"

// Botcamp's Terms of Service, as on botcamp.xyz/terms: sign-up asks people to
// accept them, so the link has to resolve here.
const TERMS_DESCRIPTION = "Terms of Service for Botcamp's website, courses, cohorts, competitions, and hackathons."

export const metadata = {
  title: "Terms of Service",
  description: TERMS_DESCRIPTION,
  openGraph: {
    type: "website",
    title: "Terms of Service",
    description: TERMS_DESCRIPTION,
    url: "/terms",
  },
}

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="container mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-20">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8">Terms of Service Agreement</h1>
        <MarkdownContent content={TERMS_OF_SERVICE} />
      </main>
      <SiteFooter />
    </>
  )
}
