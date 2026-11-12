import { prisma } from "@/botcamp/lib/prisma"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import EducationClient from "@/botcamp/app/education/EducationClient"
import { getTestimonialMembers } from "@/botcamp/lib/builders"

// ISR: Revalidate every 60 seconds for fresh cohort/course data
export const revalidate = 60

const EDUCATION_DESCRIPTION =
  "Small-batch live cohorts and self-paced courses that teach professional market making with the Hummingbot framework."

export const metadata = {
  title: "Education",
  description: EDUCATION_DESCRIPTION,
  openGraph: {
    type: "website",
    title: "Education",
    description: EDUCATION_DESCRIPTION,
    url: "/botcamp",
  },
  twitter: {
    card: "summary_large_image",
    title: "Education",
    description: EDUCATION_DESCRIPTION,
  },
}

async function getCohorts() {
  const cohorts = await prisma.cohort.findMany({
    orderBy: { number: "desc" },
    select: {
      id: true,
      number: true,
      status: true,
      startDate: true,
      endDate: true,
      description: true,
      demoDayUrl: true,
      price: true,
      maxStudents: true,
      retainedSeats: true,
      _count: {
        select: { enrollments: true },
      },
    },
  })

  return cohorts.map((cohort) => {
    // Calculate spots remaining: maxStudents - retainedSeats - enrollmentCount
    const spotsRemaining = cohort.maxStudents
      ? Math.max(0, cohort.maxStudents - cohort.retainedSeats - cohort._count.enrollments)
      : null

    return {
      id: cohort.id,
      number: cohort.number,
      status: cohort.status.toLowerCase(),
      startDate: cohort.startDate.toISOString(),
      endDate: cohort.endDate.toISOString(),
      description: cohort.description || "",
      demoDayURL: cohort.demoDayUrl || undefined,
      price: cohort.price,
      maxStudents: cohort.maxStudents,
      spotsRemaining,
    }
  })
}

async function getCohortStats() {
  const [totalCohorts, totalMembers, certifiedStrategies] = await Promise.all([
    prisma.cohort.count({ where: { status: "COMPLETED", number: { not: 0 } } }),
    prisma.user.count({ where: { isMember: true } }),
    prisma.strategy.count({ where: { status: "CERTIFIED" } }),
  ])

  return {
    totalCohorts,
    totalMembers,
    certifiedStrategies,
  }
}

// Cohort 14 has no DB row yet — interest is tracked as course-bundle deposits
// (see src/lib/bundle.ts). Each $400 deposit grants every published course
// for $0 in a single Stripe payment, so distinct stripePaymentIds among
// those zero-cost course enrollments is the count of people registered.
async function getCohort14RegisteredCount() {
  const bundleEnrollments = await prisma.enrollment.findMany({
    where: {
      courseId: { not: null },
      pricePaid: 0,
      stripePaymentId: { not: null },
    },
    select: { stripePaymentId: true },
    distinct: ["stripePaymentId"],
  })

  return bundleEnrollments.length
}

async function getUserCohortEnrollments(userId: string | undefined) {
  if (!userId) return { enrolledIds: new Set<string>(), isAlumni: false, courseEnrollmentCount: 0 }

  const [cohortEnrollments, courseEnrollmentCount] = await Promise.all([
    prisma.enrollment.findMany({
      where: {
        userId,
        cohortId: { not: null },
      },
      select: {
        cohortId: true,
      },
    }),
    prisma.enrollment.count({
      where: {
        userId,
        courseId: { not: null },
      },
    }),
  ])

  const enrolledIds = new Set(cohortEnrollments.map(e => e.cohortId).filter((id): id is string => id !== null))
  // User is alumni if they have any cohort enrollment
  const isAlumni = enrolledIds.size > 0

  return { enrolledIds, isAlumni, courseEnrollmentCount }
}

export default async function EducationPage() {
  // No sign-in on this site: always the signed-out view.
  const session = null as { user?: { id?: string } } | null
  const [cohorts, cohortStats, cohort14RegisteredCount, userCohortEnrollments, testimonialMembers] = await Promise.all([
    getCohorts(),
    getCohortStats(),
    getCohort14RegisteredCount(),
    getUserCohortEnrollments(session?.user?.id),
    getTestimonialMembers(),
  ])

  // Multi-course discount applies to non-alumni who have purchased 3+ courses
  const hasMultiCourseDiscount =
    !userCohortEnrollments.isAlumni && userCohortEnrollments.courseEnrollmentCount >= 3

  return (
    <EducationClient
      initialCohorts={cohorts}
      initialCohortStats={cohortStats}
      cohort14RegisteredCount={cohort14RegisteredCount}
      enrolledCohortIds={Array.from(userCohortEnrollments.enrolledIds)}
      isAlumni={userCohortEnrollments.isAlumni}
      hasMultiCourseDiscount={hasMultiCourseDiscount}
      testimonialMembers={testimonialMembers}
      header={<SiteHeader />}
      footer={<SiteFooter />}
    />
  )
}
