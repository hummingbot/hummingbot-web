"use client"

import { Flag } from "lucide-react"
import { getAvatarGradient } from "@/botcamp/lib/avatar"
import { cn } from "@/botcamp/lib/utils"

export interface AgentSeat {
  name: string
  avatarURL: string | null
  // The strategy racing in this seat. Null when it couldn't be resolved.
  strategy?: { slug: string; title: string } | null
}

export interface TeamSponsorCard {
  id: string
  slug: string
  name: string
  logoUrl: string | null
  logoUrlDark: string | null
  primaryColor: string | null
  agents: (AgentSeat | null)[]
}

/**
 * F1-style seat chips for one team — racing number + avatar + builder name
 * (and the strategy racing in the seat, when known), or a dashed "Open Seat",
 * on a team's color card. Used by the hub's Teams tab.
 */
export function TeamAgentSeats({
  agents,
  slotOffset,
}: {
  agents: (AgentSeat | null)[]
  slotOffset: number
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {agents.map((agent, i) => {
        const slotNumber = String(slotOffset + i + 1).padStart(2, "0")
        return (
          <div
            key={i}
            className={cn(
              "flex items-center gap-2 sm:gap-2.5 rounded-bc-lg px-2.5 sm:px-3 py-2 sm:py-2.5 min-w-0 backdrop-blur-xs",
              agent
                ? "border border-white/15 bg-black/35"
                : "border border-dashed border-white/25 bg-black/20",
            )}
          >
            <span
              className={cn(
                "font-mono text-lg sm:text-2xl font-black tabular-nums leading-none flex-shrink-0 sm:leading-(--text-2xl--line-height)",
                agent ? "text-white/95" : "text-white/35",
              )}
              style={{ textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
            >
              {slotNumber}
            </span>
            {agent ? (
              agent.avatarURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={agent.avatarURL}
                  alt={agent.name}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-white/30 flex-shrink-0"
                />
              ) : (
                <div
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/30 flex items-center justify-center text-xs font-bold text-black flex-shrink-0"
                  style={getAvatarGradient(agent.name)}
                >
                  {agent.name.charAt(0).toUpperCase()}
                </div>
              )
            ) : (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-dashed border-white/30 flex items-center justify-center flex-shrink-0">
                <Flag className="h-3.5 w-3.5 text-white/50" />
              </div>
            )}
            <div className="min-w-0">
              <span
                className={cn(
                  "block text-xs sm:text-sm truncate",
                  agent ? "font-medium text-white" : "text-white/60 italic",
                )}
              >
                {agent ? agent.name : "Open Seat"}
              </span>
              {agent?.strategy && (
                <span className="block text-[11px] sm:text-xs text-white/65 truncate">{agent.strategy.title}</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
