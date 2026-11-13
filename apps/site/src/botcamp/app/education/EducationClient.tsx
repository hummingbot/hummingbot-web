'use client'

import { useState, type ReactNode } from 'react'
import { Button } from '@/botcamp/components/ui/button'
import { ChevronDown } from 'lucide-react'
import HummingbotMetrics from "@/botcamp/components/sections/cohorts/HummingbotMetrics"
import CohortInstructors from "@/botcamp/components/sections/cohorts/Instructors"
import CohortFAQ from "@/botcamp/components/sections/cohorts/CohortFAQ"
import CoursesIncluded from "@/botcamp/components/sections/cohorts/CoursesIncluded"
import { BotcampMission } from "@/botcamp/components/sections/cohorts/BotcampMission"
import Testimonials from "@/botcamp/components/sections/Testimonials"
import type { TestimonialMember } from "@/botcamp/components/sections/testimonial-members"
import { EducationHero } from "./EducationHero"
import { DarkArtsSection } from "./DarkArtsSection"
import { BotcampNumbers } from "./BotcampNumbers"
import { Cohort14Hero } from "@/botcamp/components/cohorts/Cohort14Hero"
import { CohortListCard } from "@/botcamp/components/cohorts/CohortListCard"

const TELEGRAM_LINK = "https://t.me/botcampcohorts"

interface Cohort {
  id: string
  number: number
  status: string
  startDate: string
  endDate: string
  description: string
  demoDayURL?: string
  price?: number | null
  maxStudents?: number | null
  spotsRemaining?: number | null
}

interface CohortStats {
  totalCohorts: number
  totalMembers: number
  certifiedStrategies: number
}

interface EducationClientProps {
  initialCohorts: Cohort[]
  initialCohortStats: CohortStats
  cohort14RegisteredCount?: number
  enrolledCohortIds?: string[]
  isAlumni?: boolean
  hasMultiCourseDiscount?: boolean
  // The site's own header and footer (server components), in Botcamp's slots.
  testimonialMembers?: TestimonialMember[]
  header?: ReactNode
  footer?: ReactNode
}

export default function EducationClient({
  initialCohorts,
  initialCohortStats,
  cohort14RegisteredCount,
  enrolledCohortIds = [],
  isAlumni = false,
  hasMultiCourseDiscount = false,
  testimonialMembers = [],
  header,
  footer,
}: EducationClientProps) {
  // Future Cohort 14 enrollment surfaces may use these again.
  void isAlumni
  void hasMultiCourseDiscount
  const [showAllPastCohorts, setShowAllPastCohorts] = useState(false)

  const cohorts = initialCohorts
  const cohortStats = initialCohortStats
  const enrolledCohortSet = new Set(enrolledCohortIds)

  // Cohort 13 (currently the latest active cohort in the DB) is now treated as
  // a past cohort in the listing; the featured hero advertises the next cohort
  // (Cohort 14) and collects interest registrations until the schedule is set.
  const FEATURED_COHORT_NUMBER = 14
  const otherUpcomingCohorts = cohorts.filter(
    (c) =>
      (c.status === "upcoming" || c.status === "active") &&
      c.number !== FEATURED_COHORT_NUMBER &&
      c.number !== 13,
  )
  const completedCohorts = cohorts.filter(
    (c) => c.status === "completed" || c.number === 13,
  )

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {header}
      <main className="flex-1 relative">
        {/* Education hero */}
        <EducationHero
          totalMembers={cohortStats.totalMembers}
          certifiedStrategies={cohortStats.certifiedStrategies}
          totalCohorts={cohortStats.totalCohorts}
        />

        {/* Cohorts */}
        <div id="cohorts" className="relative scroll-mt-16 pb-24">
          <div className="container mx-auto px-4 relative z-10 max-w-7xl">
            {/* Featured: Cohort 14 — Register Interest hero */}
            <div className="mb-6">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-3">
                Featured — Next Cohort
              </p>
              <Cohort14Hero
                cohortNumber={FEATURED_COHORT_NUMBER}
                registeredCount={cohort14RegisteredCount}
              />
            </div>

            {/* Other Upcoming Cohorts */}
            {otherUpcomingCohorts.length > 0 && (
              <div className="mb-10">
                <div className="flex items-baseline justify-between mb-5">
                  <h2 className="text-2xl md:text-3xl font-bold tracking-bc-tight">
                    Other upcoming cohorts
                  </h2>
                  <p className="text-sm text-muted-foreground font-mono">
                    {otherUpcomingCohorts.length} {otherUpcomingCohorts.length === 1 ? "cohort" : "cohorts"}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {otherUpcomingCohorts.map((cohort, index) => (
                    <CohortListCard
                      key={cohort.number}
                      number={cohort.number}
                      startDate={cohort.startDate}
                      endDate={cohort.endDate}
                      description={cohort.description}
                      isEnrolled={enrolledCohortSet.has(cohort.id)}
                      variant="upcoming"
                      index={index}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Cohorts */}
            {completedCohorts.length > 0 && (
              <div>
                <div className="flex items-baseline justify-between mb-5">
                  <h2 className="text-2xl md:text-3xl font-bold tracking-bc-tight">
                    Past cohorts
                  </h2>
                  <p className="text-sm text-muted-foreground font-mono">
                    {completedCohorts.length} {completedCohorts.length === 1 ? "cohort" : "cohorts"}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(showAllPastCohorts ? completedCohorts : completedCohorts.slice(0, 3)).map((cohort, index) => (
                    <CohortListCard
                      key={cohort.number}
                      number={cohort.number}
                      startDate={cohort.startDate}
                      endDate={cohort.endDate}
                      description={cohort.description}
                      isEnrolled={enrolledCohortSet.has(cohort.id)}
                      variant="completed"
                      index={index}
                    />
                  ))}
                </div>

                {completedCohorts.length > 3 && (
                  <div className="flex justify-center mt-8">
                    <Button
                      variant="outline"
                      onClick={() => setShowAllPastCohorts(!showAllPastCohorts)}
                      className="flex items-center gap-2"
                    >
                      <span>{showAllPastCohorts ? 'Show Less' : `Show All ${completedCohorts.length} Cohorts`}</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${showAllPastCohorts ? 'rotate-180' : ''}`} />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div id="courses" className="scroll-mt-16">
          <CoursesIncluded />
        </div>

        <DarkArtsSection />

        <BotcampMission />

        <BotcampNumbers
          totalCohorts={cohortStats.totalCohorts}
          totalMembers={cohortStats.totalMembers}
          certifiedStrategies={cohortStats.certifiedStrategies}
          telegramLink={TELEGRAM_LINK}
        />

        <Testimonials members={testimonialMembers} />

        <CohortFAQ />
        <HummingbotMetrics />
        <CohortInstructors />
      </main>
      {footer}
    </div>
  )
}
