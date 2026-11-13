interface RaceBackdropProps {
  children: React.ReactNode
  className?: string
}

/**
 * The hackathon pages' one continuous backdrop: soft gold glows, a faint
 * grid, and a gold racing line that draws itself down the left edge as you
 * scroll (`.sd-racing-line`). Sections placed inside share it, with no
 * borders or background changes between them.
 *
 * overflow-clip, not overflow-hidden: hidden would make this a scroll
 * container, and every view() timeline inside would track it instead of the
 * page — freezing the scroll-driven animations.
 */
export function RaceBackdrop({ children, className }: RaceBackdropProps) {
  return (
    <div className={`relative overflow-clip ${className ?? ""}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black_12%)] bg-[radial-gradient(ellipse_70%_35%_at_50%_8%,rgba(252,198,3,0.10),transparent_70%),radial-gradient(ellipse_50%_25%_at_85%_55%,rgba(245,158,11,0.06),transparent_70%),radial-gradient(ellipse_60%_30%_at_15%_100%,rgba(252,198,3,0.06),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:linear-gradient(to_bottom,transparent,black_8%,black_85%,transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-4 md:left-8 top-0 bottom-0 w-px bg-foreground/5 [mask-image:linear-gradient(to_bottom,transparent,black_6%,black_90%,transparent)] hidden sm:block"
      >
        <div className="sd-racing-line absolute inset-0 bg-[linear-gradient(to_bottom,transparent,hsl(var(--primary))_6%,var(--botcamp-amber)_60%,transparent)]" />
      </div>

      <div className="relative">{children}</div>
    </div>
  )
}
