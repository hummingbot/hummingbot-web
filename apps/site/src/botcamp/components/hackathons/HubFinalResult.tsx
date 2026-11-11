import Link from "next/link"
import { ArrowRight, Flag, Sparkles as SparklesIcon, Trophy } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import { TeamLogoBadge } from "@/botcamp/components/hackathons/TeamLogoBadge"
import { ShareRaceButtons } from "@/botcamp/components/hackathons/ShareRaceButtons"

export interface FinalResultStat {
  label: string
  value: string
  sub?: string
}

export interface FinalResultPodiumRow {
  position: number
  title: string
  driver: string | null
  color: string
  href: string
}

export interface HubFinalResultProps {
  /** Place on the final board (1..n). */
  position: number
  fieldSize: number
  editionLabel: string
  headline: string
  team: { name: string; primaryColor: string; logoUrl: string | null; logoUrlDark: string | null }
  prizeAmount: string | null
  prizeNote: string | null
  /** e.g. "0.40 pts ahead of Flyby (#2)". */
  gapLine: string | null
  stats: FinalResultStat[]
  /** Short facts about how the race went: best category, lead, peak, team result. */
  highlights: string[]
  /** Off-podium finishers see the podium for context. */
  podium?: FinalResultPodiumRow[]
  agentHref: string
  winnersHref: string
  strategiesHref: string
  share: { text: string; path: string; label: string }
}

const MEDAL: Record<number, { title: string; color: string; glow: string; gradient: string }> = {
  1: {
    title: "Champion",
    color: "#FBBF24",
    glow: "rgba(251,191,36,0.55)",
    gradient: "linear-gradient(180deg, #FDE68A 10%, #F59E0B 100%)",
  },
  2: {
    title: "Runner-up",
    color: "#E2E8F0",
    glow: "rgba(226,232,240,0.45)",
    gradient: "linear-gradient(180deg, #F8FAFC 10%, #94A3B8 100%)",
  },
  3: {
    title: "Third place",
    color: "#FB923C",
    glow: "rgba(234,88,12,0.5)",
    gradient: "linear-gradient(180deg, #FDBA74 10%, #C2410C 100%)",
  },
}

const SPARKS = [
  { top: "-3%", left: "6%", size: 16, delay: "0s" },
  { top: "18%", left: "-1.5%", size: 11, delay: "0.8s" },
  { top: "-2%", left: "62%", size: 13, delay: "1.4s" },
  { top: "40%", left: "100.5%", size: 10, delay: "0.4s" },
  { top: "97%", left: "30%", size: 12, delay: "1.9s" },
  { top: "95%", left: "88%", size: 14, delay: "1.1s" },
]

function Sparkles({ color }: { color: string }) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 z-10">
      {SPARKS.map((s) => (
        <svg
          key={`${s.top}-${s.left}`}
          viewBox="0 0 24 24"
          className="absolute opacity-0 motion-safe:animate-twinkle"
          style={{ top: s.top, left: s.left, width: s.size, height: s.size, animationDelay: s.delay, color }}
        >
          <path fill="currentColor" d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" />
        </svg>
      ))}
    </span>
  )
}

/**
 * The hub's final-result card for a builder who raced, once results are
 * announced. The podium (P1–P3) gets a medal-colored glow, light sweep,
 * sparks and a giant place numeral; everyone else gets the same personal
 * breakdown in a calmer card, with the podium for context.
 */
