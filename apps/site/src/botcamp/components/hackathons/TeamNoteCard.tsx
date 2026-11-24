import { Card, CardContent, CardHeader, CardTitle } from "@/botcamp/components/ui/card"
import { Textarea } from "@/botcamp/components/ui/textarea"
import type { ReactNode } from "react"

interface TeamNoteCardProps {
  title?: string
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  footer?: ReactNode
  readOnly?: boolean
}

/** Editable (or read-only) note textarea shared by the admin and team application review screens. */
export function TeamNoteCard({
  title = "Team Note",
  value,
  onChange,
  placeholder = "Internal note about this application...",
  footer,
  readOnly = false,
}: TeamNoteCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-bc-4">
        {readOnly ? (
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">
            {value || "No note yet."}
          </p>
        ) : (
          <Textarea
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            rows={3}
          />
        )}
        {footer}
      </CardContent>
    </Card>
  )
}
