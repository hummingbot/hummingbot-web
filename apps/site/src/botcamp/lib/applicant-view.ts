// Fields an applicant never sees on their own application: notes written
// about it for the sponsor teams. `teamNote` is the legacy shared team note
// (per-team notes live in ApplicationTeamNote now; drop the column once
// scripts/migrate-team-notes.ts has run on prod), `adminNote` Botcamp's note
// to the teams. Pass as `omit` on every applicant-facing application query.
export const APPLICANT_OMIT = { teamNote: true, adminNote: true } as const
