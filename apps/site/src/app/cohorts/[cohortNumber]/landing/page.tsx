import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/botcamp/lib/prisma"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { getTestimonialMembers } from "@/botcamp/lib/builders"
import { Button } from "@/botcamp/components/ui/button"
import { Badge } from "@/botcamp/components/ui/badge"
import { Card, CardContent } from "@/botcamp/components/ui/card"
import { pageBackgrounds } from "@/botcamp/lib/design-constants"
import CoursesIncluded from "@/botcamp/components/sections/cohorts/CoursesIncluded"
import CohortFAQ from "@/botcamp/components/sections/cohorts/CohortFAQ"
import CohortInstructors from "@/botcamp/components/sections/cohorts/Instructors"
import Testimonials from "@/botcamp/components/sections/Testimonials"
import { ReadOnlyHint } from "@/botcamp/components/ui/read-only"
import { YouTubeFacade } from "@/components/ui/youtube-facade"
import {
  Clock,
  Users,
  Calendar,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
} from "lucide-react"

// Botcamp's public cohort landing (botcamp.xyz/cohorts/cohort<N>/landing), the
// overview's "Enroll" target, read from its database. Always Botcamp's
// signed-out view (no sign-in here). Left out:
// - Stripe checkout: the enroll button renders disabled with the read-only
//   hint (Botcamp's button posts to /api/checkout).
// - Cohort13Landing: Botcamp only shows it while cohort 13 is open; it is
//   COMPLETED, so the page redirects before reaching it.
// - The YAML schedule (cohorts/cohort<N>.yaml): Botcamp only has files for
//   past cohorts, which never render this page.

export const dynamic = "force-dynamic"

const TELEGRAM_LINK = "https://t.me/botcampcohorts"
const INFO_SESSION_VIDEO_ID = "n2_0mHHn5oI"

interface PageProps {
  params: Promise<{ cohortNumber: string }>
}

// Get basic cohort info from DB (needed for checkout, enrollment, etc.)
async function getCohort(cohortNumber: number) {
  const cohort = await prisma.cohort.findUnique({
    where: { number: cohortNumber },
    select: {
      id: true,
      number: true,
      title: true,
      description: true,
      status: true,
      startDate: true,
      endDate: true,
      price: true,
      maxStudents: true,
      retainedSeats: true,
      registrationUrl: true,
      _count: {
        select: { enrollments: true },
      },
    },
  })

  if (!cohort) return null

  // Calculate spots remaining dynamically
  const spotsRemaining = cohort.maxStudents
    ? Math.max(0, cohort.maxStudents - cohort.retainedSeats - cohort._count.enrollments)
    : null

  return {
    ...cohort,
    spotsRemaining,
  }
}

/** Botcamp's checkout button look, disabled: checkout is a write. */
function EnrollButton({ price }: { price: number }) {
  return (
    <ReadOnlyHint>
      <Button size="lg" disabled>
        Enroll Now - ${(price / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </ReadOnlyHint>
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { cohortNumber: cohortNumberStr } = await params
  const cohortNumber = parseInt(cohortNumberStr.replace("cohort", ""))
  const cohort = isNaN(cohortNumber) ? null : await getCohort(cohortNumber)

  if (!cohort) {
    return { title: "Cohort Not Found" }
  }

  return {
    title: `${cohort.title || `Cohort ${cohort.number}`} - Enroll Now - Botcamp`,
    description: cohort.description || `Enroll in Botcamp Cohort ${cohort.number}`,
  }
}

export default async function CohortLandingPage({ params }: PageProps) {
  const { cohortNumber: cohortNumberStr } = await params
  const cohortNumber = parseInt(cohortNumberStr.replace("cohort", ""))

  if (isNaN(cohortNumber)) {
    notFound()
  }

  const cohort = await getCohort(cohortNumber)

  if (!cohort) {
    notFound()
  }

  // Only show landing page for UPCOMING or ACTIVE cohorts
  if (cohort.status === "COMPLETED") {
    redirect(`/cohorts/cohort${cohortNumber}`)
  }

  const testimonialMembers = await getTestimonialMembers()

  const formatDateRange = (start: Date, end: Date) => {
    const startStr = new Date(start).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    })
    const endStr = new Date(end).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    })
    return `${startStr} - ${endStr}`
  }

  return (
    <div className={`min-h-screen flex flex-col ${pageBackgrounds.cohorts}`}>
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
          <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-background py-16 md:py-24">
            <div className="container mx-auto px-4 relative z-10">
              <Link
                href="/botcamp#cohorts"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
              >
                <ArrowLeft className="h-4 w-4" />
                All Cohorts
              </Link>
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <Badge variant="outline" className="mb-4 bg-green-500/10 text-green-500 border-green-500/20">
                    {cohort.status === "ACTIVE" ? "In Progress" : "Now Enrolling"}
                  </Badge>

                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                    Botcamp Cohort {cohort.number}
                  </h1>

                  {cohort.description && (
                    <p className="text-xl text-muted-foreground mb-6">
                      {cohort.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-6 text-muted-foreground mb-8">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <span>{formatDateRange(cohort.startDate, cohort.endDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <span>4 weeks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <span>Live sessions + Office hours</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    {cohort.price && cohort.price > 0 ? (
                      <EnrollButton price={cohort.price} />
                    ) : cohort.registrationUrl ? (
                      <Button size="lg" asChild>
                        <a href={cohort.registrationUrl} target="_blank" rel="noopener noreferrer">
                          Enroll Now
                        </a>
                      </Button>
                    ) : (
                      <Button size="lg" disabled>
                        Coming Soon
                      </Button>
                    )}
                    <Button size="lg" variant="outline" asChild>
                      <a href={TELEGRAM_LINK} target="_blank" rel="noopener noreferrer">
                        Join Telegram
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Info Session Video */}
                <div className="relative">
                  <Card className="overflow-hidden">
                    <CardContent className="p-0">
                      <YouTubeFacade videoId={INFO_SESSION_VIDEO_ID} title="Botcamp Info Session" />
                    </CardContent>
                  </Card>
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Watch the info session to learn what Botcamp is all about
                  </p>
                </div>
              </div>
            </div>
          </section>

        {/* Testimonials - show for all cohorts */}
        <Testimonials members={testimonialMembers} />

        <CoursesIncluded />

        {/* FAQ */}
        <CohortFAQ />

        {/* Instructors */}
        <CohortInstructors />

        {/* Final CTA Section */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-background to-muted/50">
          <div className="container mx-auto px-4">
            <Card className="max-w-2xl mx-auto border-primary/20">
              <CardContent className="p-8 text-center">
                  <>
                    <h2 className="text-2xl font-bold mb-4">Ready to Start Your Trading Journey?</h2>
                    <p className="text-muted-foreground mb-6">
                      Join Cohort {cohort.number} and learn professional algorithmic trading from industry experts.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                      {cohort.price && cohort.price > 0 ? (
                        <EnrollButton price={cohort.price} />
                      ) : cohort.registrationUrl ? (
                        <Button size="lg" asChild>
                          <a href={cohort.registrationUrl} target="_blank" rel="noopener noreferrer">
                            Enroll Now
                          </a>
                        </Button>
                      ) : (
                        <Button size="lg" disabled>
                          Coming Soon
                        </Button>
                      )}
                      <Button size="lg" variant="outline" asChild>
                        <a href={TELEGRAM_LINK} target="_blank" rel="noopener noreferrer">
                          Ask Questions in Telegram
                        </a>
                      </Button>
                    </div>
                  </>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
