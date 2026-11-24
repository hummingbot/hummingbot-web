import { Badge } from "@/botcamp/components/ui/badge"
import { cn } from "@/botcamp/lib/utils"

type LessonType = "VIDEO" | "ARTICLE" | "QUIZ" | "CHALLENGE"

interface LessonTypeBadgeProps {
  type: string
  className?: string
}

// Background colors using semantic colors from globals.css
// All use dark text for readability
const lessonTypeStyles: Record<LessonType, string> = {
  VIDEO: "bg-primary/20 hover:bg-primary/30",       // Green - main content type
  ARTICLE: "bg-blue-500/20 hover:bg-blue-500/30",   // Blue - reading content
  QUIZ: "bg-warning/20 hover:bg-warning/30",        // Yellow/amber - assessment
  CHALLENGE: "bg-accent/20 hover:bg-accent/30",     // Purple/magenta - hands-on work
}

export function LessonTypeBadge({ type, className }: LessonTypeBadgeProps) {
  const lessonType = type as LessonType
  const bgStyle = lessonTypeStyles[lessonType] || "bg-muted"

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent text-foreground font-medium",
        bgStyle,
        className
      )}
    >
      {type}
    </Badge>
  )
}
