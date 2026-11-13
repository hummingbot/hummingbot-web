export type VideoProvider = "youtube" | "vimeo" | "loom" | "gdrive"

export interface VideoEmbed {
  provider: VideoProvider
  /** Always https://<the provider's own host>/…/<validated id>. */
  embedUrl: string
}

// Video links are user input that ends up as an iframe src. An embed URL is
// only ever built from a fixed provider host plus an ID that matched one of
// these — never by passing the input through — so a link can't frame another
// site, or one of our own URLs that serves an uploaded file.
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/
const VIMEO_ID = /^\d+$/
const VIMEO_HASH = /^[A-Za-z0-9]+$/
const LOOM_ID = /^[A-Za-z0-9]+$/
const DRIVE_ID = /^[A-Za-z0-9_-]+$/

function youtube(id: string | null | undefined): VideoEmbed | null {
  return id && YOUTUBE_ID.test(id) ? { provider: "youtube", embedUrl: `https://www.youtube.com/embed/${id}` } : null
}

function vimeo(id: string | null | undefined, hash?: string | null): VideoEmbed | null {
  if (!id || !VIMEO_ID.test(id)) return null
  if (hash && !VIMEO_HASH.test(hash)) return null
  return { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/${id}${hash ? `?h=${hash}` : ""}` }
}

function loom(id: string | null | undefined): VideoEmbed | null {
  return id && LOOM_ID.test(id) ? { provider: "loom", embedUrl: `https://www.loom.com/embed/${id}` } : null
}

function gdrive(id: string | null | undefined): VideoEmbed | null {
  return id && DRIVE_ID.test(id) ? { provider: "gdrive", embedUrl: `https://drive.google.com/file/d/${id}/preview` } : null
}

/**
 * The embed for a YouTube, Vimeo, Loom or Google Drive video link, or null for
 * anything else (another host, an unrecognized path, a malformed ID). The
 * host is matched exactly, so `https://evil.example/?youtube.com/embed/x` and
 * our own `/api/...?youtube.com/embed/x` are both null.
 */
export function parseVideoUrl(input: string): VideoEmbed | null {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return null
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null
  if (url.username || url.password || url.port) return null

  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, "")
  const [first, second, third] = url.pathname.split("/").filter(Boolean)

  switch (host) {
    case "youtube.com":
    case "youtube-nocookie.com":
      if (first === "watch") return youtube(url.searchParams.get("v"))
      if (first === "embed" || first === "live" || first === "shorts" || first === "v") return youtube(second)
      return null
    case "youtu.be":
      return youtube(first)
    case "vimeo.com":
      // vimeo.com/ID, vimeo.com/ID/HASH (unlisted), vimeo.com/video/ID
      if (first === "video") return vimeo(second, url.searchParams.get("h"))
      return vimeo(first, second ?? url.searchParams.get("h"))
    case "player.vimeo.com":
      return first === "video" ? vimeo(second, url.searchParams.get("h")) : null
    case "loom.com":
      return first === "share" || first === "embed" ? loom(second) : null
    case "drive.google.com":
      if (first === "file" && second === "d") return gdrive(third)
      if (first === "open") return gdrive(url.searchParams.get("id"))
      return null
    default:
      return null
  }
}

/**
 * The embed for a stored `Lesson.videoId`: a full URL, a "<platform>:<id>"
 * string ("vimeo:123456"), a bare YouTube ID, or a bare numeric Vimeo ID (as
 * the lesson editors read it). Null when it's none of those.
 */
export function parseLessonVideo(videoId: string): VideoEmbed | null {
  const value = videoId.trim()
  if (/^https?:\/\//i.test(value)) return parseVideoUrl(value)
  const [prefix, ...rest] = value.split(":")
  const id = rest.join(":")
  switch (prefix) {
    case "youtube":
      return youtube(id)
    case "vimeo": {
      const [vimeoId, hash] = id.split("/")
      return vimeo(vimeoId, hash)
    }
    case "loom":
      return loom(id)
    case "gdrive":
      return gdrive(id)
    default:
      if (rest.length > 0) return null
      return VIMEO_ID.test(value) ? vimeo(value) : youtube(value)
  }
}

/** The YouTube video ID behind a link, or null if it isn't a valid YouTube link. */
export function youtubeVideoId(input: string): string | null {
  const embed = parseVideoUrl(input)
  return embed?.provider === "youtube" ? embed.embedUrl.slice(embed.embedUrl.lastIndexOf("/") + 1) : null
}

/** iframe `sandbox` for a provider embed: enough for the player, and nothing
 * that matters once the src can only be a provider's own host. */
export const VIDEO_IFRAME_SANDBOX = "allow-scripts allow-same-origin allow-presentation allow-popups"
