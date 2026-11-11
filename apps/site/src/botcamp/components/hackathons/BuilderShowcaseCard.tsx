"use client"

import Image from "next/image"
import { MapPin } from "lucide-react"
import { cn } from "@/botcamp/lib/utils"
import { BuilderAvatar } from "./BuilderAvatar"
import { type SponsorInfo } from "./SponsorBadge"
import { useTheme } from "@/botcamp/contexts/ThemeContext"
import { pickTeamLogo } from "@/botcamp/lib/team-logo"

export interface ShowcaseBuilder {
  id: string
  name: string
  tagline: string | null
  avatarUrl: string | null
  strategyDescription: string | null
  location?: string | null
  latitude?: number | null
  longitude?: number | null
  /** Sponsor the builder is racing for, if chosen at registration. */
  sponsor?: SponsorInfo | null
  /** True when this card belongs to the current viewer. */
  isYou?: boolean
}

/**
 * Understated registrant card for the "What Others Are Building" showcase.
 * Used both inside the auto-scrolling marquee on the hub and in the full
 * Registered Agent Builders grid. Fills its container — the marquee/grid
 * controls width.
 */
export function BuilderShowcaseCard({
  builder,
  className,
  showLocation = false,
}: {
  builder: ShowcaseBuilder
  className?: string
  /** Show the builder's location row (used on the full builders page). */
  showLocation?: boolean
}) {
  const { name, tagline, avatarUrl, strategyDescription, location, sponsor, isYou } = builder
  const { theme } = useTheme()
  const sponsorLogo = sponsor ? pickTeamLogo(theme, sponsor.logoUrl, sponsor.logoUrlDark) : null
  return (
    <div
      className={cn(
        "flex h-full flex-col gap-3 rounded-bc-xl border bg-card p-5 transition-colors",
        isYou
          ? "border-primary/60 ring-1 ring-primary/40"
          : "border-border hover:border-primary/40",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <BuilderAvatar name={name} avatarUrl={avatarUrl} className="h-9 w-9 text-sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold leading-tight">{name}</p>
            {isYou && (
              <span className="shrink-0 rounded-bc-sm bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-primary">
                You
              </span>
            )}
          </div>
          {tagline && (
            <p className="truncate text-xs text-muted-foreground">{tagline}</p>
          )}
          {showLocation && location && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              {location}
            </p>
          )}
        </div>
      </div>

      {strategyDescription && (
        <p className="text-sm leading-relaxed text-muted-foreground line-clamp-4">
          {strategyDescription}
        </p>
      )}

      {sponsor && (
        <div className="mt-auto flex items-center gap-2.5 border-t border-border pt-3">
          {sponsorLogo && (
            <Image
              src={sponsorLogo}
              alt={sponsor.name}
              width={28}
              height={28}
              className="h-7 w-7 rounded-bc-md object-contain"
            />
          )}
          <div className="min-w-0 leading-tight">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              Racing for
            </p>
            <p className="truncate text-sm font-semibold text-foreground">{sponsor.name}</p>
          </div>
        </div>
      )}
    </div>
  )
}
