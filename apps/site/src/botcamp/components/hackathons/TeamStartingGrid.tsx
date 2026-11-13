import Link from "next/link"
import { ArrowRight, Flag, Plus } from "lucide-react"
import { TeamLogoBadge } from "./TeamLogoBadge"
import type { AgentSeat, TeamSponsorCard } from "./TeamSponsorsGrid"
import { DEFAULT_PRIMARY_COLOR } from "@/botcamp/lib/hackathon-squads"
import { getAvatarGradient } from "@/botcamp/lib/avatar"
import { operationsMailto } from "@/botcamp/lib/operations-email"
import { SeatAvatarImage } from "./SeatAvatarImage"

interface GridTeam extends Omit<TeamSponsorCard, "agents"> {
  description?: string | null
  agents: (AgentSeat | null)[]
}

interface TeamStartingGridProps {
  teams: GridTeam[]
  hackathonSlug: string
  slotsPerSquad: number
  /** Label for an unfilled seat — from openSeatCopy(), so it follows the stage. */
  openSeatLabel?: string
  /** "sponsors" (Coming Soon): introduce the teams without any seats yet,
   *  closing the grid with a "Sponsor a Team" card. */
  variant?: "grid" | "sponsors"
}

function SeatAvatar({ agent }: { agent: AgentSeat | null }) {
  if (!agent) {
    return (
      <div className="w-8 h-8 rounded-full border border-dashed border-border flex items-center justify-center flex-shrink-0">
        <Flag className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    )
  }
  if (agent.avatarURL) {
    return <SeatAvatarImage src={agent.avatarURL} name={agent.name} />
  }
  return (
    <div
      className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-xs font-bold text-black flex-shrink-0"
      style={getAvatarGradient(agent.name)}
    >
      {agent.name.charAt(0).toUpperCase()}
    </div>
  )
}

const CARD_WIDTH =
  "w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.84rem)] xl:w-[calc(25%-0.94rem)]"

/** Final grid cell in the sponsors variant — emails a sponsorship inquiry to operations. */
function SponsorTeamCard() {
  return (
    <a
      href={operationsMailto("Hackathon sponsorship inquiry")}
      className={`sd-reveal group relative ${CARD_WIDTH} rounded-bc-xl border border-dashed border-primary/60 bg-card/40 backdrop-blur-xs p-5 text-left transition-[transform,border-color,background-color] duration-200 ease-out hover:-translate-y-1 hover:border-solid hover:border-primary hover:bg-card/70 focus-visible:outline-hidden focus-visible:border-solid focus-visible:border-primary`}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-bc-lg flex items-center justify-center flex-shrink-0 border border-dashed border-primary/60 bg-background/60 group-hover:border-solid group-hover:border-primary">
          <Plus className="h-5 w-5 text-primary" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <div className="font-semibold tracking-bc-tight text-primary">Sponsor a Team</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Join the grid
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Field your own team of trading agents under your project&apos;s flag.
      </p>
      <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.14em] text-primary">
        Request details
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </a>
  )
}

/**
 * The starting grid, one card per team: the team's colors and logo up top,
 * then its driver seats with their racing numbers (numbered across the whole
 * grid, in team order) and the strategy racing in each. Cards fade up as they scroll in (`.sd-reveal`).
 */
export function TeamStartingGrid({
  teams,
  hackathonSlug,
  slotsPerSquad,
  openSeatLabel = "Open Seat",
  variant = "grid",
}: TeamStartingGridProps) {
  return (
    <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-4 md:gap-5 short:gap-3">
      {teams.map((team, teamIndex) => {
        const color = team.primaryColor || DEFAULT_PRIMARY_COLOR
        const filled = team.agents.filter(Boolean).length
        return (
          <Link
            key={team.id}
            href={`/hackathons/${hackathonSlug}/teams/${team.slug}`}
            className={`sd-reveal group relative ${CARD_WIDTH} rounded-bc-xl border border-border bg-card/80 backdrop-blur-xs overflow-hidden transition-[transform,border-color] duration-200 ease-out hover:-translate-y-1`}
            style={{ ["--team-color" as string]: color }}
          >
            {/* Team color bar and a soft wash of it behind the header */}
            <span className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
            <span
              className="absolute inset-x-0 top-0 h-28 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity"
              style={{ background: `linear-gradient(to bottom, ${color}26, transparent)` }}
            />
            <span className="absolute inset-0 rounded-bc-xl border border-transparent group-hover:border-[color:var(--team-color)] transition-colors pointer-events-none" />

            <div className="relative p-5 short:p-4">
              <div className="flex items-center gap-3 mb-5 short:mb-3">
                <TeamLogoBadge
                  logoUrl={team.logoUrl}
                  logoUrlDark={team.logoUrlDark}
                  alt={team.name}
                  className="w-11 h-11 rounded-bc-lg flex-shrink-0"
                  imageSize={24}
                  iconClassName="h-5 w-5"
                />
                <div className="min-w-0">
                  <div className="font-semibold tracking-bc-tight truncate">{team.name}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {variant === "sponsors"
                      ? `Fields ${slotsPerSquad} agent${slotsPerSquad === 1 ? "" : "s"}`
                      : `${filled}/${slotsPerSquad} drivers`}
                  </div>
                </div>
              </div>

              {variant === "sponsors" ? (
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {team.description?.trim() || `${team.name} is fielding agents in this edition.`}
                </p>
              ) : (
                <div className="space-y-bc-2">
                  {team.agents.map((agent, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-bc-lg border border-border/60 bg-background/40 px-3 py-2"
                    >
                      <span
                        className="font-mono text-lg font-black tabular-nums w-7 flex-shrink-0"
                        style={{ color }}
                      >
                        {String(teamIndex * slotsPerSquad + i + 1).padStart(2, "0")}
                      </span>
                      <SeatAvatar agent={agent} />
                      <div className="min-w-0 flex-1">
                        <span
                          className={`block text-sm truncate ${agent ? "font-medium" : "italic text-muted-foreground"}`}
                        >
                          {agent ? agent.name : openSeatLabel}
                        </span>
                        {agent?.strategy && (
                          <span className="block text-xs text-muted-foreground truncate">
                            {agent.strategy.title}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Link>
        )
      })}
      {variant === "sponsors" && <SponsorTeamCard />}
    </div>
  )
}
