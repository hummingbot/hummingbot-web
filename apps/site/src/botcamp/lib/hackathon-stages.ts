import type { HackathonStatus } from "@prisma/client"
import { type LucideIcon, Cpu, Users, Scale, Flag } from "lucide-react"

/**
 * Admin-selected stages, in the order a hackathon moves through them. The
 * stage — not the calendar — decides what the public pages show: whether
 * sign-ups are open, and whether the hero counts down or shows the live race.
 */
export const HACKATHON_STAGES: Array<{
  value: HackathonStatus
  label: string
  desc: string
}> = [
  { value: "DRAFT", label: "Draft", desc: "Hidden from the site while you set it up." },
  {
    value: "COMING_SOON",
    label: "Coming Soon",
    desc: "Public page is live. Sign-ups and applications stay closed.",
  },
  {
    value: "REGISTRATION",
    label: "Open",
    desc: "Builders can register, apply to teams, and submit — until Registration End, if set.",
  },
  {
    value: "COUNTDOWN",
    label: "Countdown",
    desc: "Sign-ups, submissions, and team selections closed — rosters are final. Counts down to Race Start, then goes Live automatically.",
  },
  {
    value: "ACTIVE",
    label: "Live",
    desc: "The race is running. Counts down to Race End, then moves to Judging automatically.",
  },
  { value: "JUDGING", label: "Judging", desc: "Race over, results being finalized." },
  { value: "COMPLETED", label: "Completed", desc: "Winners announced." },
]

export const STAGE_LABELS = Object.fromEntries(
  HACKATHON_STAGES.map((s) => [s.value, s.label]),
) as Record<HackathonStatus, string>

export function isHackathonStatus(value: unknown): value is HackathonStatus {
  return HACKATHON_STAGES.some((s) => s.value === value)
}

/**
 * Whether sponsor teams can select or deselect agents — only in the Open
 * stage (including after registrationEnd, until the admin moves on). From
 * Countdown on, rosters are final.
 */
export function isSelectionOpen(hackathon: { status: string }): boolean {
  return hackathon.status === "REGISTRATION"
}

/** Builder-facing reason team selection is closed, for UI and API errors. */
export function selectionClosedReason(status: string): string {
  return status === "DRAFT" || status === "COMING_SOON"
    ? "Team selections open once registration opens."
    : "Team selections are closed — rosters are final."
}

/**
 * Stages where a hackathon is the "current" one — shown in listings, the
 * dashboard, the home page and the sidebar. Judging stays current so builders
 * can follow results; Completed drops out once winners are announced.
 */
export const CURRENT_HACKATHON_STATUSES: HackathonStatus[] = [
  "COMING_SOON",
  "REGISTRATION",
  "COUNTDOWN",
  "ACTIVE",
  "JUDGING",
]

/** Stages a newcomer can still sign up for — what promo emails point at. */
export const JOINABLE_HACKATHON_STATUSES: HackathonStatus[] = ["COMING_SOON", "REGISTRATION"]

/**
 * Whether builders can register, apply, and edit applications. The stage
 * gates it; registrationEnd, when set, still closes it automatically so a
 * missed stage switch doesn't leave sign-ups open past the deadline.
 */
export function isRegistrationOpen(
  hackathon: { status: string; registrationEnd: Date | string | null },
  now: Date = new Date(),
): boolean {
  if (hackathon.status !== "REGISTRATION") return false
  return !hackathon.registrationEnd || now <= new Date(hackathon.registrationEnd)
}

/**
 * The four competition stages of the Agent Builders Cup.
 *
 * Stage boundaries come from the Hackathon record plus the milestone constants
 * below, which mirror the dated hackathon_sessions rows:
 *   - registrationStart → Registration opens
 *   - registrationEnd   → Registration closes
 *   - startDate         → Hackathon (build window) begins
 *   - SELECTION_START   → Sponsor teams begin picking their agent drivers
 *   - JUDGING_END       → Judging ends
 *   - CODE_FREEZE       → Code freezes for agents without a finals seat
 *   - finals.codeFreeze → Code freezes for agents holding a finals seat
 *   - finals.start      → Finals begin (the "finals" session's date)
 *   - endDate           → Finals end
 *
 * Submitting and selecting overlap on purpose: sponsors start choosing drivers
 * while the submission window is still open, and a builder whose agent has been
 * picked keeps refining it, past CODE_FREEZE, until the finals code freeze.
 */

/**
 * Matches the "Team Selection Opens" row in hackathon_sessions, and gates the
 * Select Agent action in the team reviewer. Selection opening does NOT close
 * submissions — the two run concurrently from here until CODE_FREEZE.
 */
