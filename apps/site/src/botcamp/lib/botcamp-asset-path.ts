/**
 * Botcamp's database stores paths into Botcamp's public/ folder ("/logos/x.png",
 * "/images/logos/x.png"); those files are copied here under public/botcamp-assets/.
 * Client-safe (no database), so components can map a stored path themselves.
 * Idempotent, and leaves /api/ routes, absolute and data: URLs alone.
 */
export function botcampPublicAssetUrl(url: string | null): string | null {
  if (!url || !url.startsWith("/") || url.startsWith("/api/") || url.startsWith("/botcamp-assets/")) return url
  return `/botcamp-assets${url}`
}
