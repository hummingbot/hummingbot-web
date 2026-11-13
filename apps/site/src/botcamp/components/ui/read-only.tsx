import { cn } from "@/botcamp/lib/utils"
import { READ_ONLY_TITLE } from "@/botcamp/lib/preview-session-client"

export { READ_ONLY_TITLE }

/**
 * Read-only dashboard preview: wraps a control that would change something
 * (rendered disabled inside) so hovering it still explains why. Disabled
 * buttons ignore the pointer, so the tooltip lives on this wrapper.
 */
export function ReadOnlyHint({
  children,
  className,
  block = false,
}: {
  children: React.ReactNode
  className?: string
  /** Full-width wrapper, for controls that fill their row. */
  block?: boolean
}): React.JSX.Element {
  return (
    <span title={READ_ONLY_TITLE} className={cn(block ? "flex w-full" : "inline-flex", "cursor-not-allowed", className)}>
      {children}
    </span>
  )
}