export const SELECTION_START = new Date("2026-09-01T00:00:00Z")
export const JUDGING_END = new Date("2026-09-30T23:59:59.999Z")
/**
 * The live race runs 48 hours from the finals start. Deliberately not derived
 * from Hackathon.endDate, which is the winners-announced date (WINNERS_ANNOUNCED),
 * not the end of the race.
 */
export const FINALS_DURATION_HOURS = 48
/** Agents holding a finals seat stay editable until this long before the race. */
export const FINALS_CODE_FREEZE_HOURS = 48
export const WINNERS_ANNOUNCED = new Date("2026-10-09T00:00:00Z")

/**
 * The HBOT Snapshot vote opens partway through the race (4pm Singapore) and
 * runs 24 hours, closing after the race ends. The window itself is set on the
 * Snapshot proposal; the page quotes the proposal's own times once one is
 * linked, and these figures only until then.
 */
export const VOTING_START = new Date("2026-10-08T08:00:00Z")
export const VOTING_DURATION_HOURS = 24

/**
 * The published code freeze, as submissions close. It locks every submitted
 * agent that doesn't hold a finals seat (lib/strategy-edit).
 */
export const CODE_FREEZE = new Date("2026-10-01T00:00:00Z")

/**
 * The hackathon_sessions row whose date starts the finals race. Moving that
 * session's date in the admin moves the race, its end, and the finals code
 * freeze with it.
 */
export const FINALS_SESSION_SLUG = "finals"

/**
 * Spread into a hackathon `select` to load what its race window comes from —
 * raceStart/raceEnd and the finals session — then pass the row to
 * getRaceWindow.
 */
export const FINALS_SESSION_SELECT = {
  raceStart: true,
  raceEnd: true,
  sessions: { where: { slug: FINALS_SESSION_SLUG }, select: { slug: true, date: true } },
} as const

/** The race window: when it starts and ends, and when seated agents lock. */
export interface FinalsWindow {
  start: Date
  /** start + FINALS_DURATION_HOURS: standings freeze here. */
  end: Date
  /** start - FINALS_CODE_FREEZE_HOURS: seated agents lock here. */
  codeFreeze: Date
}

export function finalsWindow(start: Date): FinalsWindow {
  return {
    start,
    end: new Date(start.getTime() + FINALS_DURATION_HOURS * 3_600_000),
    codeFreeze: new Date(start.getTime() - FINALS_CODE_FREEZE_HOURS * 3_600_000),
  }
}

interface RaceWindowSource {
  slug?: string
  raceStart: Date | string | null
  raceEnd: Date | string | null
  /** The hackathon's sessions — only the finals session is read. */
  sessions?: Array<{ slug: string | null; date: Date | null }>
}

/**
 * The live race window for a hackathon, or null when nothing sets it yet.
 * Race Start/End set in the admin editor win; otherwise the "finals"
 * session's date starts a FINALS_DURATION_HOURS race. Either way, seated
 * agents lock FINALS_CODE_FREEZE_HOURS before the start.
 */
export function findRaceWindow(hackathon: RaceWindowSource): FinalsWindow | null {
  if (hackathon.raceStart) {
    const start = new Date(hackathon.raceStart)
    const window = finalsWindow(start)
    return hackathon.raceEnd ? { ...window, end: new Date(hackathon.raceEnd) } : window
  }
  const finals = hackathon.sessions?.filter((s) => s.slug === FINALS_SESSION_SLUG) ?? []
  return finals.length === 1 && finals[0].date ? finalsWindow(finals[0].date) : null
}

/**
 * findRaceWindow for a hackathon that must have one — the race pages, from
 * the Countdown on. Throws with what to set when neither source is there.
 */
export function getRaceWindow(hackathon: RaceWindowSource): FinalsWindow {
  const window = findRaceWindow(hackathon)
  if (!window) {
    throw new Error(
      `Hackathon "${hackathon.slug ?? "?"}" has no race window — set Race Start in the admin, or date its "${FINALS_SESSION_SLUG}" session`,
    )
  }
  return window
}

/** HBOT vote score an admin enters per agent: 1 (lowest) to 10 (highest). */
export const HBOT_VOTE_MIN = 1
export const HBOT_VOTE_MAX = 10

export function isValidHbotVote(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= HBOT_VOTE_MIN && value <= HBOT_VOTE_MAX
}

/** Admin-write check for raceStart/raceEnd. Returns an error message or null. */
export function validateRaceWindow(
  raceStart: string | null,
  raceEnd: string | null,
): string | null {
  const start = raceStart ? new Date(raceStart) : null
  const end = raceEnd ? new Date(raceEnd) : null
  if ((start && isNaN(start.getTime())) || (end && isNaN(end.getTime()))) {
    return "Race Start and Race End must be valid dates"
  }
  if (end && !start) return "Set Race Start before Race End"
  if (start && end && end <= start) return "Race End must be after Race Start"
  return null
}

