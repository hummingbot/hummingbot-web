"use client"

import { useSearchParams } from "next/navigation"
import { UserStrategyEditor } from "@/botcamp/components/dashboard/UserStrategyEditor"
import { getDefaultStrategy, StrategyType } from "@/botcamp/components/dashboard/strategy-editor/types"

export default function NewStrategyPage() {
  const searchParams = useSearchParams()

  // Get strategy type from query params (default to OTHER)
  const typeParam = searchParams.get("type") || "OTHER"
  const validTypes: StrategyType[] = ["AGENT", "SCRIPT", "CONTROLLER", "V1_STRATEGY", "OTHER"]
  const strategyType: StrategyType = validTypes.includes(typeParam as StrategyType)
    ? (typeParam as StrategyType)
    : "OTHER"

  const defaultStrategy = getDefaultStrategy(strategyType)

  return (
    <div className="space-y-bc-6">
      <UserStrategyEditor strategy={defaultStrategy} />
    </div>
  )
}
