import { strategyInputError } from "@/botcamp/lib/strategy-input"

// Changes an admin suggests to an agent page's text while reviewing it
// (Strategy.pageSuggestions). A page's text isn't reviewed like its package —
// the author edits it freely — so instead of rewriting it, the reviewer
// proposes new wording and the author accepts or dismisses each field.

export const SUGGESTIBLE_FIELDS = ["title", "summary", "details"] as const
export type SuggestibleField = (typeof SUGGESTIBLE_FIELDS)[number]

export const SUGGESTIBLE_FIELD_LABELS: Record<SuggestibleField, string> = {
  title: "Name",
  summary: "Summary",
  details: "Detailed Description",
}

export interface PageSuggestions {
  /** The suggested replacement for each field; a field left out has none. */
  fields: Partial<Record<SuggestibleField, string>>
  /** Why, for the author. */
  note: string | null
  suggestedAt: string
  suggestedById: string
}

const MAX_NOTE_LENGTH = 2000

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

/** The stored JSON, or null when there's nothing pending (or it's malformed). */
export function readPageSuggestions(value: unknown): PageSuggestions | null {
  if (!isRecord(value) || !isRecord(value.fields)) return null
  const fields: PageSuggestions["fields"] = {}
  for (const field of SUGGESTIBLE_FIELDS) {
    const text = value.fields[field]
    if (typeof text === "string") fields[field] = text
  }
  if (Object.keys(fields).length === 0) return null
  return {
    fields,
    note: typeof value.note === "string" ? value.note : null,
    suggestedAt: typeof value.suggestedAt === "string" ? value.suggestedAt : "",
    suggestedById: typeof value.suggestedById === "string" ? value.suggestedById : "",
  }
}

/**
 * An admin's suggestion, checked against the page as it is: only fields whose
 * text actually changes are kept, each within the same limits as the editor.
 * `fields` empty means the admin withdrew every suggestion.
 */
export function buildPageSuggestions(
  input: unknown,
  current: Record<SuggestibleField, string | null>,
  adminId: string,
  now: Date = new Date(),
): { suggestions: PageSuggestions | null; error?: never } | { error: string; suggestions?: never } {
  if (!isRecord(input)) return { error: "Send the suggested fields" }
  const fields: PageSuggestions["fields"] = {}
  for (const field of SUGGESTIBLE_FIELDS) {
    const value = input[field]
    if (value === undefined || value === null) continue
    if (typeof value !== "string") return { error: `${SUGGESTIBLE_FIELD_LABELS[field]} must be text` }
    const text = value.trim()
    if (text === (current[field] ?? "").trim()) continue
    if (field === "title" && !text) return { error: "The suggested name can't be empty" }
    fields[field] = text
  }
  const inputError = strategyInputError(fields)
  if (inputError) return { error: inputError }

  const note = typeof input.note === "string" ? input.note.trim().slice(0, MAX_NOTE_LENGTH) || null : null
  if (Object.keys(fields).length === 0) return { suggestions: null }
  return { suggestions: { fields, note, suggestedAt: now.toISOString(), suggestedById: adminId } }
}

/** What's left once the author has accepted or dismissed `field`. */
export function withoutField(suggestions: PageSuggestions, field: SuggestibleField): PageSuggestions | null {
  const fields = { ...suggestions.fields }
  delete fields[field]
  return Object.keys(fields).length === 0 ? null : { ...suggestions, fields }
}
