import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/botcamp/components/ui/button"
import type { ReactNode } from "react"

interface ApplicationReviewShellProps {
  backHref: string
  backLabel?: string
  error?: string | null
  main: ReactNode
  sidebar: ReactNode
}

/** Back link + error banner + the two-column layout shared by every application review screen. */
export function ApplicationReviewShell({
  backHref,
  backLabel = "Back to Applications",
  error,
  main,
  sidebar,
}: ApplicationReviewShellProps) {
  return (
    <div className="space-y-bc-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={backHref}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {backLabel}
        </Link>
      </Button>

      {error && (
        <div className="p-4 rounded-bc-lg bg-destructive/10 text-destructive border border-destructive/20">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="min-w-0 lg:col-span-2 space-y-bc-6">{main}</div>
        {/* top-20 clears the site header (h-16, sticky top-0, z-50) so the
            sidebar's top edge never renders underneath it while stuck. */}
        <div className="min-w-0 space-y-bc-6 overflow-x-hidden lg:sticky lg:top-20 lg:self-start">
          {sidebar}
        </div>
      </div>
    </div>
  )
}
