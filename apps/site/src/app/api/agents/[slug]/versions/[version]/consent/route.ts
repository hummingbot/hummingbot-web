import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/botcamp/lib/prisma"
import { resolveAgentForRequest } from "@/botcamp/lib/agent-registry"
import { findAgentConsent, findApprovedVersion, mismatchError, parseConsentVersion } from "@/botcamp/lib/agent-consent"

interface RouteParams {
  params: Promise<{ slug: string; version: string }>
}

// The consent to run an agent version is shown and accepted in Condor. These
// routes let Condor store it and read it back, authenticated by the token of
// the person's Condor connection (Connect Botcamp). Same access rules as
// cloning (resolveAgentForRequest); APPROVED versions only.
//
// A consent is pinned to the exact code: the version number in the path (never
// `latest`), plus the agent id and sha256 Condor reviewed, which must match
// what this slug and version resolve to now (409 otherwise).

const SHA256 = /^[0-9a-f]{64}$/i
const MAX_TERMS_VERSION = 64

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

async function resolve(request: NextRequest, params: RouteParams["params"]) {
  const { slug, version } = await params
  const number = parseConsentVersion(version)
  if (number === undefined) {
    return {
      error: NextResponse.json(
        { error: "Version must be a version number — consent is for an exact version" },
        { status: 400 },
      ),
    }
  }
  const result = await resolveAgentForRequest(request, slug)
  if (result.error) return { error: result.error }
  const { strategy, user } = result
  if (!user) {
    return { error: NextResponse.json({ error: "Sign in required — connect Condor to Botcamp" }, { status: 401 }) }
  }
  const agentVersion = await findApprovedVersion(strategy.id, number)
  if (!agentVersion) {
    return { error: NextResponse.json({ error: `Version ${number} is not approved` }, { status: 404 }) }
  }
  return { strategy, user, agentVersion }
}

/**
 * The agent id and sha256 Condor reviewed, checked against what the route
 * resolved to: a 400 when either is missing or malformed, a 409 when they
 * name a different agent or content.
 */
function checkPin(
  agentId: unknown,
  sha256: unknown,
  strategy: { id: number },
  agentVersion: { sha256: string },
): NextResponse | null {
  const id = text(agentId)
  const digest = text(sha256)
  if (!id || !digest || !SHA256.test(digest)) {
    return NextResponse.json(
      { error: "`agentId` and `sha256` (the version's digest) are required — they pin the consent to the code you reviewed" },
      { status: 400 },
    )
  }
  const mismatch = mismatchError({ agentId: id, sha256: digest }, { agentId: String(strategy.id), sha256: agentVersion.sha256 })
  return mismatch ? NextResponse.json({ error: mismatch }, { status: 409 }) : null
}

function consentBody(
  strategy: { id: number; slug: string },
  agentVersion: { version: number; sha256: string },
  consent: { acceptedAt: Date; termsVersion: string } | null,
) {
  return {
    data: {
      agentId: String(strategy.id),
      slug: strategy.slug,
      version: agentVersion.version,
      sha256: agentVersion.sha256,
      accepted: !!consent,
      acceptedAt: consent?.acceptedAt.toISOString() ?? null,
      termsVersion: consent?.termsVersion ?? null,
    },
  }
}

// GET /api/agents/[slug]/versions/[version]/consent?agentId=&sha256= - Whether
// this person already consented to this exact version.
export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const result = await resolve(request, params)
    if (result.error) return result.error
    const { strategy, user, agentVersion } = result

    const query = request.nextUrl.searchParams
    const pinError = checkPin(query.get("agentId"), query.get("sha256"), strategy, agentVersion)
    if (pinError) return pinError

    const consent = await findAgentConsent(user.id, agentVersion.id)
    return NextResponse.json(consentBody(strategy, agentVersion, consent))
  } catch (error) {
    console.error("Error fetching agent consent:", error)
    return NextResponse.json({ error: "Failed to fetch consent" }, { status: 500 })
  }
}

// POST /api/agents/[slug]/versions/[version]/consent - The person accepted
// Condor's terms for this version.
// Body: { accepted: true, agentId: string, sha256: string, termsVersion: string }.
// Only a Condor connection (Bearer token) may send it. Idempotent: the first
// acceptance is the one kept (201 the first time, 200 after).
export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const result = await resolve(request, params)
    if (result.error) return result.error
    const { strategy, user, agentVersion } = result

    if (!user.tokenId) {
      return NextResponse.json({ error: "Consent is given from Condor — accept it there" }, { status: 403 })
    }

    const input = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (input?.accepted !== true) {
      return NextResponse.json({ error: "`accepted` must be true" }, { status: 400 })
    }
    const termsVersion = text(input.termsVersion)
    if (!termsVersion || termsVersion.length > MAX_TERMS_VERSION) {
      return NextResponse.json(
        { error: `\`termsVersion\` is required (at most ${MAX_TERMS_VERSION} characters): which terms the person accepted` },
        { status: 400 },
      )
    }
    const pinError = checkPin(input.agentId, input.sha256, strategy, agentVersion)
    if (pinError) return pinError

    const existing = await findAgentConsent(user.id, agentVersion.id)
    if (existing) return NextResponse.json(consentBody(strategy, agentVersion, existing))

    const consent = await prisma.agentConsent.upsert({
      where: { userId_agentVersionId: { userId: user.id, agentVersionId: agentVersion.id } },
      create: {
        userId: user.id,
        agentVersionId: agentVersion.id,
        sha256: agentVersion.sha256,
        termsVersion,
        apiTokenId: user.tokenId,
      },
      // A concurrent retry already wrote it; keep the first.
      update: {},
      select: { acceptedAt: true, termsVersion: true },
    })
    return NextResponse.json(consentBody(strategy, agentVersion, consent), { status: 201 })
  } catch (error) {
    console.error("Error recording agent consent:", error)
    return NextResponse.json({ error: "Failed to record consent" }, { status: 500 })
  }
}
