import JSZip from "jszip"
import { inflateCapped } from "@/botcamp/lib/agent-package"

// Shared by the admin full-strategy download and the reviewer "download all
// files" endpoint: best-effort fetches a strategy's external LINK files
// (GitHub repos/files/gists, public Google Drive files) so they land inside
// the zip next to the uploaded files, instead of being just a clickable URL.

// Any viewer with code access can trigger these fetches, and the link target
// is author-controlled — cap what one link may pull into server memory.
const MAX_LINK_BYTES = 50 * 1024 * 1024

// And what one download may hold in all. The per-link cap only bounded the
// zipball as fetched: its entries were inflated without limit, so a 50 MB
// zipball of highly compressible files grew to tens of GB in memory (and
// into the zip handed to whoever downloaded it), and a strategy could list
// any number of links.
const MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024
const MAX_LINKS_PER_DOWNLOAD = 10
const MAX_REPO_ENTRIES = 5000

/** What's left for one download; pass the same one to every embedLink call. */
export interface EmbedBudget {
  bytes: number
  links: number
}

export function newEmbedBudget(): EmbedBudget {
  return { bytes: MAX_DOWNLOAD_BYTES, links: MAX_LINKS_PER_DOWNLOAD }
}

class TooLargeError extends Error {
  constructor() {
    super(`Linked content is larger than ${MAX_LINK_BYTES / 1024 / 1024} MB`)
  }
}

/** Reads a response body, aborting once it passes MAX_LINK_BYTES (or `max`). */
async function readCapped(res: Response, max = MAX_LINK_BYTES): Promise<Buffer> {
  const declared = Number(res.headers.get("content-length"))
  if (declared > max) throw new TooLargeError()
  if (!res.body) return Buffer.alloc(0)

  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > max) {
      await reader.cancel()
      throw new TooLargeError()
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks)
}

export type LinkOutcome =
  | { status: "embedded"; note: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string }

export type ParsedLink =
  | { kind: "gh-repo"; owner: string; repo: string; branch?: string }
  | { kind: "gh-file"; owner: string; repo: string; branch: string; path: string }
  | { kind: "gh-gist"; gistId: string }
  | { kind: "gdrive-file"; fileId: string }
  | { kind: "gdrive-folder" }
  | { kind: "unsupported"; reason: string }
  | { kind: "invalid" }

