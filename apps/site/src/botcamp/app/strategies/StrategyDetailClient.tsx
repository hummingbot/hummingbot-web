'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Lock, FileCode2, BookOpen, ExternalLink, Calendar, Eye, BadgeCheck } from 'lucide-react'
import { Button } from '@/botcamp/components/ui/button'
import { ReadOnlyHint } from '@/botcamp/components/ui/read-only'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/botcamp/components/ui/tabs'
import { getCohortBadgeClasses, capitalizeExchange } from '@/botcamp/lib/utils'
import { CollapsibleDescription } from '@/botcamp/components/strategies/CollapsibleDescription'
import { StrategyBreadcrumb } from '@/botcamp/components/strategies/StrategyBreadcrumb'
import { BuilderAvatar } from '@/botcamp/components/hackathons/BuilderAvatar'
import { parseVideoUrl, VIDEO_IFRAME_SANDBOX } from '@/botcamp/lib/video-embed'
import type { StrategyDetail, StrategyDetailAuthor, StrategyType, StrategyVisibility } from '@/botcamp/lib/strategy-detail'

// Botcamp's StrategyDetailClient (origin/main), signed out. Botcamp fetches
// /api/strategies/<slug> in the browser with the session; here the page reads
// the same payload on the server (getPublicStrategy) and passes it in, so the
// loading skeleton and "not found" states are the page's business.
//
// Signed out, Botcamp never shows code or resources (hasContentAccess is
// false) and never the Discussion tab (members only), so the Code tab is
// always its locked message, and there is no Resources or Discussion tab
// and no file list to count. Its "Sign in" button is disabled here (no
// accounts on this site yet). Where Botcamp shows "Sign in to Clone to
// Condor", the page passes the site's own Clone dialog (`cloneButton`).
// Not in Botcamp: the "Validated" block in the sidebar (version, package,
// SHA-256 from Condor's catalogue), which the Hub page showed before.

const STRATEGY_TYPE_LABELS: Record<StrategyType, string> = {
  AGENT: 'Agent',
  SCRIPT: 'Script',
  CONTROLLER: 'Controller',
  V1_STRATEGY: 'V1 Strategy',
  OTHER: 'Other',
}

const VISIBILITY_LABELS: Record<StrategyVisibility, string> = {
  PUBLIC: 'Public',
  MEMBERS_ONLY: 'Members only',
  PRIVATE: 'Private',
}

function authorDisplayName(a: StrategyDetailAuthor): string {
  const composed = `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim()
  return composed || a.slug || 'anonymous'
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const day = 24 * 60 * 60 * 1000
  const days = Math.round(diffMs / day)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.round(days / 7)}w ago`
  if (days < 365) return `${Math.round(days / 30)}mo ago`
  return `${Math.round(days / 365)}y ago`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso))
}

const LOCKED_COPY: Record<StrategyDetail['lockedReason'], { title: string; body: string }> = {
  racing: {
    title: 'Racing — Code & Resources hidden',
    body: 'This strategy is entered in a hackathon. Its code and resources stay hidden until the race is over.',
  },
  private: {
    title: 'Private — Code & Resources hidden',
    body: 'The author has kept the source files private. Only the author and admins can view them.',
  },
  signin: {
    title: 'Sign in to view Code & Resources',
    body: 'Source files and resources are available to signed-in Botcamp users.',
  },
}

const tabTriggerClasses =
  'data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none px-3 sm:px-4 py-2.5 font-medium text-sm text-muted-foreground -mb-px'

