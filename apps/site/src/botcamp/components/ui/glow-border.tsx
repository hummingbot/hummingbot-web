import { cn } from "@/botcamp/lib/utils"

interface GlowBorderProps {
  children: React.ReactNode
  /** Classes for the inner surface (its background, padding, layout). */
  className?: string
  /** Rounding of the outer edge; the inner one follows, 1px in. */
  rounded?: "lg" | "xl" | "2xl"
}

const OUTER: Record<NonNullable<GlowBorderProps["rounded"]>, string> = {
  lg: "rounded-bc-lg",
  xl: "rounded-bc-xl",
  "2xl": "rounded-2xl",
}
const INNER: Record<NonNullable<GlowBorderProps["rounded"]>, string> = {
  lg: "rounded-[7px]",
  xl: "rounded-[11px]",
  "2xl": "rounded-[15px]",
}

/**
 * A 1px gold gradient border with a soft light running slowly round it, and
 * a faint glow outside: draws the eye to a call to action without moving
 * anything inside it. Still under prefers-reduced-motion.
 */
export function GlowBorder({ children, className, rounded = "xl" }: GlowBorderProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "relative overflow-hidden p-px shadow-[0_0_40px_-12px_rgb(var(--condor-gold-rgb)/0.45)]",
        OUTER[rounded],
      )}
    >
      {/* The border: a resting gold gradient, and a brighter arc circling it. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-condor-gold/60 via-condor-gold/15 to-condor-orange/50"
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 aspect-square w-[200%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,transparent_0deg,rgb(var(--condor-gold-rgb))_50deg,rgb(255_255_255/0.85)_65deg,rgb(var(--condor-gold-rgb))_80deg,transparent_130deg)] motion-safe:animate-[spin_8s_linear_infinite]"
      />
      <div className={cn("relative bg-background", INNER[rounded], className)}>{children}</div>
    </div>
  )
}
