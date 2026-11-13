"use client"

import Link from "next/link"
import { Input } from "@/botcamp/components/ui/input"
import { StrategySeatBadge } from "@/botcamp/components/strategies/StrategySeatBadge"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/botcamp/lib/utils"

interface StrategyHeaderProps {
  title: string
  originalTitle: string
  slug: string | null
  cohortNumber?: number | null
  canEditContent: boolean
  isCertified: boolean
  onTitleChange: (value: string) => void
  titleErrorMessage?: string | null
  /** Team whose hackathon squad seat this strategy holds, if any. */
  seatTeam?: string | null
}

export function StrategyHeader({
  title,
  originalTitle,
  slug,
  cohortNumber,
  canEditContent,
  isCertified,
  onTitleChange,
  titleErrorMessage,
  seatTeam = null,
}: StrategyHeaderProps) {
  return (
    <div className="space-y-bc-1">
      {/* Breadcrumb */}
      <Link
        href="/dashboard/strategies"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground pl-2"
      >
        <ArrowLeft className="h-4 w-4" />
        My Strategies
      </Link>

      {/* Title */}
      {canEditContent ? (
        <>
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className={cn(
              "text-2xl font-bold h-auto py-1 px-2 border-transparent hover:border-border focus:border-primary bg-transparent",
              titleErrorMessage && "border-destructive focus:border-destructive"
            )}
            placeholder="Strategy Title (required)"
          />
          {titleErrorMessage && (
            <p className="text-sm text-destructive pl-2">
              {titleErrorMessage}
            </p>
          )}
        </>
      ) : (
        <h1 className="text-2xl font-bold pl-2">{originalTitle}</h1>
      )}

      {/* Cohort info or "New Strategy" */}
      <p className="text-sm text-muted-foreground pl-2">
        {cohortNumber ? (
          <>
            Cohort {cohortNumber}
            {isCertified && slug && (
              <>
                {" · "}
                <Link href={`/hub/${slug}`} className="hover:text-primary">
                  /{slug}
                </Link>
              </>
            )}
          </>
        ) : (
          "New Strategy"
        )}
      </p>
      {seatTeam && (
        <div className="pl-2 pt-1">
          <StrategySeatBadge teamName={seatTeam} />
        </div>
      )}
    </div>
  )
}
