import { prisma } from "@/botcamp/lib/prisma"

/**
 * Botcamp's database stores image URLs relative to botcamp.xyz: files from its
 * public/ folder ("/logos/x.png"), copied here under public/botcamp-assets/,
 * and team logos uploaded into the database, which Botcamp serves from
 * /api/teams/<slug>/logo. This site has no such API, so those are read from
 * the database and inlined as data URLs.
 */
const TEAM_LOGO_ROUTE = /^\/api\/teams\/([^/?#]+)\/logo(?:\?(.*))?$/

export async function resolveBotcampImageUrl(url: string | null): Promise<string | null> {
  if (!url || !url.startsWith("/")) return url
  const route = url.match(TEAM_LOGO_ROUTE)
  if (!route) return `/botcamp-assets${url}`

  const dark = new URLSearchParams(route[2] ?? "").get("variant") === "dark"
  const team = await prisma.team.findUnique({
    where: { slug: decodeURIComponent(route[1]) },
    select: {
      logoData: true,
      logoMimeType: true,
      logoUrl: true,
      logoDataDark: true,
      logoMimeTypeDark: true,
      logoUrlDark: true,
    },
  })
  if (!team) return null
  const data = dark ? team.logoDataDark : team.logoData
  const mimeType = dark ? team.logoMimeTypeDark : team.logoMimeType
  if (data && mimeType) return `data:${mimeType};base64,${Buffer.from(data).toString("base64")}`
  // Botcamp's route redirects to the stored URL when nothing was uploaded.
  const fallback = dark ? team.logoUrlDark : team.logoUrl
  return fallback && !TEAM_LOGO_ROUTE.test(fallback) ? resolveBotcampImageUrl(fallback) : null
}

/**
 * The synchronous half of resolveBotcampImageUrl, for paths into Botcamp's
 * public/ folder (course thumbnails): served here under /botcamp-assets/.
 */
export function botcampPublicAssetUrl(url: string | null): string | null {
  if (!url || !url.startsWith("/") || url.startsWith("/api/")) return url
  return `/botcamp-assets${url}`
}

/**
 * A member's avatar as this site can show it: OAuth photos (Google, GitHub,
 * LinkedIn) as they are, Botcamp public/ paths under /botcamp-assets/, and
 * null for avatars Botcamp serves from its own API (uploads), which this site
 * can't, so the UI falls back to the initials monogram.
 */
export function servableAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith("/api/")) return null
  return botcampPublicAssetUrl(url)
}
