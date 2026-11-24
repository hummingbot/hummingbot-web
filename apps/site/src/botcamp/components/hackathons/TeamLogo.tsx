"use client"

import Image from "next/image"
import { useTheme } from "@/botcamp/contexts/ThemeContext"
import { pickTeamLogo } from "@/botcamp/lib/team-logo"

/**
 * Team/sponsor logo that swaps between the light- and dark-background
 * variants as the site theme toggle is flipped — same mechanism as the
 * Botcamp brand mark in Header/Footer. Renders nothing if neither variant
 * is set; callers show their own fallback (e.g. a Flag icon) in that case.
 */
export function TeamLogo({
  logoUrl,
  logoUrlDark,
  alt,
  width,
  height,
  className,
}: {
  logoUrl: string | null
  logoUrlDark: string | null
  alt: string
  width: number
  height: number
  className?: string
}) {
  const { theme } = useTheme()
  const src = pickTeamLogo(theme, logoUrl, logoUrlDark)
  if (!src) return null
  // Remote logos skip the optimizer: this site configures no image hosts.
  return <Image src={src} alt={alt} width={width} height={height} className={className} unoptimized={!src.startsWith("/")} />
}
