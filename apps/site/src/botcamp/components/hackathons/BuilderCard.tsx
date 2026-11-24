import Link from "next/link"
import { ArrowRight, MapPin } from "lucide-react"
import { BuilderAvatar } from "./BuilderAvatar"
import { Eyebrow } from "./AgentSectionTitle"

interface BuilderCardProps {
  name: string
  avatarUrl: string | null
  tagline: string | null
  location: string | null
  // The builder's public profile; null when they keep it private.
  href: string | null
  // The accent on hover (hex), e.g. the team color.
  color: string
}

/** The person behind an agent, as a large card linking to their profile. */
export function BuilderCard({ name, avatarUrl, tagline, location, href, color }: BuilderCardProps) {
  const body = (
    <>
      <Eyebrow>Builder</Eyebrow>
      <div className="flex items-center gap-4 mb-5">
        <BuilderAvatar name={name} avatarUrl={avatarUrl} className="h-16 w-16 text-2xl" />
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-bc-tight truncate">{name}</h2>
          {tagline && <p className="text-muted-foreground line-clamp-2">{tagline}</p>}
          {location && (
            <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {location}
            </p>
          )}
        </div>
      </div>
      {href && (
        <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-primary">
          View profile
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      )}
    </>
  )
  const card = "group flex flex-col rounded-bc-xl border border-border bg-card/80 backdrop-blur-xs p-6 md:p-7"
  return href ? (
    <Link
      href={href}
      className={`${card} transition-colors hover:border-[color:var(--team)]`}
      style={{ ["--team" as string]: color }}
    >
      {body}
    </Link>
  ) : (
    <div className={card}>{body}</div>
  )
}
