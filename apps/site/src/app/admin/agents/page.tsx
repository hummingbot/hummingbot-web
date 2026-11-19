import Link from "next/link"
import type { AgentVersionStatus } from "@prisma/client"
import { prisma } from "@/botcamp/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { PageHeader } from "@/botcamp/components/ui/page-header"
import { AgentVersionsTable } from "@/botcamp/components/admin/AgentVersionsTable"
import { AgentCatalogTable, type AgentCatalogRow } from "@/botcamp/components/admin/AgentCatalogTable"
import type { AgentReviewRecord } from "@/botcamp/lib/agent-review"
import { condorCatalogueWhere } from "@/botcamp/lib/condor-catalogue"
import { advanceDueHackathonStages } from "@/botcamp/lib/hackathon-stage-advance"
import { cn } from "@/botcamp/lib/utils"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/botcamp/lib/api-utils"

export const metadata = {
  title: "Agents - Admin - Botcamp",
}

export const dynamic = "force-dynamic"

// Condor Ready leads: one row per agent Condor can clone (an APPROVED version
// on a page that isn't private), with all its versions inside — some of them
// may not be approved. The other tabs are per-version review states: the
// external AI review (docs/agent-review-api.md) rejects on its own, and what it
// passes lands in NEEDS_REVIEW for an admin's final check.
const TABS: { value: AgentVersionStatus | "ALL"; label: string }[] = [
  { value: "APPROVED", label: "Condor Ready" },
  { value: "REJECTED", label: "Rejected" },
  { value: "NEEDS_REVIEW", label: "Awaiting Admin" },
  { value: "PENDING", label: "Awaiting AI Review" },
  { value: "ALL", label: "All" },
]

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function AdminAgentsPage({ searchParams }: PageProps) {
  // Admins only: the admin layout also lets instructors in
  if (!(await requireAdmin())) redirect("/admin/courses")
  const requested = (await searchParams).status
  const tab = TABS.find((t) => t.value === requested)?.value ?? TABS[0].value

  // Condor Ready counts agents, not versions: an agent with five approved uploads
  // is one entry in Condor's catalogue (same filter as GET /api/agents).
  // The ids come from the catalogue's own filter, so a page left out for any
  // reason (private, not an agent page, racing) is never counted here.
  await advanceDueHackathonStages()
  const [counts, listed, versions, catalogue] = await Promise.all([
    prisma.agentVersion.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.strategy.findMany({ where: condorCatalogueWhere(), select: { id: true } }),
    tab === "APPROVED"
      ? Promise.resolve([])
      : prisma.agentVersion.findMany({
          where: tab === "ALL" ? {} : { status: tab },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            version: true,
            status: true,
            source: true,
            fileCount: true,
            aiReview: true,
            createdAt: true,
            strategy: { select: { title: true, slug: true } },
            uploadedBy: { select: { firstName: true, lastName: true, email: true } },
          },
        }),
    tab === "APPROVED"
      ? prisma.strategy.findMany({
          where: { agentVersions: { some: { status: "APPROVED" } } },
          orderBy: { title: "asc" },
          select: {
            id: true,
            title: true,
            slug: true,
            visibility: true,
            strategyType: true,
            authors: { select: { user: { select: { firstName: true, lastName: true, email: true } } } },
            agentVersions: {
              orderBy: { version: "desc" },
              select: {
                id: true,
                version: true,
                status: true,
                source: true,
                fileCount: true,
                createdAt: true,
                uploadedBy: { select: { firstName: true, lastName: true, email: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
  ])
  const listedIds = new Set(listed.map((s) => s.id))
  const catalogueCount = listedIds.size
  const countOf = (status: string) =>
    status === "APPROVED"
      ? catalogueCount
      : status === "ALL"
        ? counts.reduce((sum, c) => sum + c._count._all, 0)
        : (counts.find((c) => c.status === status)?._count._all ?? 0)

  const nameOf = (u: { firstName: string | null; lastName: string | null; email: string | null }) =>
    [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "—"

  // Listed agents first; the ones Condor doesn't list after them.
  const agents: AgentCatalogRow[] = catalogue
    .map((s) => ({
      strategyId: s.id,
      title: s.title,
      slug: s.slug,
      isPrivate: s.visibility === "PRIVATE",
      // Why Condor doesn't list it, if it doesn't. Whatever condorCatalogueWhere
      // leaves out that isn't the page type or visibility is a race in progress.
      notListed: listedIds.has(s.id)
        ? null
        : s.strategyType !== "AGENT"
          ? `${s.strategyType.toLowerCase()} page`
          : s.visibility === "PRIVATE"
            ? "private"
            : "racing in a hackathon",
      authors: s.authors.map((a) => nameOf(a.user)).join(", "),
      versions: s.agentVersions.map((v) => ({
        id: v.id,
        version: v.version,
        status: v.status,
        source: v.source,
        fileCount: v.fileCount,
        uploader: nameOf(v.uploadedBy),
        createdAt: v.createdAt.toISOString(),
      })),
    }))
    .sort((a, b) => Number(!!a.notListed) - Number(!!b.notListed))
  const notListedCount = agents.filter((a) => a.notListed).length

  const rows = versions.map((v) => {
    const review = v.aiReview as AgentReviewRecord | null
    return {
      id: v.id,
      agent: v.strategy.title,
      slug: v.strategy.slug,
      version: v.version,
      status: v.status,
      source: v.source,
      fileCount: v.fileCount,
      decision: review?.decision ?? null,
      findingCount: review?.findings?.length ?? 0,
      uploader: nameOf(v.uploadedBy),
      createdAt: v.createdAt.toISOString(),
    }
  })

  return (
    <div className="space-y-bc-6">
      <PageHeader
        title="Agents"
        description="Condor agent uploads. They wait for the AI review, which rejects what it can't confirm is safe; what it passes waits here for your final check before Condor can clone it"
        variant="admin"
      />

      <nav className="flex flex-wrap gap-2" aria-label="Filter by status">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={t.value === TABS[0].value ? "/admin/agents" : `/admin/agents?status=${t.value}`}
            className={cn(
              "rounded-bc-md border px-3 py-1.5 text-sm transition-colors",
              t.value === tab
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label} <span className="font-mono text-xs">({countOf(t.value)})</span>
          </Link>
        ))}
      </nav>

      <Card>
        <CardHeader>
          <CardTitle>
            {tab === "APPROVED"
              ? `Condor Ready (${catalogueCount}${notListedCount ? ` · ${notListedCount} approved but not listed` : ""})`
              : `${TABS.find((t) => t.value === tab)!.label} (${rows.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tab === "APPROVED" ? <AgentCatalogTable agents={agents} /> : <AgentVersionsTable versions={rows} />}
        </CardContent>
      </Card>
    </div>
  )
}
