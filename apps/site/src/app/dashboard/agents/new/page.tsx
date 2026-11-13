import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@/botcamp/lib/preview-session"
import { strategyCapRefusal } from "@/botcamp/lib/strategy-create"
import { agentHoldingReviewSlot, reviewSlotMessage } from "@/botcamp/lib/agent-upload"
import { Button } from "@/botcamp/components/ui/button"
import { PageHeader } from "@/botcamp/components/ui/page-header"
import { NewAgentWizard } from "@/botcamp/components/agents/NewAgentWizard"
import { getStrategyOptions } from "@/botcamp/lib/dashboard-preview-data"

export const metadata = {
  title: "Create Condor Agent - Botcamp",
}

// Anyone signed in may share an agent; it stays off /strategies until a
// version passes review.
export default async function NewAgentPage() {
  const session = await auth()
  if (!session?.user?.id) {
    notFound()
  }

  // One agent in review at a time, held until it's approved
  // (agentHoldingReviewSlot), then the same caps as creating any strategy (an
  // unfinished draft, the per-user total) — told up front rather than after
  // all three steps.
  const isAdmin = session.user.role === "ADMIN"
  const holder = isAdmin ? null : await agentHoldingReviewSlot(session.user.id)
  const refusal = holder
    ? { error: reviewSlotMessage(holder) }
    : await strategyCapRefusal(session.user.id, session.user.role ?? "STUDENT")

  return (
    <div className="mx-auto max-w-3xl space-y-bc-6">
      <PageHeader
        title="Create Condor Agent"
        description="Check your agent package, fill in its page, and submit it for review."
        variant="admin"
      />
      {refusal ? (
        <div className="space-y-bc-4 rounded-bc-lg border border-border p-6">
          <p className="text-sm">{refusal.error}.</p>
          <Button variant="outline" asChild>
            <Link href="/dashboard/strategies">Go to My Strategies</Link>
          </Button>
        </div>
      ) : (
        <NewAgentWizard strategyOptions={await getStrategyOptions()} />
      )}
    </div>
  )
}
