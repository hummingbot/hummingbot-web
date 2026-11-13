import { notFound } from "next/navigation"
import { UserStrategyEditor } from "@/botcamp/components/dashboard/UserStrategyEditor"
import { getDefaultStrategy, StrategyType } from "@/botcamp/components/dashboard/strategy-editor/types"
import { auth } from "@/botcamp/lib/preview-session"
import { getHackathonApplyEligibility, getStrategyOptions } from "@/botcamp/lib/dashboard-preview-data"

// Botcamp's page is a client component reading ?type= with useSearchParams;
// here it reads it on the server, which also loads what the editor fetches on
// mount in Botcamp (the tag/exchange options, the hackathon it could apply to).
export default async function NewStrategyPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) notFound()

  // Get strategy type from query params (default to OTHER)
  const typeParam = (await searchParams).type || "OTHER"
  const validTypes: StrategyType[] = ["AGENT", "SCRIPT", "CONTROLLER", "V1_STRATEGY", "OTHER"]
  const strategyType: StrategyType = validTypes.includes(typeParam as StrategyType)
    ? (typeParam as StrategyType)
    : "OTHER"

  const defaultStrategy = getDefaultStrategy(strategyType)
  const [strategyOptions, hackathonApply] = await Promise.all([
    getStrategyOptions(),
    getHackathonApplyEligibility(session.user.id),
  ])

  return (
    <div className="space-y-bc-6">
      <UserStrategyEditor
        strategy={defaultStrategy}
        strategyOptions={strategyOptions}
        hackathonApply={hackathonApply}
      />
    </div>
  )
}
