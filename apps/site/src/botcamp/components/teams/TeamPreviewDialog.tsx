"use client"

import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { Dialog, DialogTrigger, DialogContent } from "@/botcamp/components/ui/dialog"
import { MarkdownContent } from "@/botcamp/components/lessons/MarkdownContent"
import { TeamLogoBadge } from "@/botcamp/components/hackathons/TeamLogoBadge"
import { DEFAULT_PRIMARY_COLOR } from "@/botcamp/lib/hackathon-squads"

interface TeamPreviewData {
  name: string
  description: string
  logoUrl: string
  logoUrlDark: string
  primaryColor: string
  rules: string
  resources: string
}

/**
 * Live preview of the team's public hackathon page hero + selection criteria,
 * rendered directly from the in-memory (possibly unsaved) form state — not
 * the last-saved DB values. Mirrors the styling of
 * src/app/hackathons/[slug]/teams/[teamSlug]/page.tsx's hero section.
 */
export function TeamPreviewDialog({
  trigger,
  team,
  liveUrl,
}: {
  trigger: React.ReactNode
  team: TeamPreviewData
  /** Link to the real, saved public page — shown as a secondary action. */
  liveUrl?: string
}) {
  const primary = /^#[0-9a-fA-F]{6}$/.test(team.primaryColor)
    ? team.primaryColor
    : DEFAULT_PRIMARY_COLOR
  const inkMix = `color-mix(in srgb, ${primary} 35%, #000 65%)`

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl gap-0 overflow-y-auto p-0 max-h-[92vh]">
        <p className="px-6 pt-6 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Live preview · unsaved changes shown as-is
        </p>

        <section
          className="relative mt-3 w-full overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${primary} 0%, ${inkMix} 100%)` }}
        >
          <div
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage: "radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1.4px)",
              backgroundSize: "10px 10px",
            }}
          />
          <div className="relative z-10 flex flex-col items-center px-6 py-14 text-center">
            <p className="mb-6 font-mono text-xs font-bold uppercase tracking-[0.22em] text-white/90">
              Sponsor Team
            </p>
            <TeamLogoBadge
              logoUrl={team.logoUrl || null}
              logoUrlDark={team.logoUrlDark || null}
              alt={team.name || "Team logo"}
              className="mb-6 h-20 w-20 rounded-2xl"
              imageSize={60}
              iconClassName="h-8 w-8"
            />
            <h2 className="mb-4 text-3xl font-black uppercase tracking-bc-tight text-white md:text-4xl">
              {team.name || "Your Team"}
            </h2>
            {team.description && (
              <p className="max-w-xl text-sm leading-relaxed text-white/90 md:text-base">
                {team.description}
              </p>
            )}
          </div>
        </section>

        {team.rules && (
          <div className="p-6">
            <h3 className="mb-3 text-lg font-bold">Selection Criteria</h3>
            <div className="rounded-bc-xl border border-border bg-card p-5">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <MarkdownContent content={team.rules} />
              </div>
            </div>
          </div>
        )}

        {team.resources && (
          <div className="p-6 pt-0">
            <h3 className="mb-3 text-lg font-bold">Build Resources</h3>
            <div className="rounded-bc-xl border border-border bg-card p-5">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <MarkdownContent content={team.resources} />
              </div>
            </div>
          </div>
        )}

        {liveUrl && (
          <div className="flex items-center justify-end border-t border-border p-4">
            <Link
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              View live public page
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
