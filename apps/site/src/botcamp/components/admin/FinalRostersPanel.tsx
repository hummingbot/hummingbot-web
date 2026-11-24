import Link from "next/link"
import { ChevronRight, ExternalLink, FileCode, MoreVertical, Trophy, UserRound, Wallet as WalletIcon } from "lucide-react"
import { Card, CardContent } from "@/botcamp/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/botcamp/components/ui/avatar"
import { Button } from "@/botcamp/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/botcamp/components/ui/dropdown-menu"
import { TeamLogoBadge } from "@/botcamp/components/hackathons/TeamLogoBadge"

interface RosterSeat {
  applicationId: string
  name: string
  avatarUrl: string | null
  slug: string | null
  strategyId: number | null
  strategyTitle: string | null
  strategySlug: string | null
  wallets: { chain: string; address: string }[]
}

interface RosterTeam {
  id: string
  name: string
  logoUrl: string | null
  logoUrlDark: string | null
  slug: string | null
  selectedCount: number
  maxSelections: number
  roster: RosterSeat[]
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function truncateAddress(address: string): string {
  if (address.length <= 10) return address
  return `${address.slice(0, 4)}…${address.slice(-4)}`
}

/**
 * Replaces the applications-review-focused Overview content once every
 * sponsor team has filled its squad — at that point admins care about the
 * confirmed rosters, not the funnel/table that led up to them.
 */
export function FinalRostersPanel({
  teams,
  hackathonId,
  announceComplete = true,
}: {
  teams: RosterTeam[]
  hackathonId: string
  /** Skip the "selection complete" banner for a hackathon that's already
   *  COMPLETED — the rosters being final is obvious at that point. */
  announceComplete?: boolean
}) {
  return (
    <div className="space-y-bc-4">
      {announceComplete && (
        <div className="flex items-center gap-3 rounded-bc-lg border border-primary/40 bg-primary/5 px-4 py-3">
          <Trophy className="h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-medium">Squads full — selection complete</p>
            <p className="text-sm text-muted-foreground">
              Every team has picked their agents. Rosters below are final.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <Card key={team.id}>
            <CardContent className="space-y-bc-4 pt-6">
              <div className="flex items-center gap-3">
                <TeamLogoBadge
                  logoUrl={team.logoUrl}
                  logoUrlDark={team.logoUrlDark}
                  alt={team.name}
                  className="h-10 w-10 shrink-0 rounded-bc-lg"
                  imageSize={28}
                />
                <div className="min-w-0 flex-1">
                  {team.slug ? (
                    <Link
                      href={`/admin/teams/${team.id}`}
                      className="truncate font-medium hover:text-primary hover:underline"
                    >
                      {team.name}
                    </Link>
                  ) : (
                    <p className="truncate font-medium">{team.name}</p>
                  )}
                  <p className="font-mono text-xs text-muted-foreground">
                    {team.selectedCount}/{team.maxSelections} seats
                  </p>
                </div>
              </div>

              <ul className="space-y-bc-2">
                {team.roster.map((seat) => (
                  <li key={seat.applicationId} className="flex items-center gap-2">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={seat.avatarUrl || undefined} />
                      <AvatarFallback className="text-[10px]">{getInitials(seat.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{seat.name}</p>
                      {seat.strategyTitle && (
                        <p className="truncate text-xs text-muted-foreground">
                          {seat.strategySlug ? (
                            <Link
                              href={`/hub/${seat.strategySlug}`}
                              target="_blank"
                              className="hover:text-primary hover:underline"
                            >
                              {seat.strategyTitle}
                            </Link>
                          ) : (
                            seat.strategyTitle
                          )}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <MoreVertical className="h-3.5 w-3.5" />
                          <span className="sr-only">More actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/hackathons/${hackathonId}/applications/${seat.applicationId}`}>
                            <ChevronRight className="mr-2 h-4 w-4" />
                            Review
                          </Link>
                        </DropdownMenuItem>
                        {seat.strategySlug && (
                          <DropdownMenuItem asChild>
                            <Link href={`/hub/${seat.strategySlug}`} target="_blank">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View public page
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {seat.strategyId && (
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/strategies/${seat.strategyId}`}>
                              <FileCode className="mr-2 h-4 w-4" />
                              Edit strategy
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {seat.slug && (
                          <DropdownMenuItem asChild>
                            <Link href={`/builders/${seat.slug}`} target="_blank">
                              <UserRound className="mr-2 h-4 w-4" />
                              View profile
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {seat.wallets.length > 0 && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="flex items-center gap-1.5 font-normal text-muted-foreground">
                              <WalletIcon className="h-3.5 w-3.5" />
                              Wallet
                            </DropdownMenuLabel>
                            {seat.wallets.map((w, i) => (
                              <div key={i} className="px-2 py-1 font-mono text-xs">
                                <span className="uppercase text-foreground">{w.chain}</span>{" "}
                                <span className="text-muted-foreground">{truncateAddress(w.address)}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
