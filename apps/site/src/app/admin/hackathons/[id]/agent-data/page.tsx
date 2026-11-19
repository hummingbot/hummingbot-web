import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Prisma } from "@prisma/client"
import { prisma } from "@/botcamp/lib/prisma"
import { auth } from "@/botcamp/lib/auth"
import { Button } from "@/botcamp/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { PageHeader } from "@/botcamp/components/ui/page-header"
import { JsonTree, jsonTypeLabel } from "@/botcamp/components/admin/JsonTree"
import { cn } from "@/botcamp/lib/utils"
import { ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ agent?: string }>
}

// The models that hold race data for an agent, described from the Prisma
// schema itself so this page cannot drift from the database.
const RACE_MODELS = ["RaceMetric", "RaceAgentDetail"] as const

function modelInfo(name: string) {
  const model = Prisma.dmmf.datamodel.models.find((m) => m.name === name)
  if (!model) throw new Error(`Prisma model ${name} not found`)
  return {
    table: model.dbName ?? model.name,
    columns: model.fields.filter((f) => f.kind !== "object").map((f) => ({ name: f.name, type: f.type, required: f.isRequired })),
  }
}

const utc = (d: Date): string => `${d.toISOString().replace("T", " ").slice(0, 19)} UTC`
const bytes = (value: unknown): string => {
  const n = JSON.stringify(value).length
  return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`
}

async function getHackathon(id: string) {
  return prisma.hackathon.findUnique({ where: { id }, select: { id: true, title: true } })
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const hackathon = await getHackathon(id)
  return { title: hackathon ? `Agent Data: ${hackathon.title} - Admin - Botcamp` : "Hackathon Not Found" }
}

export default async function AdminHackathonAgentDataPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { agent: agentSlug } = await searchParams
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/signin")
  }

  const hackathon = await getHackathon(id)
  if (!hackathon) notFound()

  const applications = await prisma.application.findMany({
    where: {
      hackathonId: hackathon.id,
      selectedTeamId: { not: null },
      strategyId: { not: null },
      OR: [{ raceMetrics: { some: {} } }, { raceAgentDetail: { isNot: null } }],
    },
    select: {
      id: true,
      strategy: { select: { id: true, slug: true, title: true } },
      selectedTeam: { select: { name: true } },
      raceAgentDetail: { select: { id: true } },
      _count: { select: { raceMetrics: true } },
    },
    orderBy: { strategy: { title: "asc" } },
  })
  const agents = applications.flatMap((a) => (a.strategy ? [{ ...a, strategy: a.strategy }] : []))
  const selected = agentSlug ? agents.find((a) => a.strategy.slug === agentSlug) : agents[0]
  if (!selected) notFound()

  const [application, detail, readings, recent, legacyAgentCount, scoreCount] = await Promise.all([
    prisma.application.findUniqueOrThrow({
      where: { id: selected.id },
      select: {
        id: true,
        status: true,
        rank: true,
        selectedTeamId: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { name: true, firstName: true, lastName: true } },
      },
    }),
    prisma.raceAgentDetail.findUnique({ where: { applicationId: selected.id }, select: { data: true, createdAt: true, updatedAt: true } }),
    prisma.raceMetric.aggregate({
      where: { applicationId: selected.id },
      _count: true,
      _min: { timestamp: true },
      _max: { timestamp: true },
    }),
    prisma.raceMetric.findMany({
      where: { applicationId: selected.id },
      orderBy: { timestamp: "desc" },
      take: 10,
      select: { timestamp: true, pnlQuote: true, volumeQuote: true },
    }),
    prisma.raceAgent.count({ where: { applicationId: selected.id } }),
    prisma.applicationScore.count({ where: { applicationId: selected.id } }),
  ])

  const driver = application.user.name ?? `${application.user.firstName ?? ""} ${application.user.lastName ?? ""}`.trim()
  const records = [
    { model: "Application", table: modelInfo("Application").table, count: 1, note: `${application.status}, team ${selected.selectedTeam?.name}` },
    { model: "Strategy", table: modelInfo("Strategy").table, count: 1, note: selected.strategy.slug },
    { model: "RaceMetric", table: modelInfo("RaceMetric").table, count: readings._count, note: "One reading per feed push" },
    { model: "RaceAgentDetail", table: modelInfo("RaceAgentDetail").table, count: detail ? 1 : 0, note: detail ? `Imported ${utc(detail.updatedAt)}` : "Not in the fleet backup" },
    { model: "ApplicationScore", table: modelInfo("ApplicationScore").table, count: scoreCount, note: "Application review scores" },
    { model: "RaceAgent", table: modelInfo("RaceAgent").table, count: legacyAgentCount, note: "Legacy roster table, unused" },
  ]

  return (
    <div className="space-y-bc-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={`/admin/hackathons/${hackathon.id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {hackathon.title}
        </Link>
      </Button>

      <PageHeader
        title="Agent Data"
        description="Everything stored for each racing agent: the records, the columns behind them, and the structure of the fleet detail JSON."
        variant="admin"
      />

      <div className="grid gap-6 md:grid-cols-[16rem_minmax(0_1fr)]">
        <nav aria-label="Agents" className="space-y-bc-1">
          {agents.map((a) => (
            <Link
              key={a.id}
              href={`/admin/hackathons/${hackathon.id}/agent-data?agent=${a.strategy.slug}`}
              className={cn(
                "block rounded-bc-md border px-3 py-2 text-sm transition-colors hover:border-primary",
                a.id === selected.id ? "border-primary bg-primary/10" : "border-border",
              )}
            >
              <div className="font-medium leading-snug">{a.strategy.title}</div>
              <div className="mt-0.5 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                <span>{a.selectedTeam?.name}</span>
                <span>{a.raceAgentDetail ? "readings + fleet" : "readings only"}</span>
              </div>
            </Link>
          ))}
        </nav>

        <div className="min-w-0 space-y-bc-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{selected.strategy.title}</CardTitle>
              <p className="font-mono text-xs text-muted-foreground">
                application {application.id} · strategy {selected.strategy.id} · {driver}
                {application.rank !== null && ` · rank ${application.rank}`}
              </p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    <th className="py-2 pr-4 font-bold">Model</th>
                    <th className="py-2 pr-4 font-bold">Table</th>
                    <th className="py-2 pr-4 text-right font-bold">Records</th>
                    <th className="py-2 font-bold">Note</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  {records.map((r) => (
                    <tr key={r.model} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-4 font-semibold">{r.model}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{r.table}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{r.count.toLocaleString("en-US")}</td>
                      <td className="py-2 font-sans text-muted-foreground">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Race Readings</CardTitle>
              <p className="text-xs text-muted-foreground">
                {readings._count.toLocaleString("en-US")} readings
                {readings._min.timestamp && readings._max.timestamp && `, ${utc(readings._min.timestamp)} to ${utc(readings._max.timestamp)}`}.
                Cumulative P&amp;L and volume since the race started, in quote currency. The last ten:
              </p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    <th className="py-2 pr-4 font-bold">timestamp</th>
                    <th className="py-2 pr-4 text-right font-bold">pnlQuote</th>
                    <th className="py-2 text-right font-bold">volumeQuote</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs tabular-nums">
                  {recent.map((r) => (
                    <tr key={r.timestamp.toISOString()} className="border-b border-border/60 last:border-0">
                      <td className="py-1.5 pr-4">{utc(r.timestamp)}</td>
                      <td className="py-1.5 pr-4 text-right">{r.pnlQuote}</td>
                      <td className="py-1.5 text-right">{r.volumeQuote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Columns</CardTitle>
              <p className="text-xs text-muted-foreground">The race tables, as the Prisma schema defines them.</p>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              {RACE_MODELS.map((name) => {
                const info = modelInfo(name)
                return (
                  <div key={name}>
                    <div className="mb-2 font-mono text-xs">
                      <span className="font-semibold">{name}</span> <span className="text-muted-foreground">{info.table}</span>
                    </div>
                    <ul className="space-y-bc-0.5 font-mono text-xs">
                      {info.columns.map((c) => (
                        <li key={c.name} className="flex justify-between gap-4">
                          <span>{c.name}</span>
                          <span className="text-muted-foreground">
                            {c.type}
                            {c.required ? "" : "?"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fleet Detail</CardTitle>
              <p className="text-xs text-muted-foreground">
                {detail
                  ? `RaceAgentDetail.data, ${bytes(detail.data)}, imported ${utc(detail.updatedAt)}. Top-level keys first; expand any of them to see what is inside.`
                  : "No fleet detail is stored for this agent. The fleet backup has no record of it."}
              </p>
            </CardHeader>
            {detail && (
              <CardContent className="space-y-bc-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        <th className="py-2 pr-4 font-bold">Key</th>
                        <th className="py-2 pr-4 font-bold">Type</th>
                        <th className="py-2 text-right font-bold">Size</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                      {Object.entries(detail.data as Record<string, unknown>).map(([key, value]) => (
                        <tr key={key} className="border-b border-border/60 last:border-0">
                          <td className="py-1.5 pr-4 font-semibold">{key}</td>
                          <td className="py-1.5 pr-4 text-muted-foreground">{jsonTypeLabel(value)}</td>
                          <td className="py-1.5 text-right tabular-nums">{bytes(value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="rounded-bc-md border border-border bg-muted/30 p-4 overflow-x-auto">
                  <JsonTree value={detail.data} />
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
