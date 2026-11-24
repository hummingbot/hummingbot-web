import { Tag } from "lucide-react"
import { CourseCard } from "@/botcamp/components/courses/CourseCard"
import { CourseBundleOverviewDialog } from "@/botcamp/components/courses/CourseBundleOverviewDialog"
import type { CourseLevel } from "@/botcamp/lib/course-level"

// Hardcoded snapshot — same source of truth as the homepage Courses
// section, same CourseCard component as /courses for visual consistency.
const COURSES: Array<{
  slug: string
  title: string
  level: CourseLevel
  thumbnail: string
}> = [
  {
    slug: "intro-to-algo-trading",
    title: "Intro to Algo Trading",
    level: "BASIC",
    thumbnail: "/botcamp-assets/courses/intro-to-algo-trading.png",
  },
  {
    slug: "market-making-strategies",
    title: "Market Making Strategies",
    level: "INTERMEDIATE",
    thumbnail: "/botcamp-assets/courses/market-making-strategies.png",
  },
  {
    slug: "directional-strategies-and-hummingbot-v2-framework",
    title: "Directional Strategies & V2 Framework",
    level: "INTERMEDIATE",
    thumbnail: "/botcamp-assets/courses/directional-strategies-v2-framework.png",
  },
  {
    slug: "cross-exchange-market-making",
    title: "Cross Exchange Market Making",
    level: "ADVANCED",
    thumbnail: "/botcamp-assets/courses/cross-exchange-market-making.png",
  },
]

export default function CoursesIncluded() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/20 border-t border-border">
      <div className="container mx-auto px-4 md:px-6 max-w-7xl">
        <div className="text-center mb-10">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-3">
            Courses Included
          </p>
          <h2 className="text-3xl font-bold tracking-bc-tight sm:text-4xl md:text-5xl mb-4 text-foreground">
            Four courses, included with every cohort.
          </h2>
          <p className="text-foreground/80 max-w-2xl mx-auto">
            Cohort enrollment automatically unlocks all four self-paced
            courses — an $800 value, 20+ hours of instruction. Theory,
            quizzes, and strategy coding challenges, all in the Hummingbot
            framework.
          </p>
          <CourseBundleOverviewDialog
            trigger={
              <button
                type="button"
                className="mt-6 inline-flex items-center gap-2.5 rounded-full border-2 border-primary bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:scale-[1.03] hover:shadow-lg"
              >
                <Tag className="h-4 w-4" />
                Prefer to go at your own pace? Each course is also available individually
              </button>
            }
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {COURSES.map((course, index) => (
            <CourseCard key={course.slug} {...course} index={index} />
          ))}
        </div>

        {/* Botcamp Live Sessions */}
        <div className="mt-8">
          <div className="bg-card p-6 rounded-bc-xl border border-border">
            <div className="text-center">
              <h4 className="text-xl font-bold mb-2 text-primary">
                Botcamp Live Sessions
              </h4>
              <p className="text-card-foreground text-sm leading-relaxed">
                Cohort enrollment also includes <span className="font-semibold">immediate access</span> to all recorded live sessions from the previous cohort — <span className="font-semibold">over 20 hours</span> of in-depth market making instruction.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
