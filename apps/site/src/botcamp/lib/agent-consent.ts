import { prisma } from "@/botcamp/lib/prisma"

// Consent to run an agent version lives in Condor: Condor shows its terms,
// and when the person accepts it posts the acceptance with the token of
// their Condor connection (POST /api/agents/[slug]/versions/[version]/consent).
// Botcamp only receives and stores it — one per person and version.
//
// A consent names exactly what was accepted: the agent's id (the strategy id,
// stable across renames, unlike the slug in the route), the version number,
// the version's sha256 and the terms text. A new version is a new consent.

/** A consent's version path segment: a positive integer, never `latest`. Undefined when invalid. */
export function parseConsentVersion(version: string): number | undefined {
  const number = Number(version)
  return Number.isInteger(number) && number > 0 ? number : undefined
}

/** The APPROVED version with this number, or null. */
export function findApprovedVersion(strategyId: number, version: number) {
  return prisma.agentVersion.findFirst({
    where: { strategyId, status: "APPROVED", version },
    select: { id: true, version: true, sha256: true },
  })
}

export function findAgentConsent(userId: string, agentVersionId: string) {
  return prisma.agentConsent.findUnique({
    where: { userId_agentVersionId: { userId, agentVersionId } },
    select: { acceptedAt: true, termsVersion: true },
  })
}

/**
 * Checks that the agent id and sha256 Condor sends name the version this route
 * resolved to: the slug may have been re-pointed since Condor showed the
 * review. Returns the error to answer, or null.
 */
export function mismatchError(
  sent: { agentId: string; sha256: string },
  expected: { agentId: string; sha256: string },
): string | null {
  if (sent.agentId !== expected.agentId) {
    return "This slug now names a different agent than the one you reviewed — review it again"
  }
  if (sent.sha256.toLowerCase() !== expected.sha256.toLowerCase()) {
    return "This version's content isn't the one you reviewed — review it again"
  }
  return null
}
