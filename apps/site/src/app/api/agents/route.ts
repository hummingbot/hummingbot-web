import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { condorCatalogueWhere } from "@/botcamp/lib/condor-catalogue"
import { SCOPE_AGENTS_PUBLISH, getAgentRequestUser } from "@/botcamp/lib/api-tokens"
import { buildAgentArchive } from "@/botcamp/lib/agent-package"
import { checkAgentPackage, packageReadLimitError, saveAgentVersion, uploadLimitError } from "@/botcamp/lib/agent-upload"
import { contractTime, parseCondorPublish, reasonsFromIssues, receipt, rejected } from "@/botcamp/lib/condor-publish"
import { getEffectiveMembership } from "@/botcamp/lib/utils"
import { hasHackathonEntry } from "@/botcamp/lib/hackathon-data"
import { createStrategy } from "@/botcamp/lib/strategy-create"
import { venuesInPackage } from "@/botcamp/lib/agent-package-venues"
import { getExistingValues, resolveToExisting } from "@/botcamp/lib/strategy-tags"
import { requestIp } from "@/botcamp/lib/request-ip"
import { getFreePreviewStrategyIds } from "@/botcamp/lib/strategy-access"
import { advanceDueHackathonStages } from "@/botcamp/lib/hackathon-stage-advance"

const CATALOGUE_PAGE_SIZE = 20

// GET /api/agents?query=&page= - The catalogue Condor's Hub browses
// (contract §3.1): agents with an APPROVED version whose page isn't private,
// newest first. Anonymous on purpose, and metadata only — no code; pulling
// one is still GET /api/agents/[slug]/versions/[n|latest] with a token, under
// the website's access rules (`free` says whether membership is needed).
// The bare `{ listings }` shape; a short or empty page is the last.
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const query = (request.nextUrl.searchParams.get("query") ?? "").trim().slice(0, 100)
    const page = Math.max(1, Math.floor(Number(request.nextUrl.searchParams.get("page")) || 1))

    // The racing check reads the stage; a race that just ended lists right away
    await advanceDueHackathonStages()
    const strategies = await prisma.strategy.findMany({
      where: {
        ...condorCatalogueWhere(),
        ...(query && {
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            { summary: { contains: query, mode: "insensitive" as const } },
            { slug: { contains: query.replace(/_/g, "-"), mode: "insensitive" as const } },
          ],
        }),
      },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        authors: { select: { user: { select: { firstName: true, lastName: true, slug: true } } }, take: 1 },
        agentVersions: {
          where: { status: "APPROVED" },
          select: { version: true, sha256: true, size: true, reviewedAt: true, createdAt: true },
          orderBy: { version: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * CATALOGUE_PAGE_SIZE,
      take: CATALOGUE_PAGE_SIZE,
    })

    const freeIds = await getFreePreviewStrategyIds()
    const listings = strategies.map((s) => {
      const latest = s.agentVersions[0]
      const author = s.authors[0]?.user
      return {
        listing_id: s.slug,
        // Stable across renames, unlike the slug: what a consent is pinned to.
        agent_id: String(s.id),
        slug: s.slug,
        name: s.title,
        description: s.summary ?? "",
        version: latest.version,
        author: {
          name: [author?.firstName, author?.lastName].filter(Boolean).join(" "),
          handle: author?.slug ?? "",
        },
        // An admin checked this exact version after the AI review.
        badge: "validated",
        digest: latest.sha256,
        bytes: latest.size,
        published_at: contractTime(latest.reviewedAt ?? latest.createdAt),
        free: freeIds.has(s.id),
      }
    })
    return NextResponse.json({ listings }, { headers: { "Cache-Control": "public, max-age=60" } })
  } catch (error) {
    console.error("Error listing agents:", error)
    return NextResponse.json({ error: "Failed to list agents" }, { status: 500 })
  }
}

// Vercel caps request bodies at 4.5MB; refuse past it with a sentence rather
// than the platform's bare 413.
const MAX_BODY_BYTES = 4.5 * 1024 * 1024

