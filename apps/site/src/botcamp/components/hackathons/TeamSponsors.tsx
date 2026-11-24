import { Sparkles, Trophy, ArrowRight } from "lucide-react"
import { TeamColorCard } from "./TeamColorCard"
import { TeamLogoBadge } from "./TeamLogoBadge"
import { BOTCAMP_SLUG, DEFAULT_PRIMARY_COLOR } from "@/botcamp/lib/hackathon-squads"

interface Team {
  id: string
  slug: string
  name: string
  description: string | null
  logoUrl: string | null
  logoUrlDark: string | null
  websiteUrl: string | null
  rules: string | null
  primaryColor: string | null
  sortOrder: number
  _count: {
    selectedApplications: number
  }
}

interface TeamSponsorsProps {
  teams: Team[]
  hackathonSlug: string
  maxSelections: number
  /** When true, renders without outer section wrapper */
  embedded?: boolean
  /** Unfilled seats only read as "open slots" while builders can apply. */
  applicationsOpen?: boolean
}

export function TeamSponsors({
  applicationsOpen = true,
  teams,
  hackathonSlug,
  maxSelections,
  embedded = false,
}: TeamSponsorsProps) {
  const grid = (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
      {teams.map((team) => {
        const filled = team._count.selectedApplications
        const open = maxSelections - filled
        const isHost = team.slug === BOTCAMP_SLUG

        return (
          <TeamColorCard
            key={team.id}
            primaryColor={team.primaryColor || DEFAULT_PRIMARY_COLOR}
            href={`/hackathons/${hackathonSlug}/teams/${team.slug}`}
            contentClassName="p-6 flex flex-col h-full"
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <h4 className="text-xl font-black uppercase tracking-bc-tight truncate text-white min-w-0">
                {team.name}
              </h4>
              <TeamLogoBadge
                logoUrl={team.logoUrl}
                logoUrlDark={team.logoUrlDark}
                alt={team.name}
                className="w-14 h-14 rounded-bc-lg shrink-0"
                imageSize={36}
                iconClassName="h-6 w-6"
              />
            </div>

            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/60 mb-5">
              {isHost ? "Host Squad" : "Sponsor Squad"}
            </p>

            <div className="mt-auto flex items-center justify-between gap-3 pt-4 border-t border-white/15">
              {open === 0 || !applicationsOpen ? (
                <span className="inline-flex items-center gap-1.5 rounded-bc-md border border-white/20 bg-black/30 px-2.5 py-1 font-mono text-xs text-white/90">
                  <Trophy className="h-3 w-3" />
                  {filled}/{maxSelections} drivers
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-bc-md border border-white/25 bg-white/15 px-2.5 py-1 font-mono text-xs font-semibold text-white">
                  {open} open slot{open > 1 ? "s" : ""}
                </span>
              )}
              <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold uppercase tracking-wide text-white/90 group-hover:text-white transition-colors">
                View
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </TeamColorCard>
        )
      })}
    </div>
  )

  if (embedded) {
    return grid
  }

  return (
    <section className="w-full py-12 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-10">
          <h3 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            The Squads
          </h3>
          <p className="text-muted-foreground">Pick a squad to view its drivers and apply</p>
        </div>
        {grid}
      </div>
    </section>
  )
}
