"use client"

import Link from "next/link"
import { Button } from "@/botcamp/components/ui/button"
import { Plus } from "lucide-react"

interface CreateStrategyButtonProps {
  /** "AGENT" opens the New Agent flow, the one kind open to every signed-in user. */
  type?: "AGENT"
  label?: string
  variant?: "default" | "outline"
}

export function CreateStrategyButton({ type, label = "Create Strategy", variant = "default" }: CreateStrategyButtonProps) {
  return (
    <Button asChild variant={variant}>
      {/* Agents get their own flow: package first, page filled in from it. */}
      <Link href={type === "AGENT" ? "/dashboard/agents/new" : "/dashboard/strategies/new"}>
        <Plus className="mr-2 h-4 w-4" />
        {label}
      </Link>
    </Button>
  )
}
