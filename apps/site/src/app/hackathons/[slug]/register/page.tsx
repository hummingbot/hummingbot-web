import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/botcamp/lib/prisma"
import { isRegistrationOpen, registrationClosedCopy } from "@/botcamp/lib/hackathon-stages"
import { auth } from "@/botcamp/lib/auth"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { RegistrationForm } from "@/botcamp/components/hackathons/RegistrationForm"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/botcamp/components/ui/card"
import { Badge } from "@/botcamp/components/ui/badge"
import { Button } from "@/botcamp/components/ui/button"
import { spacing } from "@/botcamp/lib/design-constants"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getHackathon(slug: string) {
  const hackathon = await prisma.hackathon.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      teamIds: true,
      registrationStart: true,
      registrationEnd: true,
      raceStart: true,
      raceEnd: true,
    },
  })

  if (!hackathon || hackathon.status === "DRAFT") {
    return null
  }

  const teams = hackathon.teamIds.length
    ? await prisma.team.findMany({
        where: { id: { in: hackathon.teamIds } },
        select: { id: true, name: true, logoUrl: true, logoUrlDark: true },
        orderBy: { sortOrder: "asc" },
      })
    : []

  return { ...hackathon, teams }
}

async function getUserEntry(userId: string, hackathonId: string) {
  return prisma.hackathonEntry.findUnique({
    where: { hackathonId_userId: { hackathonId, userId } },
    select: { id: true },
  })
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const hackathon = await prisma.hackathon.findUnique({
    where: { slug },
    select: { title: true, status: true },
  })

  // A draft's name stays private, even in the tab title of its 404.
  if (!hackathon || hackathon.status === "DRAFT") {
    return { title: "Hackathon Not Found" }
  }

  return {
    title: `Register - ${hackathon.title} - Botcamp`,
    description: `Register for ${hackathon.title}`,
  }
}

export default async function HackathonRegisterPage({ params }: PageProps) {
  const { slug } = await params
  const session = await auth()

  if (!session?.user) {
    redirect(`/signin?callbackUrl=/hackathons/${slug}/register`)
  }

  const hackathon = await getHackathon(slug)
  if (!hackathon) {
    notFound()
  }

  // Already registered → their home is the racing hub.
  const existingEntry = await getUserEntry(session.user.id, hackathon.id)
  if (existingEntry) {
    redirect(`/dashboard/hackathons/${hackathon.slug}`)
  }

  // Registration not open
  const registrationClosed = !isRegistrationOpen(hackathon)
  if (registrationClosed) {
    const closed = registrationClosedCopy(hackathon, "Registration")
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SiteHeader />
        <main className="flex-1">
          <section className={spacing.section.md}>
            <div className="container mx-auto px-4 max-w-lg">
              <Card>
                <CardHeader>
                  <CardTitle>{closed.title}</CardTitle>
                  <CardDescription>{closed.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline">
                    <Link href={`/hackathons/${hackathon.slug}`}>View {hackathon.title}</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

          <div className="container mx-auto px-4 py-12 md:py-16 relative z-10">
            <div className="max-w-2xl mx-auto text-center">
              <Badge variant="outline" className="mb-4">Step 1 of 2</Badge>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">Register for {hackathon.title}</h1>
              <p className="text-lg text-muted-foreground">
                Tell us about the trading agent you want to build. This helps teams understand your vision.
              </p>
            </div>
          </div>
        </section>

        {/* Form */}
        <section className={spacing.section.md}>
          <div className="container mx-auto px-4 max-w-xl">
            <Card>
              <CardContent className="pt-6">
                <RegistrationForm hackathonSlug={hackathon.slug} teams={hackathon.teams} />
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
