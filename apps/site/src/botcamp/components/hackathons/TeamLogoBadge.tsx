import type { CSSProperties, ReactNode } from "react"
import { Flag } from "lucide-react"
import { TeamLogo } from "./TeamLogo"
import { cn } from "@/botcamp/lib/utils"

interface TeamLogoBadgeProps {
  logoUrl: string | null
  logoUrlDark: string | null
  alt: string
  /** Container size, shape, and spacing classes, e.g. "w-16 h-16 rounded-bc-lg flex-shrink-0" */
  className?: string
  /** Pixel size passed to the underlying logo image */
  imageSize: number
  /** Size classes for the fallback flag icon, e.g. "h-7 w-7" */
  iconClassName?: string
  /** Rendered when there's no logo at all — overrides the default flag icon */
  fallback?: ReactNode
  /** Inline style on the container, e.g. a per-team border color */
  style?: CSSProperties
}

/**
 * Frosted logo badge used on the F1-style team-color cards. Those cards'
 * background never inverts with the site theme, but `logoUrl` (the
 * light-theme logo variant) is designed to sit on light surfaces — so the
 * badge itself flips between a light and dark frosted background to keep
 * whichever logo variant is active legible.
 */
export function TeamLogoBadge({
  logoUrl,
  logoUrlDark,
  alt,
  className,
  imageSize,
  iconClassName = "h-7 w-7",
  fallback,
  style,
}: TeamLogoBadgeProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-white/70 dark:bg-black/40 backdrop-blur-xs border border-black/10 dark:border-white/15",
        className,
      )}
      style={style}
    >
      {logoUrl || logoUrlDark ? (
        <TeamLogo
          logoUrl={logoUrl}
          logoUrlDark={logoUrlDark}
          alt={alt}
          width={imageSize}
          height={imageSize}
          className="object-contain"
        />
      ) : (
        fallback ?? <Flag className={cn("text-black/40 dark:text-white/70", iconClassName)} />
      )}
    </div>
  )
}