export function raceDurationHours(race: { start: Date; end: Date }): number {
  return Math.max(1, Math.round((race.end.getTime() - race.start.getTime()) / 3_600_000))
}

interface StageDateInputs {
  registrationStart: Date | string | null
  registrationEnd: Date | string | null
  startDate: Date | string
  endDate: Date | string
  raceStart?: Date | string | null
  raceEnd?: Date | string | null
  sessions?: Array<{ slug: string | null; date: Date | null }>
}

export interface StagePhase {
  id: string
  label: string
  icon: LucideIcon
  date: string | null
  desc: string
}

export const fmtShort = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
export const fmtFull = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
const range = (from: Date, to: Date) => `${fmtShort(from)} – ${fmtFull(to)}`

/**
 * When sponsor selection opens. Rows without race dates are the 2026 Cup, whose
 * selection opened on its own milestone; newer editions run it from the
 * registration deadline to the race. With neither, there's no selection date
 * yet, so the timeline stays on the build phase.
 */
function selectionStart(hackathon: StageDateInputs): Date | null {
  if (!hackathon.raceStart) return SELECTION_START
  return hackathon.registrationEnd ? new Date(hackathon.registrationEnd) : null
}

/** Timeline phases rendered by EventSchedule on the hackathon + team pages. */
export function getStagePhases(hackathon: StageDateInputs): StagePhase[] {
  const regStart = hackathon.registrationStart ? new Date(hackathon.registrationStart) : null
  const regEnd = hackathon.registrationEnd ? new Date(hackathon.registrationEnd) : null
  const buildStart = new Date(hackathon.startDate)
  const finalsEnd = new Date(hackathon.endDate)
  const race = findRaceWindow({
    raceStart: hackathon.raceStart ?? null,
    raceEnd: hackathon.raceEnd ?? null,
    sessions: hackathon.sessions,
  })
  return [
    {
      id: "registration",
      label: "Registration",
      icon: Users,
      date: regStart && regEnd ? range(regStart, regEnd) : regEnd ? fmtFull(regEnd) : null,
      desc: "Sign up, follow the sponsor workshops, and apply to the teams you want to race for.",
    },
    {
      id: "hackathon",
      label: "Hackathon",
      icon: Cpu,
      date: race ? range(buildStart, race.start) : fmtShort(buildStart),
      desc: "Build your trading agent, submit it to the teams you want to race for, and keep refining it — until 48 hours before the finals, if it holds a finals seat.",
    },
    {
      id: "judging",
      label: "Selection & Judging",
      icon: Scale,
      // Rows without race dates are the 2026 Cup, whose selection opened on its
      // own milestone; newer editions run it from the deadline to the race.
      date:
        hackathon.raceStart && race && regEnd
          ? range(regEnd, race.start)
          : range(SELECTION_START, JUDGING_END),
      desc: "Sponsors pick their agent drivers and Botcamp validates strategy code — while builders keep improving the agents already chosen.",
    },
    {
      id: "finals",
      label: "Finals",
      icon: Flag,
      date: race ? range(race.start, finalsEnd) : fmtFull(finalsEnd),
      desc: `${race ? raceDurationHours(race) : FINALS_DURATION_HOURS}-hour livestreamed competition. Winners announced ${fmtFull(finalsEnd)}.`,
    },
  ]
}

/** Index of the active stage for EventSchedule's done/current/upcoming states. */
export function getCurrentStageIndex(
  hackathon: StageDateInputs & { status: string },
  now: Date = new Date(),
): number {
  switch (hackathon.status) {
    case "DRAFT":
    case "COMING_SOON":
      return -1 // Nothing has started — every phase is still upcoming
    case "COUNTDOWN":
      return 2 // Selection & Judging
    case "ACTIVE":
    case "JUDGING":
      return 3 // Finals
    case "COMPLETED":
      return 4
  }
  // REGISTRATION spans the build period too, so the calendar picks the phase.
  const buildStart = new Date(hackathon.startDate)
  if (now < buildStart) return 0 // Registration
  // Building and selection overlap; once selection opens, that is the stage
  // worth highlighting even though submissions are still accepted.
  const selection = selectionStart(hackathon)
  if (!selection || now < selection) return 1 // Hackathon
  return 2 // Selection & Judging
}

export interface StageReadinessInputs {
  teamsCount: number
  sessionsCount: number
  registrationStart: Date | string | null
  registrationEnd: Date | string | null
  raceStart: Date | string | null
  raceEnd: Date | string | null
  openSeats: number
  raceAgentsCount: number
  /** An HBOT Snapshot proposal is linked for the vote criterion. */
  voteLinked: boolean
  /** The edition has its own FAQ rather than the default template. */
  faqCustomized: boolean
}

/**
 * What's still missing before moving a hackathon to `target`, shown in the
 * admin stage switcher's confirmation. Warnings, not blockers — the admin
 * decides — but each one is something the public page would get wrong.
 */
