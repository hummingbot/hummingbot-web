import Link from "next/link"
import Image from "next/image"
import { ArrowRight, CheckCircle } from "lucide-react"
import { cn } from "@/botcamp/lib/utils"
import xrpLogo from "@/botcamp/images/logos/xrp.jpg"

interface CohortListCardProps {
  number: number
  startDate: string
  endDate: string
  description: string
  isEnrolled?: boolean
  variant?: "upcoming" | "completed"
  index?: number
}

export function CohortListCard({
  number,
  startDate,
  endDate,
  description,
  isEnrolled = false,
  variant = "upcoming",
  index = 0,
}: CohortListCardProps) {
  const hasStarted = new Date(startDate) <= new Date()
  const isXrpCohort = number === 6 || number === 8

  // Format date based on variant
  const displayDate =
    variant === "completed"
      ? new Date(endDate).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })
      : new Date(startDate).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        })

  // CTA text based on enrollment status and variant
  const ctaText = isEnrolled
    ? hasStarted
      ? "Continue"
      : "View Schedule"
    : variant === "completed"
      ? "View Recap"
      : "Enroll Now"

  const href =
    variant === "completed"
      ? `/cohorts/cohort${number}/recap`
      : `/cohorts/cohort${number}`

  return (
    <Link
      href={href}
      className="group block rounded-bc-xl overflow-hidden relative p-5 transition-all hover:shadow-lg animate-in fade-in slide-in-from-bottom-4"
      style={{
        animationDelay: `${index * 50}ms`,
        animationFillMode: "backwards",
        border: "1px solid hsl(var(--border))",
        borderTop: isEnrolled
          ? "2px solid hsl(var(--primary) / 0.6)"
          : "2px solid rgba(168,85,247,.5)",
        background: isEnrolled
          ? "linear-gradient(180deg, hsl(var(--primary) / 0.08), transparent 40%)"
          : "linear-gradient(180deg, rgba(168,85,247,.08), transparent 40%)",
      }}
    >
      {/* Enrolled badge */}
      {isEnrolled && (
        <div className="absolute top-4 right-4 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground shadow-xs">
            <CheckCircle className="h-3 w-3" />
            Enrolled
          </span>
        </div>
      )}

      {/* Header with badge and title */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className={cn(
            "w-[42px] h-[42px] rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-gradient-to-br",
            isEnrolled ? "from-primary to-primary/70" : "from-purple-500 to-violet-600"
          )}
        >
          {isXrpCohort ? (
            <Image
              src={xrpLogo}
              alt="XRP Logo"
              width={42}
              height={42}
              className="object-contain"
            />
          ) : (
            <span
              className="font-monoton text-lg text-white"
              style={{ marginTop: "2px" }}
            >
              {number}
            </span>
          )}
        </div>
        <div className="min-w-0 pr-14">
          <div className="font-semibold text-[17px] text-foreground truncate">
            Cohort {number}
          </div>
          <div className="text-xs text-muted-foreground">{displayDate}</div>
        </div>
      </div>

      {/* Description */}
      <p className="text-[12.5px] leading-relaxed text-muted-foreground line-clamp-3 mb-3.5">
        {description}
      </p>

      {/* Footer CTA */}
      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary group-hover:gap-2.5 transition-all">
        {ctaText}
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  )
}