export function HubFinalResult(props: HubFinalResultProps) {
  const { position, fieldSize, team, stats, highlights, podium, share } = props
  const medal = MEDAL[position] ?? null

  const body = (
    <div className="relative flex flex-col gap-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        {/* Giant place numeral — medal-colored for the podium. */}
        <p
          aria-hidden
          className="font-monoton text-[clamp(5rem,14vw,9rem)] leading-none text-transparent bg-clip-text"
          style={{
            backgroundImage: medal?.gradient ?? "linear-gradient(180deg, #FFFFFF 10%, #94A3B8 100%)",
            filter: medal ? `drop-shadow(0 0 30px ${medal.glow})` : undefined,
          }}
        >
          #{position}
        </p>
        <div className="min-w-0 space-y-bc-3">
          <p
            className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em]"
            style={{ color: medal?.color }}
          >
            {position === 1 && <Trophy className="h-3.5 w-3.5" />}
            {medal ? medal.title : `Final result · P${position} of ${fieldSize}`} · {props.editionLabel}
          </p>
          <h2 className="text-3xl font-bold tracking-[-0.03em] md:text-4xl">{props.headline}</h2>
          <div className="flex items-center gap-3">
            <TeamLogoBadge
              logoUrl={team.logoUrl}
              logoUrlDark={team.logoUrlDark}
              alt={team.name}
              className="h-9 w-9 shrink-0 rounded-bc-lg"
              imageSize={22}
            />
            <p className="text-base font-semibold">Raced for {team.name}</p>
          </div>
          {props.gapLine && <p className="text-sm text-muted-foreground">{props.gapLine}</p>}
        </div>
      </div>

      {(props.prizeAmount || props.prizeNote) && (
        <div
          className="flex flex-col gap-1 rounded-bc-lg border px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: medal ? `${medal.color}66` : undefined }}
        >
          <div>
            {props.prizeAmount && (
              <p className="font-mono text-2xl font-bold tabular-nums" style={{ color: medal?.color }}>
                {props.prizeAmount}
              </p>
            )}
            {props.prizeNote && (
              <p className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <SparklesIcon className="h-3 w-3" />
                {props.prizeNote}
              </p>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Congratulations — the team will reach out about your prize!</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-bc-lg border border-border bg-background/60 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{stat.label}</p>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums">{stat.value}</p>
            {stat.sub && <p className="font-mono text-[11px] text-muted-foreground">{stat.sub}</p>}
          </div>
        ))}
      </div>

      {highlights.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {highlights.map((h) => (
            <li
              key={h}
              className="rounded-full border px-3 py-1 text-xs font-medium"
              style={
                medal
                  ? { borderColor: `${medal.color}55`, background: `${medal.color}14`, color: medal.color }
                  : undefined
              }
            >
              {h}
            </li>
          ))}
        </ul>
      )}

      {!medal && (
        <div className="rounded-bc-lg border border-primary/30 bg-primary/5 px-5 py-4">
          <p className="font-semibold">Thank you for being part of the {props.editionLabel}!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Building and racing an AI trading agent with real capital is no small thing. We&apos;d love to
            see you at our next hackathons and events — keep building, and stay tuned for the next edition.
          </p>
        </div>
      )}

      {podium && podium.length > 0 && (
        <div className="space-y-bc-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">The podium</p>
          <ol className="grid gap-2 sm:grid-cols-3">
            {podium.map((row) => (
              <li key={row.href}>
                <Link
                  href={row.href}
                  className="flex items-center gap-3 rounded-bc-lg border border-border bg-background/40 px-3 py-2.5 transition-colors hover:bg-primary/5"
                >
                  <span className="font-mono text-sm font-bold" style={{ color: MEDAL[row.position]?.color }}>
                    {row.position}
                  </span>
                  <span className="h-5 w-1 shrink-0 rounded-full" style={{ background: row.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{row.title}</span>
                    {row.driver && <span className="block truncate text-xs text-muted-foreground">{row.driver}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={props.winnersHref}>
              <Flag className="mr-1.5 h-4 w-4" />
              See the winners
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={props.agentHref}>Your agent&apos;s stats</Link>
          </Button>
          {!medal && (
            <Button asChild variant="outline">
              <Link href={props.strategiesHref}>Keep building</Link>
            </Button>
          )}
        </div>
        <ShareRaceButtons text={share.text} path={share.path} label={share.label} align="end" />
      </div>
    </div>
  )

  if (!medal) {
    return (
      <section className="relative overflow-hidden rounded-bc-xl border border-border bg-card p-6 md:p-8">
        <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: team.primaryColor }} />
        {body}
      </section>
    )
  }

  // Podium: glow behind, a light sweep across, sparks around.
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-4 rounded-3xl blur-2xl motion-safe:animate-podium-glow"
        style={{ background: `radial-gradient(closest-side, ${medal.glow}, ${team.primaryColor}33, transparent)` }}
      />
      <Sparkles color={medal.color} />
      <section
        className="relative overflow-hidden rounded-bc-xl border border-border bg-card p-6 md:p-8"
        style={{
          backgroundImage: `radial-gradient(ellipse 60% 80% at 0% 0%, ${team.primaryColor}33, transparent 70%), radial-gradient(ellipse 50% 60% at 100% 100%, ${medal.color}1f, transparent 70%)`,
        }}
      >
        <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <span
            className="absolute inset-y-0 left-0 w-1/4 -translate-x-[150%] motion-safe:animate-podium-sheen"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,.10), transparent)" }}
          />
        </span>
        {body}
      </section>
    </div>
  )
}