export function getStageWarnings(
  target: HackathonStatus,
  h: StageReadinessInputs,
  now: Date = new Date(),
): string[] {
  const warnings: string[] = []
  const raceStart = h.raceStart ? new Date(h.raceStart) : null
  const raceEnd = h.raceEnd ? new Date(h.raceEnd) : null
  switch (target) {
    case "COMING_SOON":
      if (!h.faqCustomized) warnings.push("The FAQ is still the default template — review it for this edition.")
      if (!h.registrationStart) warnings.push("Registration Start isn't set — the hero shows no countdown.")
      if (h.teamsCount === 0) warnings.push("No sponsor teams assigned yet.")
      break
    case "REGISTRATION":
      if (!h.faqCustomized) warnings.push("The FAQ is still the default template — review it for this edition.")
      if (h.teamsCount === 0) warnings.push("No sponsor teams assigned — builders have nothing to apply to.")
      if (!h.registrationEnd) warnings.push("Registration End isn't set — sign-ups stay open until you switch stage.")
      else if (new Date(h.registrationEnd) < now)
        warnings.push("Registration End has already passed — sign-ups will show as closed.")
      if (h.sessionsCount === 0) warnings.push("No sessions on the timeline yet.")
      break
    case "COUNTDOWN":
      if (!raceStart) warnings.push("Race Start isn't set — the countdown uses the Finals session's date, if there is one.")
      else if (raceStart < now) warnings.push("Race Start is in the past — it will switch to Live right away.")
      if (h.openSeats > 0)
        warnings.push(
          `${h.openSeats} seat${h.openSeats === 1 ? " is" : "s are"} still open — teams can't fill ${h.openSeats === 1 ? "it" : "them"} once the Countdown starts.`,
        )
      break
    case "ACTIVE":
      if (!raceStart || !raceEnd)
        warnings.push("Race Start/End aren't set — the live timer uses the Finals session's date, if there is one, and the stage won't advance on its own.")
      else if (raceEnd < now) warnings.push("Race End is in the past — it will move to Judging right away.")
      if (h.raceAgentsCount === 0)
        warnings.push("No race bots registered — every agent shows at zero until the race feed reports.")
      if (!h.voteLinked) warnings.push("No HBOT Snapshot proposal linked — the vote adds 0 to every score.")
      break
    case "COMPLETED":
      if (!h.voteLinked) warnings.push("No HBOT Snapshot proposal linked — final standings won't include the vote.")
      break
  }
  return warnings
}

/**
 * Title + explanation for the register/apply pages when sign-ups aren't open,
 * so a builder learns whether it's too early, too late, or the race is on.
 */
export function registrationClosedCopy(
  hackathon: {
    status: string
    registrationStart: Date | string | null
    registrationEnd: Date | string | null
    raceStart: Date | string | null
    raceEnd: Date | string | null
    sessions?: Array<{ slug: string | null; date: Date | null }>
  },
  kind: "Registration" | "Applications",
): { title: string; description: string } {
  const race = findRaceWindow(hackathon)
  switch (hackathon.status) {
    case "DRAFT":
    case "COMING_SOON":
      return {
        title: `${kind} Not Open Yet`,
        description: hackathon.registrationStart
          ? `Registration opens ${fmtFull(new Date(hackathon.registrationStart))}.`
          : "Registration opens soon — check back shortly.",
      }
    case "REGISTRATION":
      return {
        title: `${kind} Closed`,
        description: hackathon.registrationEnd
          ? `The deadline was ${fmtFull(new Date(hackathon.registrationEnd))}.`
          : `${kind} for this hackathon are closed.`,
      }
    case "COUNTDOWN":
      return {
        title: `${kind} Closed`,
        description: race
          ? `Sign-ups are over. The race starts ${fmtFull(race.start)} — follow it live on the hackathon page.`
          : "Sign-ups are over — follow the race on the hackathon page.",
      }
    case "ACTIVE":
      return {
        title: `${kind} Closed`,
        description: "The race is live — follow the standings on the hackathon page.",
      }
    default:
      return {
        title: "This Hackathon Has Ended",
        description: "See how the race finished on the hackathon page.",
      }
  }
}

/** Label + hint for an unfilled seat on the starting grid, by stage. */
export function openSeatCopy(
  status: string,
  registrationOpen: boolean,
): { label: string; desc: string } {
  if (registrationOpen) return { label: "Open Seat", desc: "Apply with your agentic strategy." }
  switch (status) {
    case "DRAFT":
    case "COMING_SOON":
      return { label: "Open Seat", desc: "Applications open when registration opens." }
    case "REGISTRATION":
      return { label: "Seat Pending", desc: "The team is finalizing its pick." }
    default:
      return { label: "Unfilled", desc: "This seat wasn't filled for the race." }
  }
}