export default function StrategyDetailClient({
  strategy,
  cloneButton,
  cloneCardButton,
  header,
  footer,
}: {
  strategy: StrategyDetail
  /** The site's Clone to Condor dialog; shown where Botcamp would. */
  cloneButton?: ReactNode
  /** The full-size Clone button for the sidebar card (desktop). */
  cloneCardButton?: ReactNode
  // The site's own header and footer (server components), in Botcamp's slots.
  header?: ReactNode
  footer?: ReactNode
}) {
  const lockedReason = strategy.lockedReason
  const embedUrl = strategy.videoURL ? parseVideoUrl(strategy.videoURL)?.embedUrl ?? null : null
  const typeLabel = STRATEGY_TYPE_LABELS[strategy.strategyType] ?? 'Other'
  const primaryAuthor = strategy.authors?.[0]
  const breadcrumbAuthor = primaryAuthor?.slug
    ? {
        slug: primaryAuthor.slug,
        name: `${primaryAuthor.firstName ?? ''} ${primaryAuthor.lastName ?? ''}`.trim() || primaryAuthor.slug,
      }
    : null
  const showClone = strategy.condorVersion !== null && lockedReason !== 'private' && lockedReason !== 'racing'

  const lockedBlock = (
    <div className="border border-dashed rounded-bc-lg p-10 text-center">
      <Lock className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-semibold mb-2">{LOCKED_COPY[lockedReason].title}</h3>
      <p className="text-muted-foreground mb-4 max-w-md mx-auto">{LOCKED_COPY[lockedReason].body}</p>
      {lockedReason === 'signin' && (
        <ReadOnlyHint>
          <Button disabled>Sign in</Button>
        </ReadOnlyHint>
      )}
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen text-foreground">
      {/* Botcamp also renders a fixed -z-10 gradient layer here
          (pageBackgrounds.strategies); left out as on /hub. */}
      {header}
      <main className="flex-1 relative">
        <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 relative z-10 max-w-6xl">
          <StrategyBreadcrumb author={breadcrumbAuthor} strategySlug={strategy.slug} className="mb-5" />

          {/* Two columns from the top: title, summary and tabs on the left; the
              sidebar (Clone card first) starts level with the title. */}
          <div className="grid lg:grid-cols-[1fr_320px] gap-8 lg:gap-10">
            <div className="min-w-0">
              {/* Hero — title + type chip + summary */}
              <div className="mb-8 md:mb-10">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-bc-tight mb-4">{strategy.title}</h1>
                <div className="flex flex-wrap items-center gap-2 mb-5">
                  <span className="inline-flex items-center font-mono text-[11px] font-bold uppercase tracking-[0.16em] px-2.5 py-1 rounded-bc-md bg-secondary/15 text-secondary border border-secondary/30">
                    {typeLabel}
                  </span>
                  {strategy.cohort !== null && (
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-bc-md text-xs font-medium ${getCohortBadgeClasses(strategy.cohort)}`}
                    >
                      {strategy.cohort === 0 ? 'Example' : `Cohort ${strategy.cohort}`}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-bc-md border border-border bg-card/60 text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    {VISIBILITY_LABELS[strategy.visibility]}
                  </span>
                </div>
                {strategy.summary && (
                  <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl">{strategy.summary}</p>
                )}
              </div>

              <Tabs defaultValue="readme" className="w-full">
                <TabsList className="bg-transparent border-b border-border w-full flex-wrap justify-start rounded-none h-auto p-0">
                  <TabsTrigger value="readme" className={tabTriggerClasses}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Description
                  </TabsTrigger>
                  <TabsTrigger value="code" className={tabTriggerClasses}>
                    <FileCode2 className="h-4 w-4 mr-2" />
                    Code
                  </TabsTrigger>
                  {/* On desktop the Clone button lives in the sidebar card; here only on small screens. */}
                  {showClone && cloneButton && <div className="ml-auto self-center py-1.5 lg:hidden">{cloneButton}</div>}
                </TabsList>

                {/* README tab — video + description, always visible */}
                <TabsContent value="readme" className="mt-6 focus-visible:outline-none">
                  {embedUrl && (
                    <div className="aspect-video w-full rounded-bc-xl overflow-hidden bg-black mb-6 border border-border">
                      <iframe
                        src={embedUrl}
                        className="w-full h-full"
                        title={strategy.title}
                        sandbox={VIDEO_IFRAME_SANDBOX}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                  <CollapsibleDescription summary={null /* summary already in hero */} details={strategy.details} />
                  {!strategy.details && !embedUrl && !strategy.summary && (
                    <p className="text-sm text-muted-foreground italic">No description available for this strategy.</p>
                  )}
                </TabsContent>

                {/* Code tab — always locked signed out */}
                <TabsContent value="code" className="mt-6 focus-visible:outline-none">
                  {lockedBlock}
                </TabsContent>
              </Tabs>
            </div>

            {/* Right sidebar */}
            <aside className="space-y-bc-6 lg:sticky lg:top-24 lg:self-start">
              {/* Not in Botcamp: the Hub's Clone card (validated package + Clone
                  + what Condor pulls), first in the sidebar so it stays in reach. */}
              {showClone && strategy.condorVersion !== null && strategy.condorPackage && (
                <div className="hidden rounded-bc-xl border border-border bg-card p-5 lg:block">
                  <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Validated
                  </span>
                  <p className="mb-4 text-sm text-muted-foreground">
                    An AI review and a maintainer checked this exact version before it was listed.
                  </p>
                  {cloneCardButton}
                  <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4">
                    {[
                      { label: 'Version', value: `v${strategy.condorVersion}` },
                      { label: 'Published', value: formatDate(strategy.condorPackage.publishedAt) },
                      { label: 'Package', value: formatBytes(strategy.condorPackage.size) },
                      { label: 'Access', value: strategy.free ? 'Free' : 'Members' },
                    ].map((f) => (
                      <div key={f.label}>
                        <dt className="text-xs text-muted-foreground">{f.label}</dt>
                        <dd className="font-mono text-sm font-semibold tabular-nums text-foreground">{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground">Slug</p>
                    <code className="block break-all font-mono text-xs text-foreground">{strategy.slug}</code>
                    <p className="mt-3 text-xs text-muted-foreground">SHA-256</p>
                    <code className="block break-all font-mono text-[10px] text-muted-foreground">
                      {strategy.condorPackage.sha256}
                    </code>
                  </div>
                </div>
              )}

              {strategy.authors.length > 0 && (
                <SidebarBlock label="Authors">
                  <div className="space-y-bc-2.5">
                    {strategy.authors.map((a) => {
                      const name = authorDisplayName(a)
                      const Inner = (
                        <span className="flex items-center gap-2.5">
                          {/* Botcamp: a bare <img> over the gradient initial; here
                              BuilderAvatar, which also falls back when the photo fails. */}
                          <BuilderAvatar name={name} avatarUrl={a.avatarUrl} className="w-7 h-7 text-[10px]" />
                          <span className="text-sm font-medium text-foreground truncate">{name}</span>
                        </span>
                      )
                      return a.slug ? (
                        <Link key={a.id} href={`/builders/${a.slug}`} className="block hover:opacity-80 transition-opacity">
                          {Inner}
                        </Link>
                      ) : (
                        <div key={a.id}>{Inner}</div>
                      )
                    })}
                  </div>
                </SidebarBlock>
              )}

              <SidebarBlock label="Last updated">
                <div className="flex items-center gap-1.5 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatRelativeDate(strategy.updatedAt)}
                </div>
              </SidebarBlock>

              <SidebarBlock label="Visibility">
                <span className="text-sm">{VISIBILITY_LABELS[strategy.visibility]}</span>
              </SidebarBlock>

              <SidebarBlock label="Type">
                <span className="text-sm">{typeLabel}</span>
              </SidebarBlock>

              {strategy.cohort !== null && (
                <SidebarBlock label="Cohort">
                  <span className="text-sm">{strategy.cohort === 0 ? 'Example' : `Cohort ${strategy.cohort}`}</span>
                </SidebarBlock>
              )}

              {strategy.exchanges.length > 0 && (
                <SidebarBlock label="Exchanges">
                  <div className="flex flex-wrap gap-1.5">
                    {strategy.exchanges.map((e) => (
                      <span
                        key={e}
                        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary border border-primary/20"
                      >
                        {capitalizeExchange(e)}
                      </span>
                    ))}
                  </div>
                </SidebarBlock>
              )}

              {strategy.tags.length > 0 && (
                <SidebarBlock label="Tags">
                  <div className="flex flex-wrap gap-1.5">
                    {strategy.tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </SidebarBlock>
              )}

              {strategy.videoURL && (
                <SidebarBlock label="Video">
                  <a
                    href={strategy.videoURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    Watch video
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </SidebarBlock>
              )}

            </aside>
          </div>
        </div>
      </main>
      {footer}
    </div>
  )
}

function SidebarBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">{label}</p>
      {children}
    </div>
  )
}
