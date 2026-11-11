import Image, { type StaticImageData } from "next/image"
import Link from "next/link"
import { BOTCAMP_SLUG } from "@/botcamp/lib/hackathon-squads"
import { cn } from "@/botcamp/lib/utils"
import bitgetDark from "@/botcamp/images/logos/sponsors/bitget-dark.png"
import bitgetLight from "@/botcamp/images/logos/sponsors/bitget-light.png"
import deriveDark from "@/botcamp/images/logos/sponsors/derive-dark.png"
import deriveLight from "@/botcamp/images/logos/sponsors/derive-light.png"
import gateDark from "@/botcamp/images/logos/sponsors/gate-dark.png"
import gateLight from "@/botcamp/images/logos/sponsors/gate-light.png"
import meteoraDark from "@/botcamp/images/logos/sponsors/meteora-dark.png"
import meteoraLight from "@/botcamp/images/logos/sponsors/meteora-light.png"
import orcaDark from "@/botcamp/images/logos/sponsors/orca-dark.png"
import orcaLight from "@/botcamp/images/logos/sponsors/orca-light.png"
import xrplDark from "@/botcamp/images/logos/sponsors/xrpl-dark.png"
import xrplLight from "@/botcamp/images/logos/sponsors/xrpl-light.png"

// Horizontal wordmarks by team slug: `dark` is drawn for dark backgrounds
// (light ink), `light` for light ones. Every file is cropped to its artwork
// at the same height, so a fixed slot sizes them evenly.
export const WORDMARKS: Record<string, { dark: StaticImageData; light: StaticImageData }> = {
  bitget: { dark: bitgetDark, light: bitgetLight },
  derive: { dark: deriveDark, light: deriveLight },
  gate: { dark: gateDark, light: gateLight },
  meteora: { dark: meteoraDark, light: meteoraLight },
  orca: { dark: orcaDark, light: orcaLight },
  xrpl: { dark: xrplDark, light: xrplLight },
}

interface SponsorLogosProps {
  teams: Array<{ slug: string; name: string }>
  hackathonSlug: string
  /** "row": all on one line on wide screens, three to a row below that. */
  layout?: "grid" | "row"
}

/**
 * The sponsor teams' wordmarks in rows of three (or one row, wide), in grid order, each linking to
 * its team page. Botcamp hosts rather than sponsors, so it isn't listed.
 */
export function SponsorLogos({ teams, hackathonSlug, layout = "grid" }: SponsorLogosProps) {
  const sponsors = teams.filter((t) => t.slug !== BOTCAMP_SLUG)
  return (
    <ul
      className={cn(
        "grid grid-cols-3 items-center gap-x-6 gap-y-8 sm:gap-x-12 sm:gap-y-10",
        layout === "row" && "lg:grid-cols-6 lg:gap-x-10",
      )}
    >
      {sponsors.map((team) => {
        const wordmark = WORDMARKS[team.slug]
        if (!wordmark) {
          throw new Error(`No sponsor wordmark for team "${team.slug}" — add one to SponsorLogos`)
        }
        return (
          <li key={team.slug}>
            <Link
              href={`/hackathons/${hackathonSlug}/teams/${team.slug}`}
              aria-label={team.name}
              className="flex h-8 items-center justify-center opacity-80 transition-opacity hover:opacity-100 sm:h-10"
            >
              <Image
                src={wordmark.light}
                alt=""
                className="h-auto max-h-6 w-auto max-w-full object-contain sm:max-h-8 sm:max-w-[9rem] dark:hidden"
              />
              <Image
                src={wordmark.dark}
                alt=""
                className="hidden h-auto max-h-6 w-auto max-w-full object-contain sm:max-h-8 sm:max-w-[9rem] dark:block"
              />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
