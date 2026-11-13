'use client'

import React, { type ReactNode } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Github,
  Linkedin,
  Globe,
  Lock,
  Video,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/botcamp/components/ui/button'
import { StrategyCard } from '@/botcamp/components/strategies/StrategyCard'
import { BuilderAvatar } from '@/botcamp/components/hackathons/BuilderAvatar'
import { cn, getCohortBadgeClasses } from '@/botcamp/lib/utils'
import { parseVideoUrl, youtubeVideoId, VIDEO_IFRAME_SANDBOX } from '@/botcamp/lib/video-embed'
import { YouTubeFacade } from '@/components/ui/youtube-facade'
import type { BuilderProfile } from '@/botcamp/lib/builders'

// Botcamp's BuilderProfileClient. Botcamp fetches the member in the browser
// (with a loading skeleton); here the page reads it on the server and passes
// it in, so the skeleton is gone. The avatar falls back to the initials
// monogram when it can't be served (BuilderAvatar).
type Member = BuilderProfile

export default function BuilderProfileClient({
  member,
  header,
  footer,
}: {
  member: Member | null
  // The site's own header and footer (server components), in Botcamp's slots.
  header?: ReactNode
  footer?: ReactNode
}) {
  if (!member) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        {header}
        <main className="flex-1">
          <div className="container mx-auto px-4 py-16 text-center">
            <h1 className="text-2xl font-bold mb-3">Builder not found</h1>
            <p className="text-muted-foreground mb-6">
              This member doesn&apos;t exist or hasn&apos;t joined Botcamp yet.
            </p>
            <Link href="/builders">
              <Button>Back to Builders</Button>
            </Link>
          </div>
        </main>
        {footer}
      </div>
    )
  }

  const isPrivate = member.isPrivate === true
  const storyEmbedUrl = member.storyURL ? parseVideoUrl(member.storyURL)?.embedUrl ?? null : null
  const storyYoutubeId = storyEmbedUrl ? youtubeVideoId(storyEmbedUrl) : null
  const certifiedCount = member.strategies.length
  const cohortCount = member.cohorts.length
  const hasStory = !!member.storyURL

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {header}
      <main className="flex-1">
        {/* Hero header */}
        <ProfileHero
          member={member}
          isPrivate={isPrivate}
          certifiedCount={certifiedCount}
          cohortCount={cohortCount}
        />

        <div className="container mx-auto px-4 py-10">
          <div className="mb-6">
            <Link href="/builders">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground -ml-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Builders
              </Button>
            </Link>
          </div>

          {/* Two-column body */}
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 lg:gap-12">
            {/* Sidebar */}
            <aside className="space-y-bc-6">
              <DetailsBlock label="Details">
                <DetailRow label="Strategies" value={certifiedCount} />
                <DetailRow label="Cohorts" value={cohortCount} />
                {hasStory && (
                  <DetailRow
                    label="Story"
                    value={
                      <span className="inline-flex items-center gap-1 text-primary">
                        <Video className="h-3.5 w-3.5" />
                        Yes
                      </span>
                    }
                  />
                )}
                {!isPrivate && member.github && (
                  <DetailLinkRow
                    label="GitHub"
                    icon={Github}
                    href={resolveGithubUrl(member.github)}
                    text={`@${resolveGithubHandle(member.github)}`}
                  />
                )}
                {!isPrivate && member.linkedin && (
                  <DetailLinkRow
                    label="LinkedIn"
                    icon={Linkedin}
                    href={member.linkedin}
                    text="View"
                  />
                )}
                {!isPrivate && member.websiteURL && (
                  <DetailLinkRow
                    label="Website"
                    icon={Globe}
                    href={member.websiteURL}
                    text="Open"
                  />
                )}
              </DetailsBlock>

              {member.cohorts.length > 0 && (
                <DetailsBlock label="Cohorts">
                  <div className="flex flex-wrap gap-1.5">
                    {member.cohorts.map((c) => (
                      <Link key={c} href={`/cohorts/cohort${c}`}>
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium hover:opacity-80 transition-opacity',
                            getCohortBadgeClasses(c),
                          )}
                        >
                          {c === 0 ? 'Subscription' : `Cohort ${c}`}
                        </span>
                      </Link>
                    ))}
                  </div>
                </DetailsBlock>
              )}

              {!isPrivate && member.about && (
                <DetailsBlock label="About">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {member.about}
                  </p>
                </DetailsBlock>
              )}
            </aside>

            {/* Main column */}
            <div className="min-w-0 space-y-bc-8">
              {/* Builder Story */}
              {!isPrivate && storyEmbedUrl && (
                <section>
                  <SectionHeader title="Story" />
                  <div className="aspect-video w-full rounded-bc-xl overflow-hidden bg-black border border-border">
                    {storyYoutubeId ? (
                      <YouTubeFacade videoId={storyYoutubeId} title={`${member.name}'s Story`} sandbox={VIDEO_IFRAME_SANDBOX} className="h-full" />
                    ) : (
                      <iframe
                        src={storyEmbedUrl}
                        sandbox={VIDEO_IFRAME_SANDBOX}
                        className="w-full h-full"
                        title={`${member.name}'s Story`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    )}
                  </div>
                </section>
              )}

              {/* Strategies — uses the canonical StrategyCard from /strategies */}
              <section>
                <SectionHeader title="Strategies" count={certifiedCount} />
                {member.strategies.length === 0 ? (
                  <NoStrategiesState member={member} />
                ) : (
                  <div className="space-y-bc-3">
                    {member.strategies.map((s, index) => (
                      <StrategyCard
                        key={s.id}
                        strategy={{
                          id: s.id,
                          slug: s.slug,
                          title: s.title,
                          summary: s.summary,
                          tags: s.tags,
                          exchanges: s.exchanges,
                          cohort: s.cohort,
                          hasFiles: s.hasFiles,
                          videoURL: s.videoURL,
                          strategyType: s.strategyType,
                          authors: [
                            {
                              slug: member.slug,
                              name: member.name,
                              avatarURL: member.avatarURL ?? null,
                              profilePublic: !isPrivate,
                            },
                          ],
                        }}
                        animationDelay={index * 30}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </main>
      {footer}
    </div>
  )
}

/* ---------- subcomponents ---------- */

function ProfileHero({
  member,
  isPrivate,
  certifiedCount,
  cohortCount,
}: {
  member: Member
  isPrivate: boolean
  certifiedCount: number
  cohortCount: number
}) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-primary/5 to-background">
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,0,0,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.4) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      <div className="container relative mx-auto px-4 py-12 md:py-16">
        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <BuilderAvatar
              name={member.name}
              avatarUrl={member.avatarURL ?? null}
              className="w-24 h-24 md:w-32 md:h-32 border-4 border-background shadow-lg text-4xl md:text-5xl"
            />
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground font-mono text-sm">
              @{member.slug}
              {isPrivate && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted/60 border border-border ml-1">
                  <Lock className="h-3 w-3" />
                  Private
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-bc-tight mb-2">
              {member.name}
            </h1>
            {!isPrivate && member.tagline && (
              <p className="text-base text-muted-foreground max-w-2xl">
                {member.tagline}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-6 md:gap-10 md:ml-auto">
            <StatTile value={certifiedCount} label={certifiedCount === 1 ? 'strategy' : 'strategies'} />
            <StatTile value={cohortCount} label={cohortCount === 1 ? 'cohort' : 'cohorts'} />
            {certifiedCount > 0 && (
              <StatTile
                value={
                  <CheckCircle2 className="h-7 w-7 md:h-8 md:w-8 text-green-500 dark:text-green-400" />
                }
                label="certified"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function StatTile({
  value,
  label,
}: {
  value: React.ReactNode
  label: string
}) {
  return (
    <div className="flex flex-col items-start">
      <div className="text-2xl md:text-3xl font-bold tabular-nums leading-none">
        {value}
      </div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1.5">
        {label}
      </div>
    </div>
  )
}

function DetailsBlock({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-bc-3">
      <h2 className="text-base font-bold tracking-bc-tight">{label}</h2>
      <div className="space-y-bc-2.5">{children}</div>
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}

function DetailLinkRow({
  label,
  icon: Icon,
  href,
  text,
}: {
  label: string
  icon: typeof Github
  href: string
  text: string
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-foreground hover:text-primary transition-colors truncate max-w-[140px]"
      >
        {text}
      </a>
    </div>
  )
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-baseline gap-3 mb-4">
      <h2 className="text-2xl font-bold tracking-bc-tight">{title}</h2>
      {count != null && count > 0 && (
        <span className="font-mono text-sm text-muted-foreground tabular-nums">
          {count}
        </span>
      )}
    </div>
  )
}

function NoStrategiesState({ member }: { member: Member }) {
  if (member.isMember) {
    return (
      <div className="rounded-bc-xl border bg-card/50 p-6">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {member.name} completed{' '}
          {member.cohorts.map((cohort, i) => (
            <React.Fragment key={cohort}>
              <Link href={`/cohorts/cohort${cohort}`} className="inline">
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mx-0.5 hover:opacity-80 transition-opacity',
                    getCohortBadgeClasses(cohort),
                  )}
                >
                  {cohort === 0 ? 'Subscription' : `Cohort ${cohort}`}
                </span>
              </Link>
              {i < member.cohorts.length - 1 && ' and '}
            </React.Fragment>
          ))}
          {member.cohorts.length > 0 ? ' and' : ''} as a Botcamp member has a
          lifetime option to submit a strategy for certification.
        </p>
      </div>
    )
  }
  return (
    <div className="rounded-bc-xl border bg-card/50 p-6">
      <p className="text-sm text-muted-foreground">
        {member.name} is building their trading journey.
      </p>
    </div>
  )
}

function resolveGithubUrl(input: string): string {
  if (input.startsWith('http://') || input.startsWith('https://')) return input
  return `https://github.com/${input}`
}

function resolveGithubHandle(input: string): string {
  if (input.startsWith('http://') || input.startsWith('https://')) {
    const parts = input.split('/').filter(Boolean)
    return parts[parts.length - 1] ?? input
  }
  return input
}
