import { PlayCircle } from "lucide-react"
import { formatPriceCents } from "@/botcamp/lib/format"
import { ReadOnlyHint } from "@/botcamp/components/ui/read-only"

interface EnrollPillButtonProps {
  /** Price in cents — 0 means free. */
  price: number
}

/**
 * Botcamp's hero-pill enroll CTA (free → POST /api/enrollments, paid →
 * Stripe checkout). Both are writes, so in the read-only preview it renders
 * disabled with the read-only hint, keeping Botcamp's label and look.
 */
export function FreeEnrollButton({ price }: EnrollPillButtonProps) {
  return (
    <ReadOnlyHint>
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <PlayCircle className="h-4 w-4" strokeWidth={2} />
        {price === 0 ? "Enroll for free" : `Enroll · ${formatPriceCents(price)}`}
      </button>
    </ReadOnlyHint>
  )
}