// Replace path-hostile characters; preserve readability for user-set labels.
export function sanitizeSegment(s: string): string {
  const cleaned = s.replace(/[<>:"/\\|?*\x00-\x1f]+/g, "_").trim()
  // "." and ".." would step out of the folder this segment names.
  return cleaned && !/^\.+$/.test(cleaned) ? cleaned : "link"
}

export function parseLink(url: string): ParsedLink {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { kind: "invalid" }
  }

  if (parsed.hostname === "github.com") {
    const parts = parsed.pathname.split("/").filter(Boolean)
    if (parts.length < 2) {
      return { kind: "unsupported", reason: "GitHub URL missing owner/repo" }
    }
    const [owner, repo, kind, ...rest] = parts
    if (!kind) return { kind: "gh-repo", owner, repo }
    if (kind === "tree" && rest.length >= 1) {
      return { kind: "gh-repo", owner, repo, branch: rest[0] }
    }
    if (kind === "blob" && rest.length >= 2) {
      const [branch, ...pathParts] = rest
      return { kind: "gh-file", owner, repo, branch, path: pathParts.join("/") }
    }
    return { kind: "unsupported", reason: `Unsupported GitHub URL segment /${kind}` }
  }

  if (parsed.hostname === "gist.github.com") {
    // Patterns: /<gistId>, /<user>/<gistId>, optionally with .git or trailing parts.
    const parts = parsed.pathname.split("/").filter(Boolean)
    const raw = parts.length === 1 ? parts[0] : parts.length >= 2 ? parts[1] : undefined
    if (raw) {
      const gistId = raw.replace(/\.git$/, "")
      if (/^[a-f0-9]+$/i.test(gistId)) return { kind: "gh-gist", gistId }
    }
    return { kind: "unsupported", reason: "Unrecognized Gist URL shape" }
  }

  if (parsed.hostname === "drive.google.com") {
    if (parsed.pathname.startsWith("/drive/folders/")) {
      return { kind: "gdrive-folder" }
    }
    const fileMatch = /\/file\/d\/([^/]+)/.exec(parsed.pathname)
    if (fileMatch) return { kind: "gdrive-file", fileId: fileMatch[1] }
    const idParam = parsed.searchParams.get("id")
    if (idParam && (parsed.pathname === "/open" || parsed.pathname === "/uc")) {
      return { kind: "gdrive-file", fileId: idParam }
    }
    return { kind: "unsupported", reason: "Unrecognized Google Drive URL shape" }
  }

  return { kind: "unsupported", reason: `Host ${parsed.hostname} not handled` }
}

// Content added to the zip draws on the download's budget.
function spend(budget: EmbedBudget, bytes: number) {
  budget.bytes -= bytes
  if (budget.bytes < 0) throw new Error("This download reached its size limit")
}

async function embedGitHubRepo(
  zip: JSZip,
  budget: EmbedBudget,
  baseDir: string,
  owner: string,
  repo: string,
  branch?: string
): Promise<LinkOutcome> {
  const branchPart = branch ? `/${branch}` : ""
  const url = `https://api.github.com/repos/${owner}/${repo}/zipball${branchPart}`
  const res = await fetch(url, {
    headers: {
      "User-Agent": "botcamp-strategy-download",
      Accept: "application/vnd.github+json",
    },
  })
  if (!res.ok) {
    return { status: "failed", reason: `GitHub zipball HTTP ${res.status}` }
  }
  const buf = await readCapped(res)
  const inner = await JSZip.loadAsync(buf)
  const entries = Object.entries(inner.files)
  if (entries.length === 0) {
    return { status: "failed", reason: "GitHub zipball was empty" }
  }
  if (entries.filter(([, entry]) => !entry.dir).length > MAX_REPO_ENTRIES) {
    return { status: "skipped", reason: `Repository has more than ${MAX_REPO_ENTRIES} files` }
  }
  // GitHub wraps everything in `<owner>-<repo>-<sha>/`; strip that prefix.
  const rootPrefix = entries[0][0].split("/")[0] + "/"
  let count = 0
  let available = budget.bytes
  const inflated: [string, Buffer][] = []
  for (const [path, entry] of entries) {
    if (entry.dir) continue
    const rel = path.startsWith(rootPrefix) ? path.slice(rootPrefix.length) : path
    if (!rel) continue
    // Inflated as a stream and cut off at what the download has left. Held
    // back until the whole repo fits, so a repo that doesn't is left out
    // entirely rather than half-copied.
    const content = await inflateCapped(entry, Math.max(0, Math.min(MAX_LINK_BYTES, available)))
    available -= content.length
    inflated.push([`${baseDir}/${rel}`, content])
  }
  for (const [path, content] of inflated) {
    spend(budget, content.length)
    zip.file(path, content)
    count++
  }
  const ref = branch ? `@${branch}` : ""
  return {
    status: "embedded",
    note: `${count} files from ${owner}/${repo}${ref} → ${baseDir}/`,
  }
}

async function embedGitHubFile(
  zip: JSZip,
  budget: EmbedBudget,
  baseDir: string,
  owner: string,
  repo: string,
  branch: string,
  filePath: string
): Promise<LinkOutcome> {
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`
  const res = await fetch(rawUrl)
  if (!res.ok) {
    return { status: "failed", reason: `raw.githubusercontent.com HTTP ${res.status}` }
  }
  const buf = await readCapped(res, Math.min(MAX_LINK_BYTES, budget.bytes))
  spend(budget, buf.length)
  const basename = filePath.split("/").pop() || "file"
  zip.file(`${baseDir}/${basename}`, buf)
  return {
    status: "embedded",
    note: `${owner}/${repo}/${filePath} → ${baseDir}/${basename}`,
  }
}

async function embedGitHubGist(
  zip: JSZip,
  budget: EmbedBudget,
  baseDir: string,
  gistId: string
): Promise<LinkOutcome> {
  const url = `https://api.github.com/gists/${gistId}`
  const res = await fetch(url, {
    headers: {
      "User-Agent": "botcamp-strategy-download",
      Accept: "application/vnd.github+json",
    },
  })
  if (!res.ok) {
    return { status: "failed", reason: `Gist API HTTP ${res.status}` }
  }
  const data = (await res.json()) as {
    files?: Record<string, { filename: string; raw_url: string } | null>
  }
  const files = data.files ? Object.values(data.files).filter(Boolean) : []
  if (files.length === 0) {
    return { status: "failed", reason: "Gist has no files" }
  }
  let count = 0
  const errors: string[] = []
  for (const f of files) {
    if (!f?.filename || !f?.raw_url) continue
    const r = await fetch(f.raw_url)
    if (!r.ok) {
      errors.push(`${f.filename}: HTTP ${r.status}`)
      continue
    }
    const content = await readCapped(r, Math.min(MAX_LINK_BYTES, budget.bytes))
    spend(budget, content.length)
    zip.file(`${baseDir}/${sanitizeSegment(f.filename)}`, content)
    count++
  }
  if (count === 0) {
    return { status: "failed", reason: `Could not download any gist files (${errors.join("; ")})` }
  }
  const suffix = errors.length ? ` (skipped ${errors.length})` : ""
  return { status: "embedded", note: `${count} files from gist ${gistId} → ${baseDir}/${suffix}` }
}

async function embedGoogleDriveFile(
  zip: JSZip,
  budget: EmbedBudget,
  baseDir: string,
  fileId: string
): Promise<LinkOutcome> {
  const url = `https://drive.google.com/uc?export=download&id=${fileId}`
  const res = await fetch(url, { redirect: "follow" })
  if (!res.ok) {
    return { status: "failed", reason: `Drive HTTP ${res.status}` }
  }
  const contentDisp = res.headers.get("content-disposition")
  const contentType = res.headers.get("content-type") || ""
  // No attachment header + HTML body = Drive's virus-scan / confirm interstitial.
  if (!contentDisp && contentType.includes("text/html")) {
    return {
      status: "skipped",
      reason: "Drive returned a confirmation page (file likely too large or not public)",
    }
  }
  let filename = "drive-file"
  if (contentDisp) {
    const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisp)
    if (m) filename = sanitizeSegment(decodeURIComponent(m[1]))
  }
  const buf = await readCapped(res, Math.min(MAX_LINK_BYTES, budget.bytes))
  spend(budget, buf.length)
  zip.file(`${baseDir}/${filename}`, buf)
  return { status: "embedded", note: `Drive file → ${baseDir}/${filename}` }
}

