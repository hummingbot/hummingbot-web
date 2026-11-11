import Link from "next/link"
import { UserCircle, CheckCircle2, Circle } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/botcamp/components/ui/card"
import { Button } from "@/botcamp/components/ui/button"
import { cn } from "@/botcamp/lib/utils"

interface ProfileField {
  label: string
  done: boolean
}

interface CompleteProfilePromptProps {
  fields: ProfileField[]
}

/**
 * Nudges users to fill in the profile fields we want for every builder —
 * tagline, location, and about. Renders nothing once they're all complete.
 * Mirrors EnrollFreeCourseCard's layout so the dashboard CTAs read as a set.
 */
export function CompleteProfilePrompt({ fields }: CompleteProfilePromptProps) {
  const remaining = fields.filter((f) => !f.done)
  if (remaining.length === 0) return null

  return (
    <Card className="bg-gradient-to-br from-violet-500/15 to-transparent border-violet-500/30">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-bc-md bg-violet-500/15 text-violet-400">
            <UserCircle className="h-5 w-5" />
          </span>
          <div>
            <CardTitle>Complete your profile</CardTitle>
            <CardDescription>
              Add a tagline, location, and short bio so other builders can find
              and connect with you.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-bc-3">
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
          {fields.map((field) => (
            <li
              key={field.label}
              className={cn(
                "flex items-center gap-1.5 text-sm",
                field.done ? "text-muted-foreground" : "text-foreground"
              )}
            >
              {field.done ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              {field.label}
            </li>
          ))}
        </ul>
        <Button asChild>
          <Link href="/dashboard/profile">Complete profile</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
