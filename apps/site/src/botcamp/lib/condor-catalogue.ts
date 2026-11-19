import type { Prisma } from "@prisma/client"
import { notRacingWhere } from "@/botcamp/lib/strategy-access"

// What Condor's catalogue lists (GET /api/agents): an AGENT page that isn't
// private, with at least one APPROVED version, and not racing in a hackathon
// right now. Shared with the admin's Condor Ready tab so the two can't drift
// apart. Callers run advanceDueHackathonStages() first, since the racing check
// reads the stage.
export function condorCatalogueWhere(): Prisma.StrategyWhereInput {
  return {
    strategyType: "AGENT",
    visibility: { not: "PRIVATE" },
    agentVersions: { some: { status: "APPROVED" } },
    ...notRacingWhere(),
  }
}