/**
 * Best-effort fetch of a strategy LINK file's content into
 * `${rootDir}/code/<label>/`, within `budget` — one per download, shared by
 * every link in it.
 */
export async function embedLink(
  zip: JSZip,
  rootDir: string,
  label: string,
  url: string,
  budget: EmbedBudget,
): Promise<LinkOutcome> {
  const baseDir = `${rootDir}/code/${sanitizeSegment(label)}`
  if (budget.links <= 0) {
    return { status: "skipped", reason: `Only the first ${MAX_LINKS_PER_DOWNLOAD} links are fetched` }
  }
  budget.links--
  const parsed = parseLink(url)
  try {
    switch (parsed.kind) {
      case "invalid":
        return { status: "failed", reason: "Invalid URL" }
      case "unsupported":
        return { status: "skipped", reason: parsed.reason }
      case "gdrive-folder":
        return {
          status: "skipped",
          reason: "Google Drive folders require API credentials to enumerate",
        }
      case "gh-repo":
        return await embedGitHubRepo(zip, budget, baseDir, parsed.owner, parsed.repo, parsed.branch)
      case "gh-file":
        return await embedGitHubFile(
          zip,
          budget,
          baseDir,
          parsed.owner,
          parsed.repo,
          parsed.branch,
          parsed.path
        )
      case "gh-gist":
        return await embedGitHubGist(zip, budget, baseDir, parsed.gistId)
      case "gdrive-file":
        return await embedGoogleDriveFile(zip, budget, baseDir, parsed.fileId)
    }
  } catch (err) {
    return {
      status: "failed",
      reason: err instanceof Error ? err.message : "Unknown error",
    }
  }
}
