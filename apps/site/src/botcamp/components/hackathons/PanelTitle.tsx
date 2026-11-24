import type { ReactNode } from "react"
import { cn } from "@/botcamp/lib/utils"

interface PanelTitleProps {
  title: ReactNode
  subtitle?: ReactNode
  className?: string
}

/** A section's heading and the line under it, centered at the top of the section. */
export function PanelTitle({ title, subtitle, className }: PanelTitleProps) {
  return (
    <div className={cn("sd-reveal text-center mb-[clamp(1rem,3svh,2.5rem)]", className)}>
      <h2 className="text-3xl font-bold tracking-bc-tighter sm:text-4xl md:text-5xl mb-4 short:mb-2">{title}</h2>
      {subtitle && <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-balance">{subtitle}</p>}
    </div>
  )
}
