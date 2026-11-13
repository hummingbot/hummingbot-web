import Link from "next/link"
import type { CSSProperties, ReactNode } from "react"
import { cn } from "@/botcamp/lib/utils"

interface TeamColorCardProps {
  primaryColor: string
  href?: string
  className?: string
  contentClassName?: string
  children: ReactNode
}

const HALFTONE_STYLE: CSSProperties = {
  backgroundImage: "radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1.4px)",
  backgroundSize: "10px 10px",
}

/**
 * Colored "team brand" card used across hackathon surfaces:
 *  - team grid on the hackathon page
 *  - filled agent slots on the team detail page
 *  - team CTA panels
 *
 * Provides the F1-style gradient background, halftone overlay, clean
 * color-tinted inset border (no harsh edge), a color-glow lift, and a
 * diagonal sheen sweep on hover when an `href` is provided.
 */
export function TeamColorCard({
  primaryColor,
  href,
  className,
  contentClassName,
  children,
}: TeamColorCardProps) {
  const inkMix = `color-mix(in srgb, ${primaryColor} 28%, #000 72%)`
  const ringInk = `color-mix(in srgb, ${primaryColor} 55%, #000 45%)`
  const ringHover = `color-mix(in srgb, ${primaryColor} 80%, #fff 20%)`

  const baseShadow = [
    "0 1px 2px rgba(0,0,0,0.35)",
    "0 10px 28px -14px rgba(0,0,0,0.5)",
    `inset 0 0 0 1px ${ringInk}`,
    "inset 0 1px 0 0 rgba(255,255,255,0.12)",
  ].join(", ")
  const hoverShadow = [
    "0 8px 16px -4px rgba(0,0,0,0.3)",
    `0 22px 48px -12px ${primaryColor}99`,
    `inset 0 0 0 1px ${ringHover}`,
    "inset 0 1px 0 0 rgba(255,255,255,0.2)",
  ].join(", ")

  const style = {
    background: `linear-gradient(135deg, ${primaryColor} 0%, ${inkMix} 100%)`,
    boxShadow: baseShadow,
    "--hover-shadow": hoverShadow,
  } as CSSProperties

  const interactive = !!href

  const classes = cn(
    "group relative rounded-bc-xl overflow-hidden",
    "transition-[transform,box-shadow] duration-200 ease-out",
    interactive &&
      "hover:-translate-y-0.5 hover:[box-shadow:var(--hover-shadow)] focus-visible:outline-hidden focus-visible:-translate-y-0.5 focus-visible:[box-shadow:var(--hover-shadow)]",
    className,
  )

  const inner = (
    <>
      <div
        className="absolute inset-0 opacity-45 pointer-events-none"
        style={HALFTONE_STYLE}
      />
      {interactive && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 z-20 w-2/5 pointer-events-none opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 motion-safe:group-hover:animate-bh-sheen motion-safe:group-focus-visible:animate-bh-sheen"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent)",
          }}
        />
      )}
      <div className={cn("relative z-10", contentClassName)}>{children}</div>
    </>
  )

  if (interactive) {
    return (
      <Link href={href} className={classes} style={style}>
        {inner}
      </Link>
    )
  }
  return (
    <div className={classes} style={style}>
      {inner}
    </div>
  )
}
