import Link from "next/link"
import { AlertCircle, Bot, Clock, Plus } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { Button } from "@/botcamp/components/ui/button"
import { HowItWorksDialog } from "@/botcamp/components/agents/HowItWorksDialog"
import { cn } from "@/botcamp/lib/utils"

interface CondorAgentCardProps {
  /**
   * The agent holding this person's one review slot (agentHoldingReviewSlot),
   * if any: then the card follows that review instead of inviting another.
   */
  holder: { strategyId: number; title: string; status: string } | null
}

/**
 * The dashboard's lead card: publishing a Condor agent on Botcamp — upload
 * its folder, get it reviewed, and anyone can clone it from Condor's Hub.
 * While an agent is in review, or rejected and not yet fixed, it points to
 * that agent instead, since no other can be sent until it's approved.
 */
export function CondorAgentCard({ holder }: CondorAgentCardProps): React.JSX.Element {
  const rejected = holder?.status === "REJECTED"
  const Icon = !holder ? Bot : rejected ? AlertCircle : Clock

  const title = !holder
    ? "Publish a Condor Agent"
    : rejected
      ? `${holder.title} wasn't approved`
      : `${holder.title} is in review`
  const description = !holder
    ? "Upload your agent's folder. It's checked right away, then reviewed, and once approved anyone can clone it from Condor's Hub."
    : rejected
      ? "See what to fix, then upload a new version. You can publish another agent once this one is approved."
      : "You'll get an email as it moves through review. You can publish another agent once this one is approved."

  return (
    <Card
      className={cn(
        "bg-gradient-to-br to-transparent",
        rejected ? "from-destructive/10 border-destructive/30" : "from-condor-gold/15 border-condor-gold/30",
      )}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-bc-md",
              rejected ? "bg-destructive/15 text-destructive" : "bg-condor-gold/15 text-condor-gold-deep dark:text-condor-gold",
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        {holder ? (
          <Button asChild>
            <Link href={`/dashboard/strategies/${holder.strategyId}`}>
              {rejected ? "See What to Fix" : "Follow the Review"}
            </Link>
          </Button>
        ) : (
          <>
            <Button asChild>
              <Link href="/dashboard/agents/new">
                <Plus className="mr-2 h-4 w-4" />
                Publish Your Agent
              </Link>
            </Button>
            {/* The same dialog as /strategies; the starter agent is in it. */}
            <HowItWorksDialog />
          </>
        )}
      </CardContent>
    </Card>
  )
}
