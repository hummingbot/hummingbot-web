'use client'

import { Fragment, useMemo, useCallback, useState, useEffect, useRef, type ReactNode } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { MarketDepthBackground } from "@/components/ui/market-depth-background"
import { Input } from '@/botcamp/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/botcamp/components/ui/select"
import { LibraryCard } from '@/botcamp/components/strategies/LibraryCard'
import { HowItWorksDialog } from '@/botcamp/components/agents/HowItWorksDialog'
import { GlowBorder } from '@/botcamp/components/ui/glow-border'
import { CondorReadyCarousel, type CondorReadyAgent } from '@/botcamp/components/strategies/CondorReadyCarousel'
import type { StrategyShowcase } from '@/botcamp/lib/strategy-showcase'
import { UnlockStrategiesButton } from '@/botcamp/components/strategies/UnlockStrategiesButton'
import { NoResults } from '@/botcamp/components/ui/empty-state'
import { Button } from '@/botcamp/components/ui/button'
import { Search, Users, Lock, Trophy, ArrowRight, ArrowUpDown, BadgeCheck, SlidersHorizontal, ChevronDown, Bot } from 'lucide-react'
import { capitalizeExchange, cn } from '@/botcamp/lib/utils'
import { spacing } from '@/botcamp/lib/design-constants'

interface Student {
  id: string
  slug: string
  name: string
  avatarURL: string | null
  profilePublic?: boolean
}

type StrategyType = 'AGENT' | 'SCRIPT' | 'CONTROLLER' | 'V1_STRATEGY' | 'OTHER'

interface Strategy {
  id: number
  slug: string
  title: string
  tags: string[]
  exchanges: string[]
  summary: string | null
  /** null when the strategy has no cohort. */
  cohort: number | null
  /** null when the strategy has no submitted hackathon application. */
  hackathon: { slug: string; title: string } | null
  /** Strategy.status — the "Certified" view filters on CERTIFIED. */
  status: string
  students: Student[]
  hasFiles: boolean
  fileCount: number
  videoURL: string | null
  visibility: 'PUBLIC' | 'MEMBERS_ONLY' | 'PRIVATE'
  strategyType: StrategyType
  featured: boolean
  /** An Agent Condor can import (an APPROVED version, page not private). */
  condorReady: boolean
  createdAt: string
  updatedAt: string
  /** An "Example" (Cohort 0) strategy — code/resources are free to view
   *  regardless of membership or unlock status. */
  isFreePreview: boolean
  /** Final standing in a hackathon an admin pinned to this page, or null.
   *  Showcased strategies lead the Featured sort in rank order. */
  showcase: StrategyShowcase | null
}

interface Cohort {
  number: number
  status: string
  startDate: string
  endDate: string
  description: string
  registrationUrl?: string
}

interface Hackathon {
  slug: string
  title: string
  status: string
  /** ISO string, or null if the hackathon has no registration deadline. */
  registrationEnd: string | null
}

interface StrategiesClientProps {
  initialStrategies: Strategy[]
  /** Agents Condor can clone, in carousel order (race results first). */
  condorReady: CondorReadyAgent[]
  initialCohorts: Cohort[]
  /** null when no hackathon is in REGISTRATION or ACTIVE — CTA hides. */
  initialHackathon: Hackathon | null
  /** Cohort member, admin/instructor, or active 1-year unlock purchase. */
  hasStrategyAccess: boolean
  // The site's own header and footer (server components), in Botcamp's slots.
  header?: ReactNode
  footer?: ReactNode
}

type SortKey = 'featured' | 'recent' | 'name'

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'featured', label: 'Featured' },
  { value: 'recent', label: 'Recently updated' },
  { value: 'name', label: 'Name' },
]

// The one status cut on the library: Condor Ready agents (the default, so the
// page leads with what can be cloned) or everything (?status=all).
type StatusKey = 'all' | 'condor'

const TYPE_LABELS: Record<StrategyType, string> = {
  AGENT: 'Agents',
  SCRIPT: 'Scripts',
  CONTROLLER: 'Controllers',
  V1_STRATEGY: 'V1 Strategies',
  OTHER: 'Other',
}

// Cards drawn per page of the library grid: eight rows of three.
const LIBRARY_PAGE_SIZE = 24

const TYPE_ORDER: StrategyType[] = ['AGENT', 'CONTROLLER', 'SCRIPT', 'V1_STRATEGY', 'OTHER']

