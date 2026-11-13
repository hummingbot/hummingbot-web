'use client'

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/botcamp/components/ui/input'
import { PageHeader } from '@/botcamp/components/ui/page-header'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/botcamp/components/ui/select'
import { NoResults } from '@/botcamp/components/ui/empty-state'
import { Search, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/botcamp/lib/utils'
import { BuilderAvatar } from '@/botcamp/components/hackathons/BuilderAvatar'
import { pageBackgrounds, spacing } from '@/botcamp/lib/design-constants'
import type { DirectoryBuilder } from '@/botcamp/lib/builders'

// Builders come from getDirectoryBuilders (src/botcamp/lib/builders.ts).
type Builder = DirectoryBuilder

interface BuildersDirectoryClientProps {
  initialBuilders: Builder[]
  // The site's own header and footer (server components), in Botcamp's slots.
  header?: ReactNode
  footer?: ReactNode
}

type SortKey = 'story' | 'recent' | 'strategies' | 'name'

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'story', label: 'Has story' },
  { value: 'recent', label: 'Most recent' },
  { value: 'strategies', label: 'Most strategies' },
  { value: 'name', label: 'Name' },
]

type StatusKey = 'all' | 'certified'

const STATUS_OPTIONS: Array<{ value: StatusKey; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'certified', label: 'Certified' },
]


const cohortLabel = (n: number) => (n === 0 ? 'Subscription' : `Cohort ${n}`)

