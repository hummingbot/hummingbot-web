"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/botcamp/components/ui/card"
import { Label } from "@/botcamp/components/ui/label"
import { Textarea } from "@/botcamp/components/ui/textarea"
import { BookOpen, Lock } from "lucide-react"
import {
  combineSectionsToDetails,
  parseDetailsToSections,
  type StrategyDetailsSections,
} from "@/botcamp/lib/strategy-details"

interface StrategyDetailsEditorProps {
  details: string
  onDetailsChange: (details: string) => void
  disabled?: boolean
  /** Shown in place of the instructions while disabled. */
  lockedMessage?: string
  /** False on an agent page, where the package carries the agent. */
  required?: boolean
}

const sectionConfig = [
  {
    key: "description" as const,
    label: "Description",
    placeholder: "What does the strategy do? Explain its core logic and purpose.",
    rows: 4,
  },
  {
    key: "markets" as const,
    label: "Markets",
    placeholder: "What exchanges or trading pairs can this strategy be used on? What are the necessary market conditions for it to be viable?",
    rows: 3,
  },
  {
    key: "parameters" as const,
    label: "Parameters",
    placeholder: "What are the variables that the user will need to define? List each parameter and its purpose.",
    rows: 3,
  },
  {
    key: "status" as const,
    label: "Status",
    placeholder: "What information does the strategy show to report its status? What metrics or indicators does it display?",
    rows: 3,
  },
  {
    key: "events" as const,
    label: "Events",
    placeholder: "What events are important for the strategy? How does it respond to them?",
    rows: 3,
  },
]

export function StrategyDetailsEditor({
  details,
  onDetailsChange,
  disabled = false,
  lockedMessage = "Content is locked after certification",
  required = true,
}: StrategyDetailsEditorProps) {
  const [sections, setSections] = useState<StrategyDetailsSections>(() =>
    parseDetailsToSections(details)
  )

  // Update parent when sections change
  const updateDetails = useCallback(
    (newSections: StrategyDetailsSections) => {
      const combined = combineSectionsToDetails(newSections)
      onDetailsChange(combined)
    },
    [onDetailsChange]
  )

  // Re-parse when details prop changes from external source
  useEffect(() => {
    const parsed = parseDetailsToSections(details)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- as in Botcamp (its ESLint predates this rule)
    setSections(parsed)
  }, [details])

  const handleSectionChange = (key: keyof StrategyDetailsSections, value: string) => {
    const newSections = { ...sections, [key]: value }
    setSections(newSections)
    updateDetails(newSections)
  }

  const hasAnyContent = Object.values(sections).some((v) => v.trim())

  // Only Description shows at first: the other sections open once it has
  // something in it (or one of them already does), and stay open after.
  const [opened, setOpened] = useState(false)
  const expanded = opened || hasAnyContent
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- as in Botcamp (its ESLint predates this rule)
    if (hasAnyContent) setOpened(true)
  }, [hasAnyContent])
  const [first, ...rest] = sectionConfig
  const visibleSections = expanded ? sectionConfig : [first]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Detailed Description
          {required && <span className="text-destructive">*</span>}
          {disabled && <Lock className="h-4 w-4 text-muted-foreground" />}
        </CardTitle>
        <CardDescription>
          {disabled
            ? lockedMessage
            : "Fill in the sections below to document your strategy. All fields support Markdown formatting."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-bc-6">
        {visibleSections.map((config) => (
          <div
            key={config.key}
            className={config.key === first.key ? "space-y-bc-2" : "space-y-bc-2 animate-in fade-in slide-in-from-top-1 duration-300"}
          >
            <Label
              htmlFor={`details-${config.key}`}
              className="text-sm font-medium"
            >
              {config.label}
            </Label>
            <Textarea
              id={`details-${config.key}`}
              value={sections[config.key]}
              onChange={(e) => handleSectionChange(config.key, e.target.value)}
              placeholder={config.placeholder}
              rows={config.rows}
              disabled={disabled}
              className={disabled ? "opacity-60" : ""}
            />
          </div>
        ))}

        {!expanded && !disabled && (
          <p className="text-xs text-muted-foreground">
            {rest.map((section) => section.label).join(", ").replace(/, ([^,]*)$/, " and $1")} open once you&apos;ve
            written the description.
            {required && " The description is needed to complete this requirement."}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