export default function StrategiesClient({
  initialStrategies,
  condorReady,
  initialCohorts,
  initialHackathon,
  hasStrategyAccess,
  header,
  footer,
}: StrategiesClientProps) {
  void initialCohorts
  const searchParams = useSearchParams()

  // URL-driven state
  const query = searchParams.get('q') ?? ''
  const sort = (searchParams.get('sort') as SortKey | null) ?? 'featured'
  // Condor Ready unless the URL asks for everything; older links
  // (?status=certified, …) read as the default. Until a first agent is
  // Condor Ready the default is everything, so the library never opens empty.
  const hasCondorReady = initialStrategies.some((s) => s.condorReady)
  const status: StatusKey =
    searchParams.get('status') === 'all' || !hasCondorReady ? 'all' : 'condor'
  const typeFilter = searchParams.get('type') as StrategyType | null
  const tagFilter = searchParams.get('tag')
  const hackathonFilter = searchParams.get('hackathon')
  const selectedExchange = searchParams.get('exchange')

  const updateParams = useCallback(
    (next: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(next)) {
        if (v === null || v === '') params.delete(k)
        else params.set(k, v)
      }
      const qs = params.toString()
      // The browser's own history, not router.replace: every filter runs on
      // the strategies already here, and a router navigation would re-render
      // this force-dynamic page on the server (a second or more) per click.
      // Next keeps useSearchParams in step with replaceState.
      window.history.replaceState(null, '', qs ? `/hub?${qs}` : '/hub')
    },
    [searchParams],
  )

  // The search field is driven by local state, not the URL: filtering runs
  // off `searchInput` for instant results, and only the URL write is
  // debounced, which keeps `?q=` shareable without rewriting it per keystroke.
  const [searchInput, setSearchInput] = useState(query)
  // The tag and hackathon chips stay folded away until the Filters button
  // opens them, unless a link arrives with one already picked.
  const activeChipCount = (tagFilter !== null ? 1 : 0) + (hackathonFilter !== null ? 1 : 0)
  const [chipsOpen, setChipsOpen] = useState(activeChipCount > 0)
  const syncedQuery = useRef(query)

  useEffect(() => {
    if (searchInput === syncedQuery.current) return
    const timer = setTimeout(() => {
      syncedQuery.current = searchInput
      updateParams({ q: searchInput || null })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, updateParams])

  // URL changed from outside the field (back/forward, Clear) — adopt it.
  useEffect(() => {
    if (query === syncedQuery.current) return
    syncedQuery.current = query
    setSearchInput(query)
  }, [query])

  const setSort = (v: SortKey) =>
    updateParams({ sort: v === 'featured' ? null : v })
  // Condor Ready is agents only: switching to it drops any other type, and
  // picking another type from Condor Ready switches to All.
  const setStatus = (v: StatusKey) =>
    updateParams({
      status: v === 'condor' || !hasCondorReady ? null : v,
      type: v === 'condor' && typeFilter !== 'AGENT' ? null : typeFilter,
    })
  const setType = (v: StrategyType | null) =>
    updateParams(status === 'condor' && v !== null && v !== 'AGENT' ? { type: v, status: 'all' } : { type: v })
  const setExchange = (e: string | null) => updateParams({ exchange: e })
  const setTag = (t: string | null) => updateParams({ tag: t })
  const setHackathonFilter = (h: string | null) => updateParams({ hackathon: h })
  const clearAll = () => {
    // Reset the field synchronously so a pending debounce can't re-push `q`.
    syncedQuery.current = ''
    setSearchInput('')
    window.history.replaceState(null, '', '/hub')
  }

  // Available filters from data
  const availableExchanges = useMemo(() => {
    const set = new Set<string>()
    initialStrategies.forEach((s) => s.exchanges?.forEach((e) => set.add(e)))
    return Array.from(set).sort()
  }, [initialStrategies])

  // Registration deadline for the CTA. Pinned to en-US/UTC so the server and
  // client render the same string (the date is stored as UTC midnight, which
  // would otherwise slip a day in western timezones).
  const registrationDeadline = useMemo(() => {
    if (!initialHackathon?.registrationEnd) return null
    return new Date(initialHackathon.registrationEnd).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
  }, [initialHackathon])

  // Tags in alphabetical order. Derived from the full set, not the filtered
  // one, so the row doesn't reshuffle as you click.
  const availableTags = useMemo(() => {
    const set = new Set<string>()
    initialStrategies.forEach((s) => s.tags?.forEach((t) => set.add(t)))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [initialStrategies])

  // One chip per showcased hackathon (the admin toggle), filtering to the
  // agents that raced in it — not every application. Sorted by title.
  const availableHackathons = useMemo(() => {
    const map = new Map<string, string>()
    initialStrategies.forEach((s) => {
      if (s.showcase) map.set(s.showcase.hackathon.slug, s.showcase.hackathon.title)
    })
    return Array.from(map, ([slug, title]) => ({ slug, title })).sort((a, b) =>
      a.title.localeCompare(b.title),
    )
  }, [initialStrategies])

  const availableTypes = useMemo(() => {
    const set = new Set(initialStrategies.map((s) => s.strategyType))
    return TYPE_ORDER.filter((t) => set.has(t))
  }, [initialStrategies])

  const condorReadyCount = useMemo(
    () => initialStrategies.filter((s) => s.condorReady).length,
    [initialStrategies],
  )

  // Apply filters
  const filteredStrategies = useMemo(() => {
    const q = searchInput.trim().toLowerCase()
    let out = initialStrategies

    if (q) {
      out = out.filter((s) => {
        const inTitle = s.title.toLowerCase().includes(q)
        const inSummary = (s.summary ?? '').toLowerCase().includes(q)
        const inAuthor = s.students.some((st) =>
          st.name.toLowerCase().includes(q),
        )
        return inTitle || inSummary || inAuthor
      })
    }
    if (status === 'condor') out = out.filter((s) => s.condorReady)
    if (typeFilter) out = out.filter((s) => s.strategyType === typeFilter)
    if (tagFilter) out = out.filter((s) => s.tags?.includes(tagFilter))
    if (hackathonFilter) {
      out = out.filter((s) => s.showcase?.hackathon.slug === hackathonFilter)
    }
    if (selectedExchange) {
      out = out.filter((s) => s.exchanges?.includes(selectedExchange))
    }

    // Sort. Non-cohort strategies (cohort === null) sort to the bottom of the
    // featured order so the certified set still leads when "All" is selected.
    const sorted = [...out]
    switch (sort) {
      case 'recent':
        sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        break
      case 'name':
        sorted.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'featured':
      default:
        // Showcased race results lead (1st place first), then hand-picked
        // strategies, then newest cohort first.
        sorted.sort((a, b) => {
          if (a.showcase || b.showcase) {
            if (!a.showcase) return 1
            if (!b.showcase) return -1
            if (a.showcase.rank !== b.showcase.rank) return a.showcase.rank - b.showcase.rank
          }
          if (a.featured !== b.featured) return a.featured ? -1 : 1
          return (b.cohort ?? -1) - (a.cohort ?? -1)
        })
        break
    }

    return sorted
  }, [initialStrategies, searchInput, status, typeFilter, tagFilter, hackathonFilter, selectedExchange, sort])

  // The grid draws a page of cards at a time (each cover is an SVG chart),
  // and Show more adds the next. A new filter or search starts over at one
  // page — reset while rendering, so the old count never paints.
  const [shown, setShown] = useState({ list: filteredStrategies, count: LIBRARY_PAGE_SIZE })
  if (shown.list !== filteredStrategies) {
    setShown({ list: filteredStrategies, count: LIBRARY_PAGE_SIZE })
  }
  const visibleStrategies = filteredStrategies.slice(0, shown.count)
  const remaining = filteredStrategies.length - visibleStrategies.length

  const hasActiveFilters =
    !!searchInput ||
    sort !== 'featured' ||
    (hasCondorReady && status !== 'condor') ||
    typeFilter !== null ||
    tagFilter !== null ||
    hackathonFilter !== null ||
    selectedExchange !== null

  const hero = (
    <>
      <h1 className="text-3xl font-bold leading-[1.05] tracking-[-0.03em] md:text-5xl md:leading-(--text-5xl--line-height)">
        Strategy Library
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base md:leading-(--text-base--line-height)">
        Strategies built by our global community. Import them into your Condor harness and publish
        your own.
      </p>
    </>
  )

  return (
    <div className="flex flex-col min-h-screen text-foreground">
      {/* Botcamp also renders a fixed -z-10 gradient layer here
          (pageBackgrounds.strategies). On botcamp.xyz it ends up behind the
          page background and never shows; here it would, so it's left out. */}
      {header}
      <main className="flex-1 relative animate-in fade-in duration-300">
        {/* Hero: the page's title, then the Condor Ready carousel. */}
        <section id="condor-ready" className="relative">
          {/* Not in Botcamp: the site's faint market depth chart behind the title. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-40 overflow-hidden md:h-48">
            <MarketDepthBackground seed={29} opacity={0.35} />
            <div className="absolute inset-0 z-10 bg-gradient-to-b from-background/40 via-background/70 to-background" />
          </div>
          <div className="container relative z-10 mx-auto max-w-7xl px-4 pb-8 pt-6 md:px-6 md:pb-10 md:pt-8">
            <div className="mx-auto max-w-3xl text-center">{hero}</div>
            {condorReady.length > 0 && (
              <div className="mt-2">
                <CondorReadyCarousel agents={condorReady} />
              </div>
            )}
          </div>
        </section>

        {/* The way in for authors; how cloning and publishing work is a dialog. */}
        <section>
          <div className="container mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
            <GlowBorder className="flex flex-col gap-6 bg-gradient-to-br from-condor-gold/10 to-transparent p-6 md:flex-row md:items-center md:justify-between md:p-8">
              <div className="flex items-start gap-4">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-bc-md bg-condor-gold/15 text-condor-gold-deep dark:text-condor-gold">
                  <Bot className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold tracking-[-0.02em] md:text-2xl">Publish Your Agent Strategy</h2>
                  <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    Built an agent in Condor? Upload its folder, it&apos;s reviewed, and once approved it shows up
                    here for anyone to clone.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <Button asChild className="bg-condor-gold font-semibold text-condor-ink hover:bg-condor-gold/90">
                  <Link href="/dashboard/agents/new">
                    Publish Your Strategy
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <HowItWorksDialog />
              </div>
            </GlowBorder>
          </div>
        </section>

        <div
          id="library"
          className={`container mx-auto px-4 md:px-6 ${spacing.page} relative z-10 max-w-7xl scroll-mt-20`}
        >
          {/* Unlock explainer card */}
          {!hasStrategyAccess && (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4 rounded-bc-xl border border-primary/30 bg-primary/5 p-5">
              <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 border border-primary/20 shrink-0">
                  <Lock className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Unlock the Strategy Library</p>
                  <p className="text-sm text-muted-foreground">
                    Get the full source code and resources behind every certified strategy.
                  </p>
                </div>
              </div>
              <UnlockStrategiesButton shine className="shrink-0" />
            </div>
          )}

          {/* Condor Ready or everything. */}
          {hasCondorReady && (
              <div role="group" aria-label="Show" className="inline-flex w-fit rounded-bc-md border border-border bg-card/70 p-1">
                <StatusOption
                  active={status === 'condor'}
                  onClick={() => setStatus('condor')}
                  label="Condor Ready"
                  count={condorReadyCount}
                  condor
                />
                <StatusOption
                  active={status === 'all'}
                  onClick={() => setStatus('all')}
                  label="All"
                  count={initialStrategies.length}
                />
              </div>
          )}

          {/* The finer filters: exchange, type, sort, then tags and hackathons
              behind Filters, and search — the chips open above the divider. */}
          <div className={cn('border-b border-border pb-4', hasCondorReady && 'mt-4')}>
            <div className="flex w-full flex-wrap items-center gap-2">
              {availableExchanges.length > 0 && (
                <Select value={selectedExchange ?? 'all'} onValueChange={(v) => setExchange(v === 'all' ? null : v)}>
                  <SelectTrigger className="h-9 w-auto min-w-[9rem] text-sm">
                    <SelectValue placeholder="All exchanges" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All exchanges</SelectItem>
                    {availableExchanges.map((e) => (
                      <SelectItem key={e} value={e}>
                        {capitalizeExchange(e)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={typeFilter ?? 'all'} onValueChange={(v) => setType(v === 'all' ? null : (v as StrategyType))}>
                <SelectTrigger aria-label="Type" className="h-9 w-auto min-w-[9rem] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {availableTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="h-9 w-auto min-w-[9rem] text-sm">
                  <ArrowUpDown className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(availableTags.length > 0 || availableHackathons.length > 0) && (
                <button
                  type="button"
                  aria-expanded={chipsOpen}
                  aria-controls="library-chips"
                  onClick={() => setChipsOpen((open) => !open)}
                  className={cn(
                    'inline-flex h-9 items-center gap-2 rounded-bc-md border px-3 text-sm transition-colors',
                    chipsOpen || activeChipCount > 0
                      ? 'border-primary text-foreground'
                      : 'border-input text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filters
                  {activeChipCount > 0 && (
                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] tabular-nums text-primary-foreground">
                      {activeChipCount}
                    </span>
                  )}
                </button>
              )}
              <div className="relative w-full sm:ml-auto sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search strategies, authors…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-9 border-input bg-card/70 pl-9 text-sm transition-colors focus:border-condor-gold/60"
                />
              </div>
            </div>

          {/* Tag + hackathon chips, behind the Filters button — single-select,
              click the active one again to clear. */}
          {chipsOpen && (availableTags.length > 0 || availableHackathons.length > 0) && (
            <div
              id="library-chips"
              className="mt-4 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1 duration-200"
            >
              {availableHackathons.map((h) => {
                const active = hackathonFilter === h.slug
                return (
                  <Chip key={h.slug} active={active} onClick={() => setHackathonFilter(active ? null : h.slug)}>
                    <Trophy className="h-3 w-3" />
                    {h.title}
                  </Chip>
                )
              })}
              {availableTags.map((tag) => {
                const active = tagFilter === tag
                return (
                  <Chip key={tag} active={active} onClick={() => setTag(active ? null : tag)}>
                    <span className="text-muted-foreground/60">#</span>
                    {tag}
                  </Chip>
                )
              })}
            </div>
          )}
          </div>

          <div className="mb-5 mt-6 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{filteredStrategies.length}</span>{' '}
              {filteredStrategies.length === 1 ? 'strategy' : 'strategies'}
              {hasActiveFilters && (
                <>
                  <span className="mx-2 text-muted-foreground/40">·</span>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="underline underline-offset-4 transition-colors hover:text-foreground"
                  >
                    Clear filters
                  </button>
                </>
              )}
            </p>
            <Link
              href="/builders"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Users className="h-4 w-4" />
              Meet the Builders
            </Link>
          </div>

          {filteredStrategies.length === 0 ? (
            <NoResults searchTerm={searchInput} onClear={clearAll} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleStrategies.map((strategy, index) => (
                <Fragment key={strategy.id}>
                  {/* The current hackathon gets a tile of its own, after the
                      first row, when the library isn't filtered. */}
                  {index === 5 && initialHackathon && !hasActiveFilters && (
                    <HackathonTile hackathon={initialHackathon} deadline={registrationDeadline} />
                  )}
                  <LibraryCard
                    strategy={{
                      ...strategy,
                      authors: strategy.students.map((s) => ({ name: s.name, avatarURL: s.avatarURL })),
                    }}
                    // Same gate as the detail page: hackathon entries unlock
                    // like any strategy, or on sign-in once an admin marks
                    // them Free to View (they're then in the free-preview set).
                    locked={!hasStrategyAccess && !strategy.isFreePreview}
                    // Each new page staggers in from its own first card.
                    animationDelay={Math.min(index % LIBRARY_PAGE_SIZE, 11) * 30}
                  />
                </Fragment>
              ))}
            </div>
          )}

          {remaining > 0 && (
            <div className="mt-8 flex flex-col items-center gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShown((current) => ({ ...current, count: current.count + LIBRARY_PAGE_SIZE }))}
              >
                Show more
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {visibleStrategies.length} of {filteredStrategies.length}
              </p>
            </div>
          )}
        </div>
      </main>
      {footer}
    </div>
  )
}

function StatusOption({
  active,
  onClick,
  label,
  count,
  condor = false,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  /** Condor Ready: with its badge. */
  condor?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded px-5 py-2.5 text-base font-semibold transition-colors',
        active
          ? 'bg-condor-gold/15 text-condor-gold-deep dark:text-condor-gold'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {condor && <BadgeCheck className="h-4 w-4" />}
      {label}
      <span className="font-mono text-xs tabular-nums opacity-60">{count}</span>
    </button>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-bc-md border px-2.5 py-1 font-mono text-[11px] transition-colors',
        active
          ? 'border-primary bg-primary/10 text-foreground'
          : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function HackathonTile({ hackathon, deadline }: { hackathon: Hackathon; deadline: string | null }) {
  const registering = hackathon.status === 'REGISTRATION'
  return (
    <Link
      href={`/hackathons/${hackathon.slug}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-bc-xl border border-dashed border-condor-gold/40 bg-condor-gold/[0.04] p-6 transition-colors hover:border-condor-gold/70 hover:bg-condor-gold/[0.08]"
    >
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-condor-gold-deep dark:text-condor-gold">
          {registering ? 'Registration Open' : 'Hackathon Live'}
        </p>
        <h3 className="mt-3 text-xl font-semibold tracking-[-0.02em]">{hackathon.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {registering
            ? <>Build a trading agent and race it against other Botcamp builders{deadline && <>. Entries close {deadline}</>}.</>
            : 'See what other Botcamp builders are racing right now.'}
        </p>
      </div>
      <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-condor-gold-deep dark:text-condor-gold">
        {registering ? 'Enter the Hackathon' : 'View the Hackathon'}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}
