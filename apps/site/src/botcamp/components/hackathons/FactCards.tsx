import type { ReactNode } from "react"

export interface Fact {
  label: string
  value: ReactNode
  note: string
}

/**
 * Headline figures as gold mono numerals on cards, in the edition year's
 * gradient: a soft glow from above, and a brighter border and halo on hover.
 */
export function FactCards({ facts }: { facts: Fact[] }) {
  return (
    <ul className="sd-reveal mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:gap-4 md:gap-6">
      {facts.map((fact) => (
        <li
          key={fact.label}
          className="group relative overflow-hidden rounded-bc-xl border border-primary/30 bg-card/80 px-3 py-[clamp(0.75rem,2.5svh,2.25rem)] text-center sm:px-6 backdrop-blur-xs transition-[border-color,box-shadow] duration-300 hover:border-primary/70 hover:shadow-[0_0_48px_hsl(var(--primary)/0.25)]"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.14),transparent_70%)] opacity-70 transition-opacity duration-300 group-hover:opacity-100"
            aria-hidden
          />
          <p className="relative font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {fact.label}
          </p>
          <p className="edition-year-dates relative mt-[clamp(0.5rem,1.5svh,1.25rem)] font-mono text-4xl font-bold leading-none tracking-bc-tight tabular-nums sm:text-5xl lg:text-[clamp(2.25rem,6svh,3.75rem)] sm:leading-(--text-5xl--line-height)">{fact.value}</p>
          <p className="relative mt-[clamp(0.375rem,1.5svh,1rem)] text-xs text-muted-foreground sm:text-sm">{fact.note}</p>
        </li>
      ))}
    </ul>
  )
}
