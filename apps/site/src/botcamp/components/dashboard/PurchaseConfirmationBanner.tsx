import { CheckCircle } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/botcamp/components/ui/card"
import { CourseListItem } from "@/botcamp/components/courses/CourseListItem"
import { BUNDLE_DEPOSIT_TARGET_COHORT_NUMBER, BUNDLE_PRICE_CENTS } from "@/botcamp/lib/bundle"
import type { CourseLevel } from "@/botcamp/lib/course-level"

interface UnlockedCourse {
  slug: string
  title: string
  level?: CourseLevel | null
  thumbnail?: string | null
  totalLessons: number
}

interface PurchaseConfirmationBannerProps {
  purchase?: string
  unlockedCourses?: UnlockedCourse[]
}

const PURCHASE_COPY: Record<
  string,
  { eyebrow: string; title: string; description: string }
> = {
  bundle: {
    eyebrow: "Deposit confirmed",
    title: `You're in for Cohort ${BUNDLE_DEPOSIT_TARGET_COHORT_NUMBER}`,
    description: `Your $${(BUNDLE_PRICE_CENTS / 100).toFixed(0)} deposit will be applied in full toward your Cohort ${BUNDLE_DEPOSIT_TARGET_COHORT_NUMBER} tuition, and you now have lifetime access to every Botcamp course. We've also sent you a confirmation email.`,
  },
}

/**
 * One-shot success banner shown right after a checkout redirect, driven by
 * the `?purchase=` query param the success route appends (e.g. `bundle`).
 * Renders nothing once the user navigates away and the param is gone.
 */
export function PurchaseConfirmationBanner({
  purchase,
  unlockedCourses,
}: PurchaseConfirmationBannerProps) {
  const copy = purchase ? PURCHASE_COPY[purchase] : undefined
  if (!copy) return null

  return (
    <Card className="shadow-none rounded-bc-xl border-primary/30 border-l-4 border-l-primary bg-gradient-to-br from-primary/10 to-transparent">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-bc-md bg-botcamp-lime/15 text-botcamp-lime">
            <CheckCircle className="h-5 w-5" />
          </span>
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-1">
              {copy.eyebrow}
            </p>
            <CardTitle className="text-lg">{copy.title}</CardTitle>
            <CardDescription className="mt-1">{copy.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      {unlockedCourses && unlockedCourses.length > 0 && (
        <CardContent>
          <p className="font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Courses now unlocked
          </p>
          <div className="space-y-bc-3">
            {unlockedCourses.map((course) => (
              <CourseListItem
                key={course.slug}
                slug={course.slug}
                title={course.title}
                level={course.level}
                thumbnail={course.thumbnail}
                meta={`${course.totalLessons} lessons`}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
