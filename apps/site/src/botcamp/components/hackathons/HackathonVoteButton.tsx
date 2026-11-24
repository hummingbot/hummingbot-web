import { ArrowUpRight } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import { cn } from "@/botcamp/lib/utils"
import { VOTING_START } from "@/botcamp/lib/hackathon-stages"
import type { HackathonVote } from "@/botcamp/lib/hackathon-leaderboard-data"

// Fixed UTC so every viewer reads the same close time.
const voteDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
})

const CAPTION = "font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.14em]"

/**
 * The HBOT vote under the leaderboard heading: a button out to the Snapshot
 * proposal, with where the vote stands beneath it.
 */
export function HackathonVoteButton({
  vote,
  align = "center",
  showStatus = true,
}: {
  vote: HackathonVote
  align?: "center" | "start"
  // The tally line under the button.
  showStatus?: boolean
}) {
  if (vote.status === "none") {
    return (
      <p className={cn(CAPTION, "text-muted-foreground")}>
        HBOT Vote opens on Snapshot {voteDate.format(VOTING_START)} UTC
      </p>
    )
  }

  if (vote.status === "unavailable") {
    return (
      <div className={cn("flex flex-col gap-2", align === "center" ? "items-center" : "items-start")}>
        <Button asChild variant="outline">
          <a href={vote.url} target="_blank" rel="noopener noreferrer">
            HBOT Vote on Snapshot
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </Button>
        <p className={cn(CAPTION, "text-red-600 dark:text-red-400")}>
          Vote unavailable — vote points aren&apos;t current
        </p>
      </div>
    )
  }

  const votes = `${vote.votes.toLocaleString("en-US")} ${vote.votes === 1 ? "vote" : "votes"}`
  const status =
    vote.state === "pending"
      ? `opens ${voteDate.format(new Date(vote.start))} UTC`
      : vote.state === "active"
        ? `closes ${voteDate.format(new Date(vote.end))} UTC · live tally`
        : "closed · vote points are final"

  return (
    <div className={cn("flex flex-col gap-2", align === "center" ? "items-center" : "items-start")}>
      <Button asChild variant={vote.state === "closed" ? "outline" : "default"}>
        <a href={vote.url} target="_blank" rel="noopener noreferrer">
          {vote.state === "closed" ? "See the vote on Snapshot" : "Vote on Snapshot"}
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </Button>
      {showStatus && (
        <p className={cn(CAPTION, "text-muted-foreground")}>
          HBOT Vote · {votes} · {status}
        </p>
      )}
    </div>
  )
}
