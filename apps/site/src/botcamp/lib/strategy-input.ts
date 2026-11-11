import { parseVideoUrl } from "@/botcamp/lib/video-embed"

// Caps on a strategy's free text, well above anything on prod (on 2026-10-29
// the longest title was 107 characters, summary 1,265, details 20,864). They
// exist so a create loop can't fill the database with megabyte-sized rows.
export const MAX_TITLE_LENGTH = 150
export const MAX_SUMMARY_LENGTH = 2_000
export const MAX_DETAILS_LENGTH = 100_000
// The longest comment on prod was 3,049 characters.
export const MAX_COMMENT_LENGTH = 10_000

export interface StrategyTextInput {
  title?: unknown
  summary?: unknown
  details?: unknown
  videoURL?: unknown
}

const TEXT_FIELDS = [
  ["title", "Title", MAX_TITLE_LENGTH],
  ["summary", "Summary", MAX_SUMMARY_LENGTH],
  ["details", "Details", MAX_DETAILS_LENGTH],
] as const

/**
 * The first problem with the strategy fields being written, or null. Absent,
 * null and "" values clear a field and always pass.
 *
 * The video link must be a YouTube, Vimeo, Loom or Google Drive video — it is
 * framed on the strategy page. It is only checked when it differs from
 * `storedVideoURL`: the editor sends every field on each save, so a link
 * saved before this check existed mustn't stop its author saving anything else.
 */
export function strategyInputError(input: StrategyTextInput, storedVideoURL: string | null = null): string | null {
  for (const [field, label, max] of TEXT_FIELDS) {
    const value = input[field]
    if (value === undefined || value === null) continue
    if (typeof value !== "string") return `${label} must be text`
    if (value.trim().length > max) return `${label} must be ${max.toLocaleString("en-US")} characters or fewer`
  }

  const video = input.videoURL
  if (video === undefined || video === null || video === "") return null
  if (typeof video !== "string") return "Video link must be text"
  if (video === storedVideoURL) return null
  if (!parseVideoUrl(video)) {
    return "Video link must be a YouTube, Vimeo, Loom or Google Drive video"
  }
  return null
}