// POST /api/agents - Condor publishes one of its agents for review
// (condor/hub.py `publish`, contract §5.2). The bundle goes through the same
// structure check and limits as a website upload and lands as a PENDING
// version for the AI review and an admin's check.
//
// The version goes under the caller's own page for this agent: the one an
// earlier publish of the same Condor agent (its agent_uid) went to, else the
// one whose slug is the agent's (`adaptive_grid_trader` or
// `adaptive-grid-trader`). With none, a private draft page is made from the
// agent's name and description, under the same rules as creating one on the
// website (the strategy limit, and hidden until approved for non-members),
// for the author to finish there before it is listed.
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getAgentRequestUser(request)
    if (!user) {
      return NextResponse.json(
        { error: "Sign in required — connect Condor to Botcamp (Agent Hub → Sign in to Botcamp), then try again" },
        { status: 401 },
      )
    }
    if (!user.scopes.includes(SCOPE_AGENTS_PUBLISH)) {
      return NextResponse.json({ error: "This token can't publish agents — reconnect Condor to Botcamp" }, { status: 403 })
    }

    // The same hourly cap as the website's package checks, counted before
    // the body is read: a refused or repeated publish still made us parse,
    // hash and check up to 4.5MB.
    if (user.role !== "ADMIN") {
      const limited = await packageReadLimitError(user.id)
      if (limited) return limited
    }

    const raw = await request.text()
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "This agent is over the 4.5MB publish limit" }, { status: 413 })
    }
    let body: unknown
    try {
      body = JSON.parse(raw)
    } catch {
      return rejected([{ rule: "structural", detail: "The request body is not JSON" }])
    }

    const parsed = parseCondorPublish(body)
    if ("reasons" in parsed) return rejected(parsed.reasons)
    const { publish } = parsed

    // Checked before any page is made, so a refused publish leaves nothing behind.
    const checked = checkAgentPackage(publish.files)
    if (checked.error) {
      const report = (await checked.error.json()) as { errors?: { path?: string; message: string }[] }
      return rejected(reasonsFromIssues(report.errors ?? []))
    }

    const existing = await findAgentPage(user.id, publish.agent)

    // A retry of the same bytes answers with the version it already made
    // (§5.4) rather than tripping the one-in-review limit below.
    if (existing) {
      const { sha256 } = await buildAgentArchive(checked.report.files)
      const latest = await prisma.agentVersion.findFirst({
        where: { strategyId: existing.id },
        select: { id: true, version: true, status: true, createdAt: true, sha256: true },
        orderBy: { version: "desc" },
      })
      if (latest?.sha256 === sha256) {
        return NextResponse.json(receipt(latest, publish), { status: 202 })
      }
    }

    if (user.role !== "ADMIN") {
      const limited = await uploadLimitError(user.id, existing?.id ?? null)
      if (limited) return limited
    }

    let created: { id: number } | null = null
    if (!existing) {
      // Where it trades, as the site's exchanges, like the New Agent flow,
      // so its card shows its venues.
      const exchanges = resolveToExisting(
        venuesInPackage(publish.files),
        (await getExistingValues()).exchanges,
      ).resolved
      const page = await createAgentPage(user, publish.agent, requestIp(request.headers), exchanges)
      if ("error" in page) return page.error
      created = page
    }
    const strategyId = existing?.id ?? created!.id
    // A page made for this publish goes again if the version can't be stored,
    // so a failed publish never leaves an empty draft behind.
    const discard = () => (created ? prisma.strategy.delete({ where: { id: created.id } }) : Promise.resolve())
    let saved: Awaited<ReturnType<typeof saveAgentVersion>>
    try {
      saved = await saveAgentVersion(strategyId, user.id, checked.report, {
        source: "CONDOR",
        sourceUrl: condorAgentRef(publish.agent.agentUid),
        sourceRef: publish.digest,
      }, { enforceLimits: user.role !== "ADMIN" })
    } catch (error) {
      await discard()
      throw error
    }
    if (saved.error) {
      await discard()
      return saved.error
    }
    return NextResponse.json(receipt(saved.version, publish), { status: 202 })
  } catch (error) {
    console.error("Error publishing agent from Condor:", error)
    return NextResponse.json({ error: "Failed to publish agent" }, { status: 500 })
  }
}

// Recorded on each version a Condor publish stores, so the next publish of the
// same agent finds its page even after a rename.
function condorAgentRef(agentUid: string): string | null {
  return agentUid ? `condor:agent/${agentUid}` : null
}

async function findAgentPage(userId: string, agent: { slug: string; agentUid: string }) {
  const ref = condorAgentRef(agent.agentUid)
  if (ref) {
    const prior = await prisma.agentVersion.findFirst({
      where: {
        source: "CONDOR",
        sourceUrl: ref,
        uploadedById: userId,
        strategy: { strategyType: "AGENT", authors: { some: { userId } } },
      },
      select: { strategyId: true },
      orderBy: { createdAt: "desc" },
    })
    if (prior) return { id: prior.strategyId }
  }
  const slugs = [...new Set([agent.slug, agent.slug.replace(/_/g, "-")])]
  return prisma.strategy.findFirst({
    where: { slug: { in: slugs }, strategyType: "AGENT", authors: { some: { userId } } },
    select: { id: true },
  })
}

async function createAgentPage(
  user: { id: string; role: string; isMember: boolean },
  agent: { slug: string; name: string; description: string },
  ip: string | null,
  exchanges: string[],
): Promise<{ id: number } | { error: NextResponse }> {
  // The website's own create rules (POST /api/user/strategies): the strategy
  // and draft caps, the daily create quota, and hidden until approved for
  // non-members.
  const { isMember } = getEffectiveMembership(user)
  const agentApprovalRequired = !isMember && !(await hasHackathonEntry(user.id))
  const created = await createStrategy({
    userId: user.id,
    role: user.role,
    ip,
    title: agent.name || agent.slug,
    data: {
      summary: agent.description || null,
      exchanges,
      strategyType: "AGENT",
      agentApprovalRequired,
      status: "DRAFT",
      visibility: "PRIVATE",
    },
  })
  if ("refusal" in created) {
    const { error, status, retryAfterSeconds } = created.refusal
    return {
      error: NextResponse.json(
        { error },
        { status, headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined },
      ),
    }
  }
  return { id: created.strategy.id }
}
