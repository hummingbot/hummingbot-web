"use client"

import Image from "next/image"
import { cn } from "@/botcamp/lib/utils"
import { useTheme } from "@/botcamp/contexts/ThemeContext"
import { pickTeamLogo } from "@/botcamp/lib/team-logo"

export interface SponsorInfo {
  name: string
  logoUrl: string | null
  logoUrlDark?: string | null
}

/**
 * Small chip showing the sponsor a builder is racing for — logo + name.
 * Used on builder showcase cards and the dashboard profile card. Sits on
 * `bg-muted`, which flips with the site theme, so the logo variant swaps
 * along with it.
 */
export function SponsorBadge({
  sponsor,
  className,
}: {
  sponsor: SponsorInfo
  className?: string
}) {
  const { theme } = useTheme()
  const logo = pickTeamLogo(theme, sponsor.logoUrl, sponsor.logoUrlDark)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2 py-0.5",
        className,
      )}
    >
      {logo && (
        <Image
          src={logo}
          alt=""
          width={14}
          height={14}
          className="h-3.5 w-3.5 rounded-bc-sm object-contain"
        />
      )}
      <span className="font-mono text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {sponsor.name}
      </span>
    </span>
  )
}
