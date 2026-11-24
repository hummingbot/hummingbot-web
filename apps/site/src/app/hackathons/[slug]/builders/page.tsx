import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { eyebrow, spacing } from "@/botcamp/lib/design-constants"
import { getRegisteredBuilders } from "@/botcamp/lib/hackathon-data"
import { BuilderShowcaseCard } from "@/botcamp/components/hackathons/BuilderShowcaseCard"
import { BuildersMap } from "@/botcamp/components/hackathons/BuildersMap"
import { EmptyState } from "@/botcamp/components/ui/empty-state"
import { ArrowLeft, Users } from "lucide-react"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const hackathon = await prisma.hackathon.findUnique({ where: { slug }, select: { title: true, status: true } })
  // A draft's name stays private, even in the tab title of its 404.
  return { title: hackathon && hackathon.status !== "DRAFT" ? `Agent Builders — ${hackathon.title}` : "Agent Builders" }
}

export default async function HackathonBuildersPage({ params }: PageProps) {
  const { slug } = await params
  const session = await auth()

  const hackathon = await prisma.hackathon.findUnique({
    where: { slug },
    select: { id: true, slug: true, title: true, status: true },
  })
  if (!hackathon || hackathon.status === "DRAFT") {
    notFound()
  }

  const { builders, total } = await getRegisteredBuilders(hackathon.id, {
    currentUserId: session?.user?.id,
  })
  // Surface the viewer's own card first.
  const orderedBuilders = [...builders].sort(
    (a, b) => Number(b.isYou ?? false) - Number(a.isYou ?? false),
  )

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className={spacing.section.md}>
          <div className="container mx-auto px-4 max-w-6xl">
            <Link
              href={`/hackathons/${hackathon.slug}`}
              className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {hackathon.title}
            </Link>
            <p className={eyebrow}>{hackathon.title}</p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-bc-tight">
              Registered Agent Builders
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              {total} {total === 1 ? "builder" : "builders"} registered to compete.
            </p>

            {builders.length > 0 && (
              <div className="mt-8">
                <BuildersMap builders={builders} />
              </div>
            )}

            <div className="mt-10">
              {builders.length === 0 ? (
                <div className="rounded-bc-xl border border-border bg-card">
                  <EmptyState
                    icon={Users}
                    title="No builders yet"
                    description="Be the first to register and tell teams what you're building."
                  />
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {orderedBuilders.map((b) => (
                    <BuilderShowcaseCard key={b.id} builder={b} showLocation />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