export default function BuildersDirectoryClient({
  initialBuilders,
  header,
  footer,
}: BuildersDirectoryClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // URL-driven state
  const query = searchParams.get('q') ?? ''
  // Default sort floats builders with a recorded story video to the top —
  // they're the strongest social proof for the directory.
  const sort = (searchParams.get('sort') as SortKey | null) ?? 'story'
  // Single-select status filter. Default "all" — every builder appears.
  // "certified" narrows to users with at least one cohort-backed strategy.
  const status = (searchParams.get('status') as StatusKey | null) ?? 'all'
  const cohortParam = searchParams.get('cohort')
  // 'none' is a sentinel for users with no cohort enrollments. null means the
  // All cohorts default. Number for an explicit cohort selection.
  const selectedCohort: number | 'none' | null =
    cohortParam === null
      ? null
      : cohortParam === 'none'
        ? 'none'
        : Number(cohortParam)

  const updateParams = useCallback(
    (next: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(next)) {
        if (v === null || v === '') params.delete(k)
        else params.set(k, v)
      }
      const qs = params.toString()
      router.replace(qs ? `/builders?${qs}` : '/builders', { scroll: false })
    },
    [router, searchParams],
  )

  const setQuery = (v: string) => updateParams({ q: v || null })
  const setSort = (v: SortKey) =>
    updateParams({ sort: v === 'story' ? null : v })
  const setStatus = (v: StatusKey) =>
    updateParams({ status: v === 'all' ? null : v })
  const setCohort = (v: number | 'none' | null) =>
    updateParams({
      cohort: v === null ? null : v === 'none' ? 'none' : String(v),
    })
  const clearAll = () => router.replace('/builders', { scroll: false })

  const availableCohorts = useMemo(
    () =>
      Array.from(new Set(initialBuilders.flatMap((m) => m.cohorts))).sort(
        (a, b) => b - a,
      ),
    [initialBuilders],
  )

  // The cohort badges that render in each row's right-side area used to fall
  // back to the seeded Example cohort (0). Now the data carries null for
  // non-cohort strategies, so the row skips those instead of mis-rendering
  // them as Example.

  const filteredBuilders = useMemo(() => {
    const q = query.trim().toLowerCase()
    let out = initialBuilders

    if (q) {
      out = out.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.slug.toLowerCase().includes(q) ||
          m.tagline?.toLowerCase().includes(q),
      )
    }
    if (status === 'certified') {
      out = out.filter((m) =>
        m.strategies.some((s) => s.cohort !== null),
      )
    }
    if (selectedCohort === 'none') {
      out = out.filter((m) => m.cohorts.length === 0)
    } else if (selectedCohort !== null) {
      out = out.filter((m) => m.cohorts.includes(selectedCohort))
    }

    const sorted = [...out]
    switch (sort) {
      case 'recent':
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        break
      case 'strategies':
        sorted.sort((a, b) => b.strategies.length - a.strategies.length)
        break
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'story':
      default:
        // Builders with a recorded story first, then break ties by most
        // recent so the freshest stories surface near the top.
        sorted.sort((a, b) => {
          const aHas = a.storyURL ? 1 : 0
          const bHas = b.storyURL ? 1 : 0
          if (aHas !== bHas) return bHas - aHas
          return b.createdAt.localeCompare(a.createdAt)
        })
        break
    }
    return sorted
  }, [initialBuilders, query, status, selectedCohort, sort])

  const hasActiveFilters =
    !!query || sort !== 'story' || status !== 'all' || selectedCohort !== null

  // Count non-default sidebar filters so the mobile "Filters" toggle can
  // show a badge with the active count.
  const activeSidebarFilterCount =
    (sort !== 'story' ? 1 : 0) +
    (status !== 'all' ? 1 : 0) +
    (selectedCohort !== null ? 1 : 0)

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  return (
    <div className="flex flex-col min-h-screen text-foreground">
      <div className={`fixed inset-0 ${pageBackgrounds.strategies} -z-10`} />
      {header}
      <main className="flex-1 relative animate-in fade-in duration-300">
        <div
          className={`container mx-auto px-4 md:px-6 ${spacing.page} relative z-10 max-w-7xl`}
        >
          <PageHeader
            title="Builders Directory"
            description="Everyone who's authored a trading strategy."
          />

          {/* Search bar */}
          <div className="relative mb-8 mt-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              aria-label="Search builders"
              placeholder="Search builders by name, handle, or tagline…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-11 h-12 bg-card/70 border-border hover:border-border/80 focus:border-primary transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 lg:gap-12">
            {/* Left sidebar — collapsible on mobile, always visible on lg+ */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen((o) => !o)}
                aria-expanded={mobileFiltersOpen}
                className="lg:hidden w-full flex items-center justify-between gap-2 rounded-bc-lg border border-border bg-card/70 px-4 py-3 mb-4 text-sm font-medium hover:border-primary/40 transition-colors"
              >
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {activeSidebarFilterCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-primary/15 text-primary text-[11px] font-semibold tabular-nums">
                      {activeSidebarFilterCount}
                    </span>
                  )}
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    mobileFiltersOpen && 'rotate-180',
                  )}
                />
              </button>
              <div
                className={cn(
                  'space-y-bc-8',
                  !mobileFiltersOpen && 'hidden lg:block',
                )}
              >
              {/* SORT BY */}
              <FilterSection label="Sort by">
                <div className="lg:hidden">
                  <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                    <SelectTrigger className="w-full" aria-label="Sort by">
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
                </div>
                <ul className="hidden lg:block space-y-bc-1.5">
                  {SORT_OPTIONS.map((opt) => (
                    <FilterRow
                      key={opt.value}
                      active={sort === opt.value}
                      onClick={() => setSort(opt.value)}
                      label={opt.label}
                    />
                  ))}
                </ul>
              </FilterSection>

              {/* STATUS */}
              <FilterSection label="Status">
                <div className="lg:hidden">
                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v as StatusKey)}
                  >
                    <SelectTrigger className="w-full" aria-label="Status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <ul className="hidden lg:block space-y-bc-1.5">
                  {STATUS_OPTIONS.map((opt) => (
                    <FilterRow
                      key={opt.value}
                      active={status === opt.value}
                      onClick={() => setStatus(opt.value)}
                      label={opt.label}
                    />
                  ))}
                </ul>
              </FilterSection>

              {/* COHORT */}
              {availableCohorts.length > 0 && (
                <FilterSection label="Cohort">
                  <Select
                    value={
                      selectedCohort === null
                        ? 'all'
                        : selectedCohort === 'none'
                          ? 'none'
                          : String(selectedCohort)
                    }
                    onValueChange={(v) =>
                      setCohort(
                        v === 'all' ? null : v === 'none' ? 'none' : Number(v),
                      )
                    }
                  >
                    <SelectTrigger className="w-full" aria-label="Cohort">
                      <SelectValue placeholder="All cohorts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All cohorts</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                      {availableCohorts.map((c) => (
                        <SelectItem key={c} value={String(c)}>
                          {cohortLabel(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterSection>
              )}

              {/* CTA — Cohort 14 register-interest */}
              <div className="hidden lg:block">
                <div className="rounded-bc-lg border border-border bg-card/60 p-4">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-2">
                    Become a Builder
                  </p>
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                    Cohort 14 schedules once 20+ participants register interest. Early bird pricing starts at $2,000+.
                  </p>
                  <div className="flex flex-col gap-2">
                    {/* Botcamp mails operations from here; this site has no
                        contact flow, so it points at the Cohort 14 section of
                        /botcamp, where interest is registered. */}
                    <Link
                      href="/botcamp#cohorts"
                      className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1"
                    >
                      Register interest in Cohort 14
                      <span>→</span>
                    </Link>
                    <Link
                      href="/botcamp#cohorts"
                      className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    >
                      Learn more
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              </div>
              </div>
            </aside>

            {/* Main column */}
            <div className="min-w-0">
              {/* Result count + Clear */}
              <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-border">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {filteredBuilders.length}
                  </span>{' '}
                  {filteredBuilders.length === 1 ? 'result' : 'results'}
                  {hasActiveFilters && (
                    <>
                      <span className="mx-2 text-muted-foreground/40">·</span>
                      <button
                        type="button"
                        onClick={clearAll}
                        className="underline underline-offset-4 hover:text-foreground transition-colors"
                      >
                        Clear
                      </button>
                    </>
                  )}
                </p>
              </div>

              {filteredBuilders.length === 0 ? (
                <NoResults searchTerm={query} onClear={clearAll} />
              ) : (
                <div className="space-y-bc-3">
                  {filteredBuilders.map((builder, index) => (
                    <BuilderRow key={builder.id} builder={builder} index={index} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      {footer}
    </div>
  )
}

/* ---------- subcomponents ---------- */

function FilterSection({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-3">
        {label}
      </p>
      {children}
    </div>
  )
}

function FilterRow({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'w-full text-left text-sm transition-colors',
          active
            ? 'text-primary font-medium'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {label}
      </button>
    </li>
  )
}

function BuilderRow({ builder, index }: { builder: Builder; index: number }) {
  const subtitleParts: string[] = []
  if (builder.tagline?.trim()) subtitleParts.push(builder.tagline.trim())
  else if (builder.cohorts.length > 0) {
    const top = builder.cohorts.slice(0, 2).map(cohortLabel).join(' · ')
    const more =
      builder.cohorts.length > 2 ? ` · +${builder.cohorts.length - 2}` : ''
    subtitleParts.push(`${top}${more}`)
  } else {
    subtitleParts.push('Botcamp builder')
  }

  return (
    <Link
      href={`/builders/${builder.slug}`}
      className="flex items-center gap-4 rounded-bc-xl border bg-card px-5 py-4 hover:border-primary/40 hover:bg-card/80 transition-colors animate-in fade-in"
      // Stagger only the first rows: a delay that grows with the index left
      // rows far down the list faded (unreadable) for seconds.
      style={{ animationDelay: `${Math.min(index, 12) * 20}ms`, animationFillMode: 'backwards' }}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <BuilderAvatar name={builder.name} avatarUrl={builder.avatarURL} className="w-12 h-12 text-lg" />
      </div>

      {/* Name + handle + subtitle */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h2 className="text-base font-semibold truncate">{builder.name}</h2>
          <span className="font-mono text-xs text-muted-foreground truncate">
            @{builder.slug}
          </span>
        </div>
        <p className="text-sm text-muted-foreground truncate mt-0.5">
          {subtitleParts.join(' · ')}
        </p>
      </div>

      {/* Right side: just the strategy count. */}
      <div className="flex-shrink-0 flex items-center">
        {builder.strategies.length > 0 && (
          <div className="text-sm text-foreground/80 whitespace-nowrap tabular-nums">
            <span className="font-semibold">{builder.strategies.length}</span>{' '}
            <span className="text-muted-foreground">
              {builder.strategies.length === 1 ? 'strategy' : 'strategies'}
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}
