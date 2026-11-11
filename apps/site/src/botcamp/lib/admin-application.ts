interface AdminScorer {
  name: string | null
  firstName: string | null
  lastName: string | null
  email: string
}

export function getAdminScorerName(scorer: AdminScorer): string {
  return scorer.name || [scorer.firstName, scorer.lastName].filter(Boolean).join(" ") || scorer.email
}

export interface ApplicationScoreEntry {
  adminId: string
  score: number
  admin: AdminScorer
}

export interface ApplicationScoreSummary {
  average: number | null
  count: number
  entries: { adminId: string; adminName: string; score: number }[]
}

/** Averages every admin's individual 1-10 rating on an application. */
export function summarizeApplicationScores(scores: ApplicationScoreEntry[]): ApplicationScoreSummary {
  const entries = scores.map((s) => ({
    adminId: s.adminId,
    adminName: getAdminScorerName(s.admin),
    score: s.score,
  }))

  if (entries.length === 0) {
    return { average: null, count: 0, entries }
  }

  const total = entries.reduce((sum, e) => sum + e.score, 0)
  return {
    average: Math.round((total / entries.length) * 10) / 10,
    count: entries.length,
    entries,
  }
}

export interface SponsorScoreSummary {
  average: number | null
  count: number
}

/**
 * Same average as summarizeApplicationScores, but without the per-admin
 * entries — this version is safe to expose to a sponsor team, which should
 * see our overall rating but not which admin gave which score.
 */
export function summarizeScoresForSponsor(scores: { score: number }[]): SponsorScoreSummary {
  if (scores.length === 0) {
    return { average: null, count: 0 }
  }
  const total = scores.reduce((sum, s) => sum + s.score, 0)
  return {
    average: Math.round((total / scores.length) * 10) / 10,
    count: scores.length,
  }
}
