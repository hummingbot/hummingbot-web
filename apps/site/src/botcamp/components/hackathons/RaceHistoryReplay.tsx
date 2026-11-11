"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Flag } from "lucide-react"
import { fieldVolume, RaceHistoryChart, volumeAt } from "./RaceHistoryChart"
import { ReplayFigure, ReplayPlayer, useReplayClock } from "./ReplayClock"
import { DEFAULT_PRIMARY_COLOR } from "@/botcamp/lib/hackathon-squads"
import { RACE_CHECKPOINT_HOURS, formatPoints, type Checkpoint } from "@/botcamp/lib/hackathon-leaderboard"
import type { LeaderboardAgentRow, ReplayFrame } from "@/botcamp/lib/hackathon-leaderboard-data"

interface ReplayTeam {
  id: string
  primaryColor: string | null
}

interface RaceHistoryReplayProps {
  // The board as it stands: the replay ends exactly here.
  agents: LeaderboardAgentRow[]
  teams: ReplayTeam[]
  // Standings at each checkpoint reached so far, grid first.
  checkpoints: Checkpoint[]
  // Each agent's place every half hour, by agent id (grid first).
  frames: Record<string, ReplayFrame[]>
  raceStart: string
  raceHours: number
  // How far the replay runs: the finish, or now while the race is on.
  endHour: number
  live: boolean
}

const usdWhole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

const legendLine = (dashed: boolean) => (
  <svg width="18" height="4" aria-hidden>
    <line
      x1="0"
      y1="2"
      x2="18"
      y2="2"
      className="stroke-foreground"
      strokeWidth="2"
      strokeDasharray={dashed ? "4 3" : undefined}
    />
  </svg>
)

/**
 * The race played out on the running-order chart: the field swaps places as
 * the clock runs and its volume climbs underneath. Plays once when it comes
 * into view. Once the race is over, reaching the finish flags the winner.
 */
export function RaceHistoryReplay({
  agents,
  teams,
  checkpoints,
  frames,
  raceStart,
  raceHours,
  endHour,
  live,
}: RaceHistoryReplayProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const clock = useReplayClock({ endHour, raceHours, autoplay: boxRef })
  const volume = useMemo(() => fieldVolume(frames), [frames])

  // Team color for identity, seat (grid order within the team) for the
  // solid/dashed split between a team's two agents.
  const chartAgents = useMemo(() => {
    const colorOf = new Map(teams.map((t) => [t.id, t.primaryColor || DEFAULT_PRIMARY_COLOR]))
    const gridPos = checkpoints[0]?.positions ?? {}
    const latest = checkpoints[checkpoints.length - 1]
    return agents
      .filter((a) => latest?.positions[a.agentId] !== undefined)
      .map((a) => ({
        agentId: a.agentId,
        title: a.strategyTitle,
        color: colorOf.get(a.teamId) ?? DEFAULT_PRIMARY_COLOR,
        seat: agents
          .filter((o) => o.teamId === a.teamId)
          .sort((p, q) => (gridPos[p.agentId] ?? 0) - (gridPos[q.agentId] ?? 0))
          .findIndex((o) => o.agentId === a.agentId),
      }))
  }, [agents, teams, checkpoints])

  const winners = agents.filter((a) => a.rank === 1)
  const finished = !live && clock.hour >= endHour

  // Each time the replay runs into the finish, play the finish once. Landing
  // on it otherwise (the page's first render) just shows the winner.
  const [celebrate, setCelebrate] = useState(0)
  const wasRacing = useRef(false)
  useEffect(() => {
    if (!finished) wasRacing.current = true
    else if (wasRacing.current) {
      wasRacing.current = false
      setCelebrate((n) => n + 1)
    }
  }, [finished])

  return (
    <ReplayPlayer
      clock={clock}
      raceStart={raceStart}
      live={live}
      color={DEFAULT_PRIMARY_COLOR}
      boxRef={boxRef}
      aside={
        volume.length > 0 && (
          <ReplayFigure label="Field Volume">{usdWhole.format(volumeAt(volume, clock.hour))}</ReplayFigure>
        )
      }
    >
      <div className="px-2 sm:px-4 pt-4 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 px-2 pb-2">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <span>Running order through the race · hover an agent to follow it</span>
            <span className="inline-flex items-center gap-1.5">
              {legendLine(false)}
              First seat
            </span>
            <span className="inline-flex items-center gap-1.5">
              {legendLine(true)}
              Second seat
            </span>
          </div>
          {finished && winners.length > 0 && (
            <p
              key={celebrate}
              role="status"
              className="race-finish-banner inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-400/15 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300"
            >
              <Flag className="h-3.5 w-3.5" aria-hidden />
              Race Finished · {winners.map((w) => w.strategyTitle).join(" & ")} {winners.length > 1 ? "win" : "wins"} with{" "}
              {formatPoints(winners[0].score)} pts
            </p>
          )}
        </div>
        <RaceHistoryChart
          checkpoints={checkpoints}
          agents={chartAgents}
          plannedHours={RACE_CHECKPOINT_HOURS}
          replay={{ frames, hour: clock.hour, endHour }}
          finish={finished ? { winners: winners.map((w) => w.agentId), celebrate } : undefined}
        />
      </div>
    </ReplayPlayer>
  )
}
