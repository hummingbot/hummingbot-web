"use client"

import Image from "next/image"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/botcamp/components/ui/select"
import { useTheme } from "@/botcamp/contexts/ThemeContext"
import { pickTeamLogo } from "@/botcamp/lib/team-logo"

export interface SponsorOption {
  id: string
  name: string
  logoUrl: string | null
  logoUrlDark?: string | null
}

const NONE = "none"

/**
 * Dropdown for picking the sponsor a builder wants to race for. The "none"
 * sentinel maps to a null selection (Radix items can't have empty values).
 */
export function SponsorSelect({
  teams,
  value,
  onChange,
  disabled,
  placeholder = "Choose a sponsor",
}: {
  teams: SponsorOption[]
  value: string | null
  onChange: (id: string | null) => void
  disabled?: boolean
  placeholder?: string
}) {
  const { theme } = useTheme()
  return (
    <Select
      value={value ?? NONE}
      onValueChange={(v) => onChange(v === NONE ? null : v)}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>No sponsor</SelectItem>
        {teams.map((t) => {
          const logo = pickTeamLogo(theme, t.logoUrl, t.logoUrlDark)
          return (
            <SelectItem key={t.id} value={t.id}>
              <span className="flex items-center gap-2">
                {logo && (
                  <Image
                    src={logo}
                    alt=""
                    width={16}
                    height={16}
                    className="h-4 w-4 rounded-bc-sm object-contain"
                  />
                )}
                {t.name}
              </span>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
