import type { ReactNode } from "react"
import type { Prisma } from "@prisma/client"
import { EmptyState } from "@/botcamp/components/ui/empty-state"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/botcamp/components/ui/tabs"
import { Card, CardContent } from "@/botcamp/components/ui/card"
import { TeamMembersList } from "@/botcamp/components/teams/TeamMembersList"
import { PreStartRegistrants } from "@/botcamp/components/teams/PreStartRegistrants"
import { TeamInfoEditForm } from "@/botcamp/components/teams/TeamInfoEditForm"
import { ApplicationsTable } from "@/botcamp/components/teams/ApplicationsTable"
import { TeamStatsBar } from "@/botcamp/components/teams/TeamStatsBar"
import {
  teamAdminSelect,
  getRelevantHackathonForTeam,
  getTeamApplicants,
  getTeamStats,
  getPreStartRegistrants,
} from "@/botcamp/lib/team-admin"
import { findRaceWindow, fmtFull, FINALS_SESSION_SLUG } from "@/botcamp/lib/hackathon-stages"
import { prisma } from "@/botcamp/lib/prisma"
import { Handshake } from "lucide-react"

export type TeamAdminTeam = Prisma.TeamGetPayload<{ select: typeof teamAdminSelect }>

interface TeamAdministrationProps {
  team: TeamAdminTeam
  /** Where this view lives — "/dashboard/team" for a sponsor, "/admin/teams/<id>" for an admin. */
  basePath: string
  tab?: string
  /** Replaces the read-only member list in the Manage tab. */
  manage?: ReactNode
  /** Adds a Settings tab (admin-only team fields). */
  settings?: ReactNode
}

/** What the current stage means for a sponsor team, shown above its stats. */
function getTeamStageNotice(
  hackathon: {
    status: string
    registrationEnd: Date | null
    raceStart: Date | null
    raceEnd: Date | null
  },
  finalsSessions: Array<{ slug: string | null; date: Date | null }>,
): { label: string; text: string } | null {
  const race = findRaceWindow({ ...hackathon, sessions: finalsSessions })
  switch (hackathon.status) {
    case "COMING_SOON":
      return {
        label: "Coming Soon",
        text: "Registration hasn't opened yet. Builders who pick your team as their sponsor show up under Applicants.",
      }
    case "REGISTRATION":
      return {
        label: "Applications Open",
        text: hackathon.registrationEnd
          ? `Builders can apply until ${fmtFull(hackathon.registrationEnd)}. Select your agents from the Applicants tab.`
          : "Builders are applying now. Select your agents from the Applicants tab.",
      }
    case "COUNTDOWN":
      return {
        label: "Countdown",
        text: race
          ? `Your roster is final — selections are closed. The race starts on ${fmtFull(race.start)}.`
          : "Your roster is final — selections are closed.",
      }
    case "ACTIVE":
      return { label: "Race Live", text: "The race is running and your roster is locked." }
    case "JUDGING":
      return { label: "Judging", text: "The race is over and results are being finalized." }
    case "COMPLETED":
      return { label: "Completed", text: "This hackathon is over — winners have been announced." }
    default:
      return null
  }
}

/**
 * The sponsor-team administration view: stats, team info, members, and the
 * applicant pipeline with selection. Rendered for a team's own members on
 * /dashboard/team and for admins on /admin/teams/[id], so both see the same
 * thing. Callers are responsible for access control.
 */
export async function TeamAdministration({
  team,
  basePath,
  tab,
  manage,
  settings,
}: TeamAdministrationProps) {
  // Botcamp advances the hackathon stage first (a write); the read-only preview shows the stage last saved.
  const hackathon = await getRelevantHackathonForTeam(team.id)
  // Applications open with the Open stage; before that the team can only
  // see who registered with it as their sponsor.
  const hackathonStarted =
    !!hackathon && hackathon.status !== "DRAFT" && hackathon.status !== "COMING_SOON"
  const stats = hackathon
    ? await getTeamStats(team.id, hackathon)
    : null
  const finalsSessions = hackathon
    ? await prisma.hackathonSession.findMany({
        where: { hackathonId: hackathon.id, slug: FINALS_SESSION_SLUG },
        select: { slug: true, date: true },
      })
    : []
  const stageNotice = hackathon ? getTeamStageNotice(hackathon, finalsSessions) : null

  const tabs = ["edit", "manage", "applicants", ...(settings ? ["settings"] : [])]

  return (
    <div className="space-y-bc-8">
      {stageNotice && (
        <div className="rounded-bc-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
            {hackathon?.title} · {stageNotice.label}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{stageNotice.text}</p>
        </div>
      )}

      {stats && <TeamStatsBar {...stats} />}

      <Tabs key={tab ?? "edit"} defaultValue={tab && tabs.includes(tab) ? tab : "edit"}>
        <TabsList>
          <TabsTrigger value="edit">Edit Team Info</TabsTrigger>
          <TabsTrigger value="manage">Manage</TabsTrigger>
          <TabsTrigger value="applicants">Applicants</TabsTrigger>
          {settings && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        <TabsContent value="edit">
          <Card>
            <CardContent className="space-y-bc-4 pt-6">
              <TeamInfoEditForm
                team={{
                  slug: team.slug,
                  name: team.name,
                  description: team.description,
                  logoUrl: team.logoUrl,
                  logoUrlDark: team.logoUrlDark,
                  websiteUrl: team.websiteUrl,
                  rules: team.rules,
                  resources: team.resources,
                  primaryColor: team.primaryColor,
                }}
                publicUrl={
                  hackathon ? `/hackathons/${hackathon.slug}/teams/${team.slug}` : undefined
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage">
          <Card>
            <CardContent className="pt-6">
              {manage ?? <TeamMembersList members={team.members} />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applicants">
          <Card>
            <CardContent className="space-y-bc-4 pt-6">
              {!hackathon ? (
                <EmptyState
                  icon={Handshake}
                  title="No hackathon yet"
                  description="Applicants and registrants will show up here once a hackathon this team sponsors opens."
                  variant="inline"
                />
              ) : hackathonStarted ? (
                <ApplicationsTable applications={await getTeamApplicants(team.id, hackathon.id)} basePath={basePath} />
              ) : (
                <PreStartRegistrants registrants={await getPreStartRegistrants(team.id, hackathon.id)} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {settings && <TabsContent value="settings">{settings}</TabsContent>}
      </Tabs>
    </div>
  )
}
