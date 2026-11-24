import type { Prisma } from "@prisma/client"

// Cap on how many strategies a user may author, the same for every user.
export const MAX_STRATEGIES_PER_USER = 10

// Cap on unfinished drafts a user may hold at once (admins excepted). A draft
// stops counting once it has an approved agent version — agent pages stay
// DRAFT after they're published — or is part of a hackathon application.
export const MAX_DRAFTS_PER_USER = 1

export function unfinishedDraftsWhere(userId: string): Prisma.StrategyWhereInput {
  return {
    status: "DRAFT",
    authors: { some: { userId } },
    agentVersions: { none: { status: "APPROVED" } },
    applications: { none: {} },
  }
}

// Statuses an author may delete their own strategy in. Approved and certified
// strategies stay: they can be published, cloned by Condor, or back a user's
// certification.
const AUTHOR_DELETABLE_STATUSES = ["DRAFT", "SUBMITTED", "CHANGES_REQUESTED"]

export function canAuthorDeleteStrategy(status: string): boolean {
  return AUTHOR_DELETABLE_STATUSES.includes(status)
}
