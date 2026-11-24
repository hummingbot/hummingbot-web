import { botcampPublicAssetUrl } from "@/botcamp/lib/botcamp-asset-path"

/**
 * Picks the right team/sponsor logo variant for the current site theme —
 * mirrors the pattern already used for the Botcamp brand mark in
 * Header/Footer. Only meaningful on surfaces whose background actually
 * flips with the theme (`bg-card`, `bg-muted`, etc); components with a
 * permanently dark background (the F1-style team color cards) should
 * always prefer the dark-background variant instead, regardless of theme.
 */
export function pickTeamLogo(
  theme: "light" | "dark",
  logoUrl: string | null | undefined,
  logoUrlDark: string | null | undefined,
): string | null {
  // Stored paths into Botcamp's public/ folder are served here under /botcamp-assets/.
  if (theme === "dark") return botcampPublicAssetUrl(logoUrlDark || logoUrl || null)
  return botcampPublicAssetUrl(logoUrl || null)
}
